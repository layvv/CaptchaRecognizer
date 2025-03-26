import os
import random
from typing import Dict, List, Optional, Tuple, Union

import matplotlib.pyplot as plt
import numpy as np
import torch
import torch.nn.functional as F
from PIL import Image
from sklearn.metrics import confusion_matrix, precision_recall_fscore_support
from torch.utils.tensorboard import SummaryWriter
from torchvision.utils import make_grid

from model.char.config import config


class TensorboardLogger:
    """Tensorboard日志记录器"""

    def __init__(self, log_dir: str):
        """初始化日志记录器

        Args:
            log_dir: 日志目录
        """
        self.writer = SummaryWriter(log_dir)
        self.log_dir = log_dir
        os.makedirs(log_dir, exist_ok=True)

    def log_scalar(self, tag: str, value: float, step: int):
        """记录标量值

        Args:
            tag: 标签名
            value: 值
            step: 步数
        """
        self.writer.add_scalar(tag, value, step)

    def log_scalars(self, tag: str, values: Dict[str, float], step: int):
        """记录多个标量值

        Args:
            tag: 标签名
            values: 值字典
            step: 步数
        """
        self.writer.add_scalars(tag, values, step)

    def log_learning_rate(self, lr: float, step: int):
        """记录学习率

        Args:
            lr: 学习率
            step: 步数
        """
        self.log_scalar('Learning_Rate', lr, step)

    def log_loss(self, loss: float, step: int, phase: str = 'train'):
        """记录损失值

        Args:
            loss: 损失值
            step: 步数
            phase: 阶段(train/valid)
        """
        self.log_scalar(f'{phase}/Loss', loss, step)

    def log_accuracy(self, acc: float, step: int, phase: str = 'train'):
        """记录准确率

        Args:
            acc: 准确率
            step: 步数
            phase: 阶段(train/valid)
        """
        self.log_scalar(f'{phase}/Accuracy', acc, step)

    def log_metrics(self, metrics: Dict[str, float], step: int, phase: str = 'valid'):
        """记录多个指标

        Args:
            metrics: 指标字典
            step: 步数
            phase: 阶段(train/valid)
        """
        for name, value in metrics.items():
            self.log_scalar(f'{phase}/{name}', value, step)

    def log_images(self, images: torch.Tensor, step: int, phase: str = 'valid', nrow: int = 8):
        """记录图像

        Args:
            images: 图像张量 [B, C, H, W]
            step: 步数
            phase: 阶段(train/valid)
            nrow: 每行显示的图像数
        """
        # 确保图像在[0,1]范围内
        if images.min() < 0:
            images = (images + 1) / 2
        self.writer.add_images(f'{phase}/Images', images, step, dataformats='NCHW')

    def log_confusion_matrix(self, y_true: List[int], y_pred: List[int], step: int, phase: str = 'valid'):
        """记录混淆矩阵

        Args:
            y_true: 真实标签
            y_pred: 预测标签
            step: 步数
            phase: 阶段(train/valid)
        """
        cm = confusion_matrix(y_true, y_pred)
        fig = plt.figure(figsize=(10, 8))
        plt.imshow(cm, interpolation='nearest', cmap=plt.cm.Blues)
        plt.title('Confusion Matrix')
        plt.colorbar()
        plt.ylabel('True Label')
        plt.xlabel('Predicted Label')
        plt.tight_layout()
        
        # 保存图像
        img_path = os.path.join(self.log_dir, f'{phase}_confusion_matrix_{step}.png')
        plt.savefig(img_path)
        plt.close()
        
        # 记录到tensorboard
        img = Image.open(img_path)
        img_tensor = torch.from_numpy(np.array(img)).permute(2, 0, 1).float() / 255.0
        self.writer.add_image(f'{phase}/Confusion_Matrix', img_tensor, step)

    def log_sample_predictions(self, 
                             images: torch.Tensor, 
                             labels: torch.Tensor,
                             predictions: List[torch.Tensor],
                             step: int,
                             phase: str = 'valid',
                             num_samples: int = 5):
        """记录样本预测结果

        Args:
            images: 图像张量 [B, C, H, W]
            labels: 标签张量 [B, L]
            predictions: 预测结果列表 [L个[B, C]]
            step: 步数
            phase: 阶段(train/valid)
            num_samples: 要记录的样本数
        """
        # 随机选择样本
        indices = random.sample(range(len(images)), min(num_samples, len(images)))
        
        # 创建图像网格
        sample_images = images[indices]
        grid = make_grid(sample_images, nrow=num_samples, normalize=True)
        self.writer.add_image(f'{phase}/Sample_Predictions', grid, step)
        
        # 保存预测结果
        results = []
        for idx in indices:
            pred_text = ''
            true_text = ''
            for i, pred in enumerate(predictions):
                pred_idx = pred[idx].argmax().item()
                true_idx = labels[idx, i].item()
                pred_text += config.CHAR_SET[pred_idx]
                true_text += config.CHAR_SET[true_idx]
            results.append(f'True: {true_text}, Pred: {pred_text}')
        
        # 将结果写入文本文件
        with open(os.path.join(self.log_dir, f'{phase}_predictions_{step}.txt'), 'w') as f:
            f.write('\n'.join(results))

    def close(self):
        """关闭writer"""
        self.writer.close() 