import os
import time
from abc import ABC, abstractmethod
from typing import List, Tuple, Optional

import torch
import torch.nn as nn
from torch.utils.data import DataLoader
from torch.optim.lr_scheduler import ReduceLROnPlateau, CosineAnnealingLR, StepLR
from tqdm import tqdm

from model.char.config import config
from model.char.data.dataset import CaptchaDataset
from model.char.utils.model_util import save_checkpoint, save_final_model
from model.char.utils.metrics import MetricsTracker


class BaseModel(nn.Module, ABC):
    """所有验证码识别模型的基类"""
    
    # 模型类型标识
    model_type = "base"
    
    def __init__(self):
        """初始化模型"""
        super().__init__()

        # 使用可用的最佳设备
        self.device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        # 将模型移至设备
        self.to(self.device)
    
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
        # 初始化训练状态
        self.current_epoch = 0
        self.best_val_acc = 0.0
        self.best_val_loss = float('inf')
        self.no_improve_count = 0
        self.early_stop = False
        self.train_losses = []
        self.train_accs = []
        self.val_losses = []
        self.val_accs = []
        self.learning_rates = []
        self.current_epoch = None
        self.early_stop = None
        self.no_improve_count = None
        self.best_val_loss = None
        self.best_val_acc = None

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
            timestamp=time.strftime("%Y_%m%d_%H_%M_%S"),
            model_type=self.model_type,
        )
        self.experiment_dir = str(os.path.join(config.EXPERIMENT_ROOT, experiment_name))
        os.makedirs(self.experiment_dir, exist_ok=True)

        # 初始化指标跟踪器
        self.metrics_tracker = MetricsTracker(self.experiment_dir, self.model_type)


    
    def train_model(self, num_samples: Optional[int] = None) -> None:
        """训练模型
        
        Args:
            num_samples: 限制样本数量
        """
        # 初始化
        self._init_training_state()

        self._load_data(num_samples)
        
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
            self.metrics_tracker.log_to_tensorboard(
                epoch=epoch,
                train_loss=train_loss,
                train_acc=train_acc,
                val_loss=val_loss,
                val_acc=val_acc,
                lr=current_lr
            )
            
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
                  f"Train Loss/Acc: {train_loss:.4f}/{train_acc*100:.2f}% | "
                  f"Val Loss/Acc: {val_loss:.4f}/{val_acc*100:.2f}% | "
                  f"LR: {current_lr:.6f} | "
                  f"No Improve: {self.no_improve_count} | "
                  f"Best Acc: {self.best_val_acc*100:.2f}%"
            )

            
            # 早停
            if config.EARLY_STOPPING and self.no_improve_count >= config.PATIENCE:
                print(f"Early stopping triggered after {epoch} epochs")
                self.early_stop = True
                break
        
        # 保存训练曲线
        self.metrics_tracker.save_training_curves()
        
        # 关闭指标跟踪器
        self.metrics_tracker.close()
        
        # 保存最终模型
        save_final_model(self)

    
    def _train_epoch(self) -> Tuple[float, float]:
        """训练一个epoch
        
        Args:
            train_loader: 训练数据加载器
        
        Returns:
            训练损失和准确率的元组
        """
        self.train()  # 设置为训练模式
        total_loss = 0
        total_acc = 0
        
        # 使用tqdm创建进度条
        progress_bar = tqdm(
            self.train_loader, 
            desc=f"[Train] Epoch {self.current_epoch}/{config.EPOCHS}",
            leave=False
        )
        
        for images, labels in progress_bar:
            images = images.to(self.device)
            labels = labels.to(self.device)
            
            # 清零梯度
            self.optimizer.zero_grad()
            
            # 前向传播
            outputs = self(images)
            
            # 计算损失 (每个字符位置各自的损失之和)
            loss = sum(self.criterion(output, labels[:, i]) for i, output in enumerate(outputs))
            
            # 反向传播和优化
            loss.backward()
            self.optimizer.step()
            
            # 计算准确率
            acc, _ = self._calculate_accuracy(outputs, labels)

            # 更新进度条
            progress_bar.set_postfix({
                'loss': f'{loss.item():.4f}',
                'acc': f'{acc*100:.2f}%'
            })
            # 更新统计
            total_loss += loss.item()
            total_acc += acc

        return total_loss / len(self.train_loader), total_acc / len(self.train_loader)
    
    def _validate(self):
        """验证模型性能"""
        self.eval()  # 设置为评估模式
        
        # 在不计算梯度的情况下进行前向传播
        total_loss = 0
        total_acc = 0

        progress_bar = tqdm(
            self.valid_loader,
            desc=f"[Valid] Epoch {self.current_epoch}/{config.EPOCHS}",
            leave=False
        )
        
        # 收集所有批次的数据用于指标计算
        all_outputs = [[] for _ in range(config.CAPTCHA_LENGTH)]
        all_labels = []
        all_images = []
        
        with torch.no_grad():
            for images, labels in progress_bar:
                images = images.to(self.device)
                labels = labels.to(self.device)
                
                # 前向传播
                outputs = self(images)
                
                # 计算损失
                loss = sum(self.criterion(output, labels[:, i]) for i, output in enumerate(outputs))
                
                # 计算准确率
                acc, predictions = self._calculate_accuracy(outputs, labels)

                # 更新进度条
                progress_bar.set_postfix({
                    'loss': f'{loss.item():.4f}',
                    'acc': f'{acc*100:.2f}%'
                })
                # 更新总和
                total_loss += loss.item()
                total_acc += acc
                
                # 收集结果用于指标计算
                for i, output in enumerate(outputs):
                    all_outputs[i].append(output.cpu())
                all_labels.append(labels.cpu())
                
                # 保存少量图像用于可视化
                if len(all_images) < 2:  # 仅保存前两个批次的图像
                    all_images.append(images.cpu())
        
        # 计算平均值
        val_loss = total_loss / len(self.valid_loader)
        val_acc = total_acc / len(self.valid_loader)
        
        # 使用指标跟踪器更新并计算详细指标
        if self.metrics_tracker:
            # 合并所有批次的输出和标签
            merged_outputs = [torch.cat(outputs, dim=0) for outputs in all_outputs]
            merged_labels = torch.cat(all_labels, dim=0)
            
            # 更新验证指标
            predictions = self.metrics_tracker.update_val_metrics(
                val_loss, val_acc, merged_outputs, [merged_labels], self.current_epoch
            )
            
            # 记录混淆矩阵
            if len(merged_labels) > 0:
                from sklearn.metrics import confusion_matrix

                # 计算字符级别的混淆矩阵
                cm = confusion_matrix(
                    merged_labels.flatten().numpy(), 
                    predictions.flatten().numpy(),
                    labels=range(config.NUM_CLASSES)
                )
                self.metrics_tracker.log_confusion_matrix(cm, self.current_epoch)
            
            # 记录样例图像
            if all_images:
                sample_images = torch.cat(all_images, dim=0)[:8]  # 最多取8张图
                sample_labels = merged_labels[:8]
                sample_preds = predictions[:8]
                self.metrics_tracker.log_sample_images(
                    sample_images, sample_preds, sample_labels, self.current_epoch
                )
        
        return val_loss, val_acc

    def _load_data(self, num_samples: Optional[int] = None):
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