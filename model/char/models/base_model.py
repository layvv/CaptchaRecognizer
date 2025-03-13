import os
import time
from abc import ABC, abstractmethod
from typing import List, Tuple, Optional

import torch
import torch.nn as nn
from torch.utils.data import DataLoader
from tqdm import tqdm

from model.char.config import config
from model.char.data.dataset import CaptchaDataset
from model.char.utils.model_util import save_checkpoint, save_final_model


class BaseModel(nn.Module, ABC):
    """所有验证码识别模型的基类"""
    
    # 模型类型标识
    model_type = "base"
    
    def __init__(self):
        """初始化模型"""
        super(BaseModel, self).__init__()
        self.device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        
        # 训练状态
        self.train_loader = None
        self.valid_loader = None
        self.experiment_dir = None
        self.current_epoch = 0
        self.best_val_acc = 0.0
        self.best_val_loss = float('inf')
        self.no_improve_count = 0
        self.early_stop = False
        
        # 指标记录
        self.train_losses = []
        self.train_accs = []
        self.val_losses = []
        self.val_accs = []
        self.learning_rates = []
        
        # 动态创建
        self.visualizer = None
        self.optimizer = None
        self.scheduler = None
        self.criterion = None


    def _init_weights(self):
        """初始化权重"""
        for m in self.modules():
            if isinstance(m, nn.Conv2d):
                nn.init.kaiming_normal_(m.weight, mode='fan_out', nonlinearity='relu')
                if m.bias is not None:
                    nn.init.constant_(m.bias, 0)
            elif isinstance(m, nn.BatchNorm2d) or isinstance(m, nn.BatchNorm1d):
                nn.init.constant_(m.weight, 1)
                if m.bias is not None:
                    nn.init.constant_(m.bias, 0)
            elif isinstance(m, nn.Linear):
                nn.init.kaiming_normal_(m.weight, mode='fan_out', nonlinearity='relu')
                if m.bias is not None:
                    nn.init.constant_(m.bias, 0)
    
    @abstractmethod
    def forward(self, x: torch.Tensor) -> List[torch.Tensor]:
        """前向传播
        
        Args:
            x: 输入张量，形状 [B, C, H, W]
            
        Returns:
            输出张量列表，每个元素对应一个位置的分类结果
        """
        pass
    
    def _init_training_state(self) -> None:
        self.to(self.device)
        """配置优化器和调度器"""
        # 优化器
        if config.OPTIMIZER == 'adam':
            self.optimizer = torch.optim.Adam(
                self.parameters(),
                lr=config.LEARNING_RATE,
                weight_decay=config.WEIGHT_DECAY
            )
        elif config.OPTIMIZER == 'adamw':
            self.optimizer = torch.optim.AdamW(
                self.parameters(),
                lr=config.LEARNING_RATE,
                weight_decay=config.WEIGHT_DECAY
            )
        elif config.OPTIMIZER == 'sgd':
            self.optimizer = torch.optim.SGD(
                self.parameters(),
                lr=config.LEARNING_RATE,
                momentum=0.9,
                weight_decay=config.WEIGHT_DECAY
            )
        else:
            raise ValueError(f"不支持的优化器: {config.OPTIMIZER}")
        
        # 学习率调度器
        if config.LR_SCHEDULER == 'reducelr':
            self.scheduler = torch.optim.lr_scheduler.ReduceLROnPlateau(
                self.optimizer,
                mode='max',
                factor=config.LR_FACTOR,
                patience=config.LR_PATIENCE,
                min_lr=config.MIN_LR,
            )
        elif config.LR_SCHEDULER == 'cosine':
            self.scheduler = torch.optim.lr_scheduler.CosineAnnealingLR(
                self.optimizer,
                T_max=config.EPOCHS,
                eta_min=config.MIN_LR
            )
        elif config.LR_SCHEDULER == 'step':
            self.scheduler = torch.optim.lr_scheduler.StepLR(
                self.optimizer,
                step_size=20,
                gamma=0.5
            )
        else:
            raise ValueError(f"不支持的学习率调度器: {config.LR_SCHEDULER}")
        
        # 损失函数
        self.criterion = nn.CrossEntropyLoss(label_smoothing=0.1)

        # 创建实验目录
        experiment_name = config.EXPERIMENT_FORMAT.format(
            timestamp=time.strftime("%Y%m%d_%H%M%S"),
            model_type=self.model_type,
        )
        self.experiment_dir = os.path.join(config.EXPERIMENT_ROOT, experiment_name)
        os.makedirs(self.experiment_dir, exist_ok=True)

    
    def train_model(self, num_samples: Optional[int] = None) -> None:
        """训练模型
        
        Args:
            num_samples: 限制样本数量
        """
        # 初始化
        self._init_training_state()
        
        # 加载数据集
        train_dataset = CaptchaDataset(mode='train', num_samples=num_samples)
        valid_dataset = CaptchaDataset(mode='valid', num_samples=num_samples)
        
        self.train_loader = DataLoader(
            train_dataset,
            batch_size=config.BATCH_SIZE,
            shuffle=True,
            num_workers=config.NUM_WORKERS,
            pin_memory=config.PIN_MEMORY
        )

        self.valid_loader = DataLoader(
            valid_dataset,
            batch_size=config.BATCH_SIZE,
            shuffle=False,
            num_workers=config.NUM_WORKERS,
            pin_memory=config.PIN_MEMORY
        )
        
        # 打印训练信息
        self._print_training_info(train_dataset, valid_dataset)

        
        # 训练循环
        for epoch in range(1, config.EPOCHS + 1):
            self.current_epoch = epoch
            
            # 训练一个epoch
            train_loss, train_acc = self._train_epoch()
            
            # 验证
            val_loss, val_acc = self._validate()
            
            # 更新学习率
            if isinstance(self.scheduler, torch.optim.lr_scheduler.ReduceLROnPlateau):
                self.scheduler.step(val_acc)
            else:
                self.scheduler.step()
            
            # 记录指标
            current_lr = self.optimizer.param_groups[0]['lr']
            self.train_losses.append(train_loss)
            self.train_accs.append(train_acc)
            self.val_losses.append(val_loss)
            self.val_accs.append(val_acc)
            self.learning_rates.append(current_lr)
            
            # 记录到TensorBoard
            self.visualizer.log_scalars('Loss', {
                'train': train_loss, 
                'valid': val_loss
            }, epoch)
            
            self.visualizer.log_scalars('Accuracy', {
                'train': train_acc,
                'valid': val_acc
            }, epoch)
            
            self.visualizer.log_scalars('Learning Rate', {'lr': current_lr}, epoch)
            
            # 保存最佳模型
            if val_acc > self.best_val_acc:
                self.best_val_acc = val_acc
                self.best_val_loss = val_loss
                self.no_improve_count = 0
                save_checkpoint(self)
            else:
                self.no_improve_count += 1
            
            # 打印进度
            print(f"Epoch {epoch}/{config.EPOCHS} | "
                  f"Train Loss: {train_loss:.4f} | "
                  f"Train Acc: {train_acc:.4f} | "
                  f"Val Loss: {val_loss:.4f} | "
                  f"Val Acc: {val_acc:.4f} | "
                  f"LR: {current_lr:.6f}")
            
            # 早停
            if config.EARLY_STOPPING and self.no_improve_count >= config.PATIENCE:
                print(f"Early stopping triggered after {epoch} epochs")
                self.early_stop = True
                break
        
        # 保存最终模型
        save_final_model(self)
        print(f"训练完成！最佳验证准确率: {self.best_val_acc:.4f}")
    
    def _train_epoch(self) -> Tuple[float, float]:
        """训练一个epoch
        
        Args:
            train_loader: 训练数据加载器
            
        Returns:
            (loss, accuracy): 平均损失和准确率
        """
        self.train()
        total_loss = 0
        total_acc = 0
        
        progress_bar = tqdm(
            self.train_loader,
            desc=f"[Train] Epoch {self.current_epoch}/{config.EPOCHS}",
            leave=False
        )
        
        for images, labels in progress_bar:
            images = images.to(self.device)
            labels = labels.to(self.device)
            
            # 前向传播
            outputs = self(images)
            
            # 计算损失
            loss = sum(self.criterion(output, labels[:, i]) for i, output in enumerate(outputs))
            
            # 反向传播
            self.optimizer.zero_grad()
            loss.backward()
            torch.nn.utils.clip_grad_norm_(self.parameters(), max_norm=1.0)
            self.optimizer.step()
            
            # 计算准确率
            acc, _ = self._calculate_accuracy(outputs, labels)
            
            # 更新统计
            total_loss += loss.item()
            total_acc += acc
            
            # 更新进度条
            progress_bar.set_postfix({
                'loss': f'{loss.item():.4f}',
                'acc': f'{acc*100:.2f}%'
            })
        
        # 更新指标
        current_lr = self.optimizer.param_groups[0]['lr']
        self.metrics_tracker.update_train_metrics(
            total_loss / len(self.train_loader),
            total_acc / len(self.train_loader),
            current_lr
        )
        
        return total_loss / len(self.train_loader), total_acc / len(self.train_loader)
    
    def _validate(self):
        """验证模型性能"""
        self.eval()  # 设置为评估模式
        
        # 在不计算梯度的情况下进行前向传播
        total_loss = 0
        total_acc = 0
        
        with torch.no_grad():
            for images, labels in self.valid_loader:
                images = images.to(self.device)
                labels = labels.to(self.device)
                
                # 前向传播
                outputs = self(images)
                
                # 计算损失
                loss = sum(self.criterion(output, labels[:, i]) for i, output in enumerate(outputs))
                
                # 计算准确率
                acc, predictions = self._calculate_accuracy(outputs, labels)
                
                # 更新总和
                total_loss += loss.item()
                total_acc += acc
        
        # 计算平均值
        val_loss = total_loss / len(self.valid_loader)
        val_acc = total_acc / len(self.valid_loader)
        
        # 收集所有批次的数据
        all_labels = []
        all_outputs = [[] for _ in range(config.CAPTCHA_LENGTH)]
        all_images = []
        
        with torch.no_grad():
            for images, labels in self.valid_loader:
                images = images.to(self.device)
                labels = labels.to(self.device)
                
                # 前向传播
                outputs = self(images)
                
                # 收集结果
                all_labels.append(labels.cpu())
                for i, output in enumerate(outputs):
                    all_outputs[i].append(output.cpu())
                
                # 保存少量图像用于可视化
                if len(all_images) < 1:  # 只保存第一个批次
                    all_images.append(images.cpu())
        
        # 更新指标
        predictions = self.metrics_tracker.update_val_metrics(
            val_loss, val_acc, all_outputs, all_labels
        )
        
        # 记录指标
        if self.logger:
            # 记录当前指标
            self.logger.log_metrics(self.metrics_tracker.get_current_metrics(), self.current_epoch)
            
            # 计算并记录混淆矩阵
            from sklearn.metrics import confusion_matrix
            cm = confusion_matrix(
                all_labels[0].flatten().cpu().numpy(), 
                predictions.flatten().cpu().numpy(),
                labels=range(config.NUM_CLASSES)
            )
            self.logger.log_confusion_matrix(cm, self.current_epoch)
            
            # 记录字符准确率
            if self.metrics_tracker.char_level_metrics:
                self.logger.log_character_accuracy(
                    self.metrics_tracker.char_level_metrics[-1], 
                    self.current_epoch
                )
            
            # 记录样本图像
            self.logger.log_sample_images(
                all_images[0], predictions[:8], all_labels[0][:8], self.current_epoch
            )
        
        return val_loss, val_acc
    
    @staticmethod
    def _calculate_accuracy(outputs: List[torch.Tensor], labels: torch.Tensor) -> Tuple[float, torch.Tensor]:
        """计算准确率
        
        Args:
            outputs: 模型输出
            labels: 真实标签
            
        Returns:
            (accuracy, predictions): 准确率和预测结果
        """
        predictions = torch.stack([output.argmax(dim=1) for output in outputs], dim=1)
        correct = (predictions == labels).all(dim=1).sum().item()
        return correct / labels.size(0), predictions
    
    def _print_training_info(self, train_dataset: CaptchaDataset, valid_dataset: CaptchaDataset) -> None:
        """打印训练信息"""
        info = {
            "模型": self.model_type,
            "GPU": torch.cuda.get_device_name(0) if torch.cuda.is_available() else "CPU",
            "训练样本": len(train_dataset),
            "验证样本": len(valid_dataset),
            "批次大小": config.BATCH_SIZE,
            "优化器": config.OPTIMIZER,
            "学习率": config.LEARNING_RATE,
            "权重衰减": config.WEIGHT_DECAY,
            "调度器": config.LR_SCHEDULER,
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