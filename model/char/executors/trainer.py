import os
from datetime import datetime
from typing import Union, List, Dict, Optional, Tuple

import torch
from torch import nn
from torch.utils.data import DataLoader
from tqdm import tqdm

from model.char.config import config
from model.char.data.dataset import CaptchaDataset
from model.char.models import BaseModel
from model.char.utils.model_util import save_final_model, save_checkpoint
from model.char.utils.metrics import (
    calculate_accuracy, calculate_position_accuracy,
    calculate_precision_recall_f1, calculate_gmean, 
    calculate_auc, calculate_confusion_matrices
)
from model.char.utils.visualization import TensorboardLogger


class Trainer:
    best_valid_loss = float('inf')
    best_valid_acc = 0.0
    train_losses = []
    valid_losses = []
    train_accs = []
    valid_accs = []
    learning_rates = []
    no_improve = 0
    early_stop = False
    experiment_dir = None
    train_dataset = None
    valid_dataset = None
    train_loader = None
    valid_loader = None
    current_epoch = 0
    training_time = 0
    start_time = 0
    logger = None

    def __init__(self, model: BaseModel):
        self.device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        model.to(self.device)

        self.optimizer = torch.optim.AdamW(
            model.parameters(),
            lr=config.LR,
            weight_decay=config.WEIGHT_DECAY
        )

        self.scheduler = torch.optim.lr_scheduler.ReduceLROnPlateau(
            self.optimizer,
            mode='max',
            factor=config.LR_DECAY_FACTOR,
            patience=config.LR_DECAY_PATIENCE,
            min_lr=config.MIN_LR
        )

        self.criterion = nn.CrossEntropyLoss(label_smoothing=config.LABEL_SMOOTHING)

        self.model = model

        self.experiment_dir = os.path.join(
            config.EXPERIMENT_ROOT,
            config.EXPERIMENT_FORMAT.format(
                model_name=model.model_name,
                timestamp=datetime.now().strftime("%Y-%m-%d_%H-%M-%S")
            )
        )
        os.makedirs(self.experiment_dir, exist_ok=True)
        
        # 初始化TensorBoard日志记录器
        tensorboard_dir = os.path.join(self.experiment_dir, 'tensorboard')
        self.logger = TensorboardLogger(tensorboard_dir)

    def load_data(self, num_samples: int = None):
        print(f"开始加载数据集..."
              f"(数据集路径: {config.DATA_ROOT})"
              )
        # 加载数据集
        self.train_dataset = CaptchaDataset('train', num_samples)
        self.valid_dataset = CaptchaDataset('valid', num_samples)
        print(f"数据集加载完成，训练集样本数: {len(self.train_dataset)}, 验证集样本数: {len(self.valid_dataset)}")

        # 数据加载器
        self.train_loader = DataLoader(
            self.train_dataset,
            batch_size=config.BATCH_SIZE,
            shuffle=True,
            num_workers=config.NUM_WORKERS,
            pin_memory=config.PIN_MEMORY,
        )

        self.valid_loader = DataLoader(
            self.valid_dataset,
            batch_size=config.BATCH_SIZE,
            shuffle=False,
            num_workers=config.NUM_WORKERS,
            pin_memory=config.PIN_MEMORY,
        )

    def log_start_info(self):
        """打印训练信息"""
        info = {
            "模型": self.model.model_name,
            "GPU": torch.cuda.get_device_name(0) if torch.cuda.is_available() else "CPU",
            "训练样本": len(self.train_dataset),
            "验证样本": len(self.valid_dataset),
            "批次大小": config.BATCH_SIZE,
            "学习率": config.LR,
            "权重衰减": config.WEIGHT_DECAY,
            "最大轮次": config.EPOCHS,
            "字符长度": config.CAPTCHA_LENGTH,
            "字符类别": config.NUM_CLASSES,
            "图像大小": config.IMAGE_SIZE
        }

        print("\n" + "=" * 50)
        print(f"{'训练配置':^50}")
        print("=" * 50)
        for key, value in info.items():
            print(f"{key:>15}: {value}")
        print("=" * 50 + "\n")

    def train(self, num_samples: int = None):
        self.start_time = datetime.now()
        self.load_data(num_samples)

        self.log_start_info()

        # 记录模型图结构
        dummy_input = torch.zeros((1, 1, config.IMAGE_SIZE[1], config.IMAGE_SIZE[0])).to(self.device)
        self.logger.log_model_graph(self.model, dummy_input)

        for epoch in range(1, config.EPOCHS + 1):
            self.current_epoch = epoch
            train_loss, train_metrics = self.train_epoch()
            valid_loss, valid_metrics = self.validate()

            # 更新学习率
            if isinstance(self.scheduler, torch.optim.lr_scheduler.ReduceLROnPlateau):
                self.scheduler.step(valid_metrics['accuracy'])
            else:
                self.scheduler.step()
                
            # 记录学习率
            current_lr = self.optimizer.param_groups[0]['lr']
            self.learning_rates.append(current_lr)
            self.logger.log_scalar('train/learning_rate', current_lr, epoch)
            
            # 记录损失和准确率
            self.train_losses.append(train_loss)
            self.train_accs.append(train_metrics['accuracy'])
            self.valid_losses.append(valid_loss)
            self.valid_accs.append(valid_metrics['accuracy'])
            
            # 记录训练和验证指标到TensorBoard
            train_metrics.update({'loss': train_loss})
            valid_metrics.update({'loss': valid_loss})
            
            # 记录训练指标
            self.logger.log_metrics('train', train_metrics, epoch)
            
            # 记录验证指标
            self.logger.log_metrics('valid', valid_metrics, epoch)
            
            # 记录训练和验证对比指标
            self.logger.log_training_validation_metrics(
                {'loss': train_loss, 'accuracy': train_metrics['accuracy']},
                {'loss': valid_loss, 'accuracy': valid_metrics['accuracy']},
                epoch
            )

            # 保存最佳模型
            if valid_metrics['accuracy'] > self.best_valid_acc:
                self.best_valid_acc = valid_metrics['accuracy']
                self.best_valid_loss = valid_loss
                self.no_improve = 0
                
                # 每当有新的最佳模型时，保存检查点
                save_checkpoint(self)
            else:
                self.no_improve += 1

            # 打印进度
            print(f"Epoch {epoch}/{config.EPOCHS} | "
                  f"[Train Loss/Acc: {train_loss:.4f}/{train_metrics['accuracy'] * 100:.2f}%] | "
                  f"[Valid Loss/Acc: {valid_loss:.4f}/{valid_metrics['accuracy'] * 100:.2f}%] | "
                  f"LR: {current_lr:.2e} | "
                  f"No Improve: {self.no_improve} | "
                  f"Best Acc: {self.best_valid_acc * 100:.2f}%"
                  )

            # 早停
            if config.EARLY_STOPPING and self.no_improve >= config.PATIENCE:
                print(f"Early stopping triggered after {epoch} epochs")
                self.early_stop = True
                break

        delta = datetime.now() - self.start_time
        minutes, seconds = divmod(delta.seconds + delta.days * 86400, 60)
        self.training_time = f"{minutes} min {seconds} s"
        print(f"✅ 训练完成！"
              f"⏱️ 训练时间: {self.training_time}")
        
        # 保存最终模型
        save_final_model(self)
        
        # 关闭TensorBoard日志记录器
        self.logger.close()
        return

    def train_epoch(self):
        self.model.train()
        total_loss = 0
        all_outputs = []
        all_labels = []
        
        progress_bar = tqdm(
            self.train_loader,
            desc=f'Train Epoch {self.current_epoch}/{config.EPOCHS}',
            leave=False
        )
        
        for batch_idx, (images, labels) in enumerate(progress_bar):
            images = images.to(self.device)
            labels = labels.to(self.device)

            # 前向传播
            outputs = self.model(images)

            # 计算多任务损失
            loss = sum(self.criterion(output, labels[:, i]) for i, output in enumerate(outputs))

            # 反向传播
            self.optimizer.zero_grad()
            loss.backward()
            torch.nn.utils.clip_grad_norm_(self.model.parameters(), max_norm=2.0)
            self.optimizer.step()

            # 计算指标
            total_loss += loss.item()
            
            # 收集输出和标签用于计算批次级指标
            for i, output in enumerate(outputs):
                if len(all_outputs) <= i:
                    all_outputs.append([])
                all_outputs[i].append(output.detach().cpu())
            all_labels.append(labels.detach().cpu())
            
            # 计算当前批次的准确率并更新进度条
            batch_acc = calculate_accuracy(outputs, labels)
            
            # 实时更新进度信息
            progress_bar.set_postfix({
                'loss': f'{loss.item():.4f}',
                'acc': f'{batch_acc * 100:.2f}%',
                'lr': f'{self.optimizer.param_groups[0]["lr"]:.2e}'
            })
        
        # 计算全局指标
        all_outputs = [torch.cat(outputs, dim=0) for outputs in all_outputs]
        all_labels = torch.cat(all_labels, dim=0)
        
        # 计算基础指标
        accuracy = calculate_accuracy(all_outputs, all_labels)
        position_accuracy = calculate_position_accuracy(all_outputs, all_labels)
        
        # 训练阶段只记录基础指标
        metrics = {
            'accuracy': accuracy,
            'position_acc': position_accuracy
        }
        
        avg_loss = total_loss / len(self.train_loader)
        return avg_loss, metrics

    def validate(self):
        self.model.eval()  # 设置为评估模式
        total_loss = 0
        all_outputs = []
        all_labels = []
        all_images = []  # 储存一部分验证图像用于可视化
        
        progress_bar = tqdm(
            self.valid_loader,
            desc=f"Valid Epoch {self.current_epoch}/{config.EPOCHS}",
            leave=False
        )
        
        with torch.no_grad():
            for batch_idx, (images, labels) in enumerate(progress_bar):
                images = images.to(self.device)
                labels = labels.to(self.device)

                # 保存部分图像用于可视化
                if len(all_images) < 100:  # 只保存100张图像
                    all_images.append(images)

                # 前向传播
                outputs = self.model(images)

                # 计算损失
                loss = sum(self.criterion(output, labels[:, i]) for i, output in enumerate(outputs))

                # 更新总和
                total_loss += loss.item()
                
                # 收集输出和标签用于计算批次级指标
                for i, output in enumerate(outputs):
                    if len(all_outputs) <= i:
                        all_outputs.append([])
                    all_outputs[i].append(output.cpu())
                all_labels.append(labels.cpu())
                
                # 计算当前批次的准确率
                batch_acc = calculate_accuracy(outputs, labels)
                
                # 更新进度条
                progress_bar.set_postfix({
                    'loss': f'{loss.item():.4f}',
                    'acc': f'{batch_acc * 100:.2f}%'
                })
        
        # 计算全局指标
        all_outputs = [torch.cat(outputs, dim=0) for outputs in all_outputs]
        all_labels = torch.cat(all_labels, dim=0)
        
        # 如果有保存图像，拼接它们
        if all_images:
            all_images = torch.cat(all_images, dim=0)[:100]  # 只使用前100张
        
        # 计算验证指标
        metrics = {}
        
        # 基础指标
        accuracy = calculate_accuracy(all_outputs, all_labels)
        position_accuracy = calculate_position_accuracy(all_outputs, all_labels)
        metrics['accuracy'] = accuracy
        metrics['position_acc'] = position_accuracy
        
        # 高级指标
        precisions, recalls, f1s = calculate_precision_recall_f1(
            all_outputs, all_labels, config.NUM_CLASSES, average='macro'
        )
        gmeans = calculate_gmean(all_outputs, all_labels)
        aucs = calculate_auc(all_outputs, all_labels, config.NUM_CLASSES)
        
        metrics['precision'] = precisions
        metrics['recall'] = recalls
        metrics['f1'] = f1s
        metrics['gmean'] = gmeans
        metrics['auc'] = aucs
        
        # 验证阶段记录更全面的指标到TensorBoard
        if self.current_epoch % 5 == 0:
            # 每5个epoch记录混淆矩阵和预测样本
            self.logger.log_confusion_matrices(
                all_outputs, all_labels, config.NUM_CLASSES, config.CHAR_SET, self.current_epoch
            )
            
            # 如果有图像样本，记录预测结果
            if len(all_images) > 0:
                self.logger.log_sample_predictions(
                    all_images, all_outputs, all_labels, config.CHAR_SET, self.current_epoch
                )
        
        avg_loss = total_loss / len(self.valid_loader)
        return avg_loss, metrics
