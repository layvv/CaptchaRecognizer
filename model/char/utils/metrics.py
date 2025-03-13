import os
import time
import numpy as np
import torch
from typing import Dict, List, Tuple, Any, Optional, Union
import matplotlib.pyplot as plt
from sklearn.metrics import confusion_matrix, precision_recall_fscore_support, classification_report
from torch.utils.tensorboard import SummaryWriter
from model.char.config import config


class MetricsTracker:
    """跟踪和记录模型训练和评估指标的类"""

    def __init__(self, experiment_dir: str, model_type: str):
        """初始化指标跟踪器
        
        Args:
            experiment_dir: 实验目录
            model_type: 模型类型
        """
        self.experiment_dir = experiment_dir
        self.model_type = model_type
        
        # 创建必要的目录
        self.logs_dir = os.path.join(experiment_dir, 'logs')
        self.eval_dir = os.path.join(experiment_dir, 'eval')
        self.plots_dir = os.path.join(experiment_dir, 'plots')
        
        os.makedirs(self.logs_dir, exist_ok=True)
        os.makedirs(self.eval_dir, exist_ok=True)
        os.makedirs(self.plots_dir, exist_ok=True)
        
        # 初始化 TensorBoard
        self.writer = SummaryWriter(log_dir=self.logs_dir)
        
        # 初始化指标记录
        self.train_losses = []
        self.val_losses = []
        self.train_accs = []
        self.val_accs = []
        self.learning_rates = []
        self.char_accs = []  # 每个字符位置的准确率
        self.char_level_metrics = []  # 字符级别的精确率、召回率、F1值
        self.captcha_accs = []  # 完整验证码的准确率
        
        # 最佳指标记录
        self.best_metrics = {
            'best_val_acc': 0.0,
            'best_epoch': 0,
            'best_char_acc': 0.0,
            'best_captcha_acc': 0.0
        }

    def update_train_metrics(self, loss: float, acc: float, lr: float) -> None:
        """更新训练指标
        
        Args:
            loss: 训练损失
            acc: 训练准确率
            lr: 当前学习率
        """
        self.train_losses.append(loss)
        self.train_accs.append(acc)
        self.learning_rates.append(lr)

    def update_val_metrics(
        self, 
        loss: float, 
        acc: float, 
        outputs: List[torch.Tensor], 
        labels: List[torch.Tensor],
        epoch: int
    ) -> torch.Tensor:
        """更新验证指标，包括字符级别和验证码级别
        
        Args:
            loss: 验证损失
            acc: 验证准确率
            outputs: 模型输出 (B, C) 的列表，长度为验证码长度
            labels: 标签
            epoch: 当前轮次
            
        Returns:
            预测的字符索引
        """
        self.val_losses.append(loss)
        self.val_accs.append(acc)
        
        # 将输出转换为预测
        all_preds = []
        all_true_labels = []
        
        # 合并多个batch的结果
        for batch_idx in range(len(labels)):
            batch_labels = labels[batch_idx]
            batch_outputs = [outputs[i][batch_idx] for i in range(config.CAPTCHA_LENGTH)]
            
            # 获取预测
            batch_preds = torch.stack([output.argmax(dim=1) for output in batch_outputs])
            
            all_preds.append(batch_preds)
            all_true_labels.append(batch_labels)
            
        all_preds = torch.cat(all_preds, dim=1)  # (CAPTCHA_LENGTH, total_samples)
        all_true_labels = torch.cat(all_true_labels, dim=0)  # (total_samples, CAPTCHA_LENGTH)
        
        # 计算每个位置的字符准确率
        char_accs = []
        for i in range(config.CAPTCHA_LENGTH):
            char_acc = (all_preds[i] == all_true_labels[:, i]).float().mean().item()
            char_accs.append(char_acc)
        
        self.char_accs.append(char_accs)
        
        # 计算完整验证码的准确率
        captcha_correct = torch.all(
            all_preds.t() == all_true_labels, dim=1
        ).float().mean().item()
        self.captcha_accs.append(captcha_correct)
        
        # 计算字符级别的精确率、召回率、F1值
        all_preds_flat = all_preds.flatten().cpu().numpy()
        all_labels_flat = all_true_labels.flatten().cpu().numpy()
        
        precision, recall, f1, _ = precision_recall_fscore_support(
            all_labels_flat, all_preds_flat, average='macro'
        )
        
        char_metrics = {
            'precision': precision,
            'recall': recall,
            'f1': f1
        }
        self.char_level_metrics.append(char_metrics)
        
        # 更新最佳指标
        if acc > self.best_metrics['best_val_acc']:
            self.best_metrics['best_val_acc'] = acc
            self.best_metrics['best_epoch'] = epoch
            self.best_metrics['best_char_acc'] = sum(char_accs) / len(char_accs)
            self.best_metrics['best_captcha_acc'] = captcha_correct
            
        # 记录到TensorBoard
        self.log_to_tensorboard(epoch, loss, acc, char_accs, captcha_correct, char_metrics, lr=None)
        
        # 转置预测结果以便返回
        return all_preds.t()  # (total_samples, CAPTCHA_LENGTH)

    def log_to_tensorboard(
        self, 
        epoch: int, 
        val_loss: float = None, 
        val_acc: float = None,
        char_accs: List[float] = None,
        captcha_acc: float = None,
        char_metrics: Dict[str, float] = None,
        train_loss: float = None,
        train_acc: float = None,
        lr: float = None
    ) -> None:
        """记录指标到TensorBoard
        
        Args:
            epoch: 当前轮次
            val_loss: 验证损失
            val_acc: 验证准确率
            char_accs: 字符准确率列表
            captcha_acc: 验证码准确率
            char_metrics: 字符级别指标
            train_loss: 训练损失
            train_acc: 训练准确率
            lr: 学习率
        """
        # 记录训练和验证指标
        if train_loss is not None and val_loss is not None:
            self.writer.add_scalars('Loss', {
                'train': train_loss,
                'valid': val_loss
            }, epoch)
            
        if train_acc is not None and val_acc is not None:
            self.writer.add_scalars('Accuracy', {
                'train': train_acc,
                'valid': val_acc
            }, epoch)
        
        # 记录学习率
        if lr is not None:
            self.writer.add_scalar('Learning Rate', lr, epoch)
        
        # 记录字符准确率
        if char_accs is not None:
            char_acc_dict = {f'char_{i}': acc for i, acc in enumerate(char_accs)}
            char_acc_dict['avg'] = sum(char_accs) / len(char_accs)
            self.writer.add_scalars('Character Accuracy', char_acc_dict, epoch)
        
        # 记录完整验证码准确率
        if captcha_acc is not None:
            self.writer.add_scalar('Captcha Accuracy', captcha_acc, epoch)
        
        # 记录字符级别指标
        if char_metrics is not None:
            for metric_name, value in char_metrics.items():
                self.writer.add_scalar(f'Character {metric_name.capitalize()}', value, epoch)
    
    def log_confusion_matrix(self, cm: np.ndarray, epoch: int) -> None:
        """记录混淆矩阵
        
        Args:
            cm: 混淆矩阵
            epoch: 当前轮次
        """
        # 绘制混淆矩阵
        plt.figure(figsize=(10, 10))
        plt.imshow(cm, interpolation='nearest', cmap=plt.cm.Blues)
        plt.title('Confusion Matrix')
        plt.colorbar()
        
        # 保存混淆矩阵图
        cm_path = os.path.join(self.plots_dir, f'confusion_matrix_epoch_{epoch}.png')
        plt.savefig(cm_path)
        plt.close()
        
        # 记录到TensorBoard (记录为图像)
        self.writer.add_figure('Confusion Matrix', plt.gcf(), epoch)
    
    def log_sample_images(
        self, 
        images: torch.Tensor, 
        predictions: torch.Tensor, 
        labels: torch.Tensor,
        epoch: int
    ) -> None:
        """记录样本图像
        
        Args:
            images: 图像 (B, C, H, W)
            predictions: 预测 (B, CAPTCHA_LENGTH)
            labels: 标签 (B, CAPTCHA_LENGTH)
            epoch: 当前轮次
        """
        # 最多记录8张图
        num_images = min(8, images.shape[0])
        
        # 将预测和标签转换为文本
        pred_texts = []
        label_texts = []
        
        for i in range(num_images):
            pred_text = ''.join([config.CHAR_SET[idx] for idx in predictions[i]])
            label_text = ''.join([config.CHAR_SET[idx] for idx in labels[i]])
            pred_texts.append(pred_text)
            label_texts.append(label_text)
        
        # 创建图像网格
        fig, axes = plt.subplots(2, 4, figsize=(12, 6))
        axes = axes.flatten()
        
        for i in range(num_images):
            # 将图像转换为可视格式
            img = images[i].permute(1, 2, 0).cpu().numpy()
            img = img * 0.5 + 0.5  # 反归一化
            
            axes[i].imshow(img)
            axes[i].set_title(f'Pred: {pred_texts[i]}\nTrue: {label_texts[i]}')
            axes[i].axis('off')
        
        # 保存图像
        samples_path = os.path.join(self.plots_dir, f'samples_epoch_{epoch}.png')
        plt.savefig(samples_path)
        plt.close()
        
        # 记录到TensorBoard
        self.writer.add_figure('Sample Predictions', plt.gcf(), epoch)
        
        # 记录图像到TensorBoard
        grid_images = torch.stack([images[i] for i in range(num_images)])
        self.writer.add_images('Sample Images', grid_images, epoch)
    
    def get_current_metrics(self) -> Dict[str, float]:
        """获取当前指标
        
        Returns:
            当前指标字典
        """
        current_epoch = len(self.val_accs) - 1
        
        metrics = {
            'train_loss': self.train_losses[-1] if self.train_losses else 0,
            'val_loss': self.val_losses[-1] if self.val_losses else 0,
            'train_acc': self.train_accs[-1] if self.train_accs else 0,
            'val_acc': self.val_accs[-1] if self.val_accs else 0,
            'lr': self.learning_rates[-1] if self.learning_rates else 0,
            'epoch': current_epoch + 1
        }
        
        # 添加字符准确率
        if self.char_accs:
            for i, acc in enumerate(self.char_accs[-1]):
                metrics[f'char_acc_{i}'] = acc
            metrics['avg_char_acc'] = sum(self.char_accs[-1]) / len(self.char_accs[-1])
        
        # 添加验证码准确率
        if self.captcha_accs:
            metrics['captcha_acc'] = self.captcha_accs[-1]
        
        # 添加字符级别指标
        if self.char_level_metrics:
            for metric_name, value in self.char_level_metrics[-1].items():
                metrics[f'char_{metric_name}'] = value
                
        return metrics
    
    def get_best_metrics(self) -> Dict[str, float]:
        """获取最佳指标
        
        Returns:
            最佳指标字典
        """
        return self.best_metrics
    
    def save_training_curves(self) -> None:
        """保存训练曲线"""
        # 保存损失曲线
        plt.figure(figsize=(10, 5))
        epochs = range(1, len(self.train_losses) + 1)
        plt.plot(epochs, self.train_losses, 'b-', label='Train Loss')
        plt.plot(epochs, self.val_losses, 'r-', label='Validation Loss')
        plt.title('Loss Curves')
        plt.xlabel('Epochs')
        plt.ylabel('Loss')
        plt.legend()
        plt.grid(True)
        plt.savefig(os.path.join(self.plots_dir, 'loss_curves.png'))
        plt.close()
        
        # 保存准确率曲线
        plt.figure(figsize=(10, 5))
        plt.plot(epochs, self.train_accs, 'b-', label='Train Accuracy')
        plt.plot(epochs, self.val_accs, 'r-', label='Validation Accuracy')
        plt.title('Accuracy Curves')
        plt.xlabel('Epochs')
        plt.ylabel('Accuracy')
        plt.legend()
        plt.grid(True)
        plt.savefig(os.path.join(self.plots_dir, 'accuracy_curves.png'))
        plt.close()
        
        # 保存学习率曲线
        plt.figure(figsize=(10, 5))
        plt.plot(epochs, self.learning_rates, 'g-')
        plt.title('Learning Rate Curve')
        plt.xlabel('Epochs')
        plt.ylabel('Learning Rate')
        plt.grid(True)
        plt.savefig(os.path.join(self.plots_dir, 'lr_curve.png'))
        plt.close()
        
        # 保存字符准确率曲线
        if self.char_accs:
            plt.figure(figsize=(10, 5))
            char_accs_by_position = list(zip(*self.char_accs))
            
            for i, accs in enumerate(char_accs_by_position):
                plt.plot(epochs, accs, label=f'Char {i}')
                
            plt.title('Character Accuracy by Position')
            plt.xlabel('Epochs')
            plt.ylabel('Accuracy')
            plt.legend()
            plt.grid(True)
            plt.savefig(os.path.join(self.plots_dir, 'char_accuracy_curves.png'))
            plt.close()
        
        # 保存验证码准确率曲线
        if self.captcha_accs:
            plt.figure(figsize=(10, 5))
            plt.plot(epochs, self.captcha_accs, 'm-')
            plt.title('Captcha Accuracy Curve')
            plt.xlabel('Epochs')
            plt.ylabel('Accuracy')
            plt.grid(True)
            plt.savefig(os.path.join(self.plots_dir, 'captcha_accuracy_curve.png'))
            plt.close()
    
    def close(self) -> None:
        """关闭TensorBoard写入器"""
        self.writer.close() 