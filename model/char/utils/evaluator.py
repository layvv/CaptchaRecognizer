import os
import json
from typing import Dict, List, Tuple

import numpy as np
import torch
from sklearn.metrics import confusion_matrix, precision_recall_fscore_support
from torch.utils.data import DataLoader

from model.char.config import config
from model.char.data.dataset import CaptchaDataset
from model.char.models import BaseModel
from model.char.utils.tensorboard_util import TensorboardLogger


class ModelEvaluator:
    """模型评估器"""

    def __init__(self, model: BaseModel, device: torch.device):
        """初始化评估器

        Args:
            model: 模型
            device: 设备
        """
        self.model = model
        self.device = device
        self.model.to(device)
        self.model.eval()

    def evaluate(self, 
                test_loader: DataLoader,
                logger: TensorboardLogger = None,
                step: int = 0) -> Dict[str, float]:
        """评估模型

        Args:
            test_loader: 测试数据加载器
            logger: tensorboard日志记录器
            step: 当前步数

        Returns:
            评估指标字典
        """
        total_loss = 0
        total_acc = 0
        all_preds = []
        all_labels = []
        all_images = []
        all_predictions = []

        criterion = torch.nn.CrossEntropyLoss(label_smoothing=config.LABEL_SMOOTHING)

        with torch.no_grad():
            for images, labels in test_loader:
                images = images.to(self.device)
                labels = labels.to(self.device)

                # 前向传播
                outputs = self.model(images)
                
                # 计算损失
                loss = sum(criterion(output, labels[:, i]) for i, output in enumerate(outputs))
                total_loss += loss.item()

                # 计算准确率
                predictions = torch.stack([output.argmax(1) for output in outputs], dim=1)
                correct = (predictions == labels).all(dim=1).sum().item()
                total_acc += correct

                # 收集预测结果
                all_preds.extend(predictions.cpu().numpy().flatten())
                all_labels.extend(labels.cpu().numpy().flatten())
                all_images.append(images.cpu())
                all_predictions.append([output.cpu() for output in outputs])

        # 计算平均损失和准确率
        avg_loss = total_loss / len(test_loader)
        avg_acc = total_acc / len(test_loader.dataset)

        # 计算其他指标
        precision, recall, f1, _ = precision_recall_fscore_support(
            all_labels, all_preds, average='weighted'
        )

        # 计算每个字符位置的准确率
        char_accs = []
        for i in range(config.CAPTCHA_LENGTH):
            char_preds = [pred[i] for pred in all_preds]
            char_labels = [label[i] for label in all_labels]
            char_acc = sum(p == l for p, l in zip(char_preds, char_labels)) / len(char_preds)
            char_accs.append(char_acc)

        # 整理评估指标
        metrics = {
            'loss': avg_loss,
            'accuracy': avg_acc,
            'precision': precision,
            'recall': recall,
            'f1': f1,
            **{f'char_{i}_accuracy': acc for i, acc in enumerate(char_accs)}
        }

        # 记录到tensorboard
        if logger is not None:
            # 记录标量指标
            logger.log_metrics(metrics, step, phase='test')
            
            # 记录混淆矩阵
            logger.log_confusion_matrix(all_labels, all_preds, step, phase='test')
            
            # 记录样本预测结果
            all_images = torch.cat(all_images, dim=0)
            all_predictions = [torch.cat([pred[i] for pred in all_predictions], dim=0) 
                             for i in range(config.CAPTCHA_LENGTH)]
            logger.log_sample_predictions(
                all_images, 
                torch.tensor(all_labels).view(-1, config.CAPTCHA_LENGTH),
                all_predictions,
                step,
                phase='test'
            )

        return metrics

    def save_evaluation_results(self, 
                              metrics: Dict[str, float],
                              experiment_dir: str,
                              model_name: str):
        """保存评估结果

        Args:
            metrics: 评估指标
            experiment_dir: 实验目录
            model_name: 模型名称
        """
        eval_dir = os.path.join(experiment_dir, 'eval')
        os.makedirs(eval_dir, exist_ok=True)

        # 保存评估指标
        results = {
            'model_name': model_name,
            'timestamp': torch.datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
            'metrics': metrics,
            'config': {k: v for k, v in vars(config).items() if not k.startswith('_')}
        }

        with open(os.path.join(eval_dir, 'evaluation_results.json'), 'w') as f:
            json.dump(results, f, indent=2, ensure_ascii=False) 