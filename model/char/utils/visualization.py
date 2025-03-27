import os
from typing import Dict, List, Optional, Tuple, Union

import numpy as np
import torch
from torch.utils.tensorboard import SummaryWriter

from model.char.config import config
from model.char.utils.metrics import (
    calculate_confusion_matrices, calculate_precision_recall_f1,
    calculate_gmean, calculate_auc, calculate_position_accuracy,
    plot_confusion_matrix, plot_sample_predictions, fig_to_image
)


class TensorboardLogger:
    """TensorBoard日志记录器"""
    
    def __init__(self, log_dir: str):
        """
        初始化TensorBoard日志记录器
        
        Args:
            log_dir: 日志保存目录
        """
        self.writer = SummaryWriter(log_dir=log_dir)
        self.log_dir = log_dir
    
    def log_scalars(self, tag: str, scalar_dict: Dict[str, float], global_step: int):
        """
        记录标量值
        
        Args:
            tag: 指标分组标签
            scalar_dict: 指标名称和值的字典
            global_step: 全局步数
        """
        self.writer.add_scalars(tag, scalar_dict, global_step)
    
    def log_scalar(self, tag: str, scalar_value: float, global_step: int):
        """
        记录单个标量值
        
        Args:
            tag: 指标标签
            scalar_value: 标量值
            global_step: 全局步数
        """
        self.writer.add_scalar(tag, scalar_value, global_step)
    
    def log_histogram(self, tag: str, values: torch.Tensor, global_step: int):
        """
        记录直方图
        
        Args:
            tag: 指标标签
            values: 数据值
            global_step: 全局步数
        """
        self.writer.add_histogram(tag, values, global_step)
    
    def log_image(self, tag: str, img_tensor: torch.Tensor, global_step: int):
        """
        记录图像
        
        Args:
            tag: 图像标签
            img_tensor: 图像张量 [C, H, W]
            global_step: 全局步数
        """
        self.writer.add_image(tag, img_tensor, global_step)
    
    def log_images(self, tag: str, img_tensor: torch.Tensor, global_step: int):
        """
        记录多张图像
        
        Args:
            tag: 图像标签
            img_tensor: 图像张量 [N, C, H, W]
            global_step: 全局步数
        """
        self.writer.add_images(tag, img_tensor, global_step)
    
    def log_figure(self, tag: str, figure, global_step: int):
        """
        记录matplotlib图表
        
        Args:
            tag: 图表标签
            figure: matplotlib图表
            global_step: 全局步数
        """
        img = fig_to_image(figure)
        self.writer.add_image(tag, img, global_step)
    
    def log_model_graph(self, model, input_tensor: torch.Tensor):
        """
        记录模型图
        
        Args:
            model: PyTorch模型
            input_tensor: 输入张量
        """
        self.writer.add_graph(model, input_tensor)
    
    def log_confusion_matrices(self, outputs: List[torch.Tensor], labels: torch.Tensor, 
                             num_classes: int, char_set: str, epoch: int):
        """
        记录每个位置的混淆矩阵
        
        Args:
            outputs: 模型输出 List[B, num_classes]
            labels: 真实标签 [B, CAPTCHA_LENGTH]
            num_classes: 类别数
            char_set: 字符集
            epoch: 当前轮次
        """
        confusion_matrices = calculate_confusion_matrices(outputs, labels, num_classes)
        char_classes = list(char_set)
        
        for i, cm in enumerate(confusion_matrices):
            # 绘制混淆矩阵
            fig = plot_confusion_matrix(cm, classes=char_classes, normalize=True)
            tag = f'confusion_matrix/position_{i+1}'
            self.log_figure(tag, fig, epoch)
    
    def log_metrics(self, phase: str, metrics: Dict[str, Union[float, List[float]]], epoch: int):
        """
        记录训练或验证指标
        
        Args:
            phase: 阶段 ('train' or 'valid')
            metrics: 指标字典
            epoch: 当前轮次
        """
        for name, value in metrics.items():
            if isinstance(value, list):
                # 如果是每个位置的指标，单独记录
                for i, val in enumerate(value):
                    self.log_scalar(f'{phase}/{name}_position_{i+1}', val, epoch)
                # 同时记录平均值
                self.log_scalar(f'{phase}/{name}_avg', sum(value) / len(value), epoch)
            else:
                # 标量值直接记录
                self.log_scalar(f'{phase}/{name}', value, epoch)
    
    def log_training_validation_metrics(self, train_metrics: Dict[str, float], 
                                     valid_metrics: Dict[str, float], epoch: int):
        """
        同时记录训练和验证指标，便于比较
        
        Args:
            train_metrics: 训练指标
            valid_metrics: 验证指标
            epoch: 当前轮次
        """
        # 找出两个字典中共同的键
        common_keys = set(train_metrics.keys()).intersection(set(valid_metrics.keys()))
        
        for key in common_keys:
            # 只对标量值进行合并
            if isinstance(train_metrics[key], (int, float)) and isinstance(valid_metrics[key], (int, float)):
                # 简化命名，去掉冗余字段
                self.log_scalars(
                    key, 
                    {'train': train_metrics[key], 'valid': valid_metrics[key]}, 
                    epoch
                )
    
    def log_sample_predictions(self, images: torch.Tensor, outputs: List[torch.Tensor], 
                            labels: torch.Tensor, char_set: str, epoch: int, num_samples: int = 20):
        """
        记录样本预测结果
        
        Args:
            images: 图像 [B, C, H, W]
            outputs: 模型输出 List[B, num_classes]
            labels: 真实标签 [B, CAPTCHA_LENGTH]
            char_set: 字符集
            epoch: 当前轮次
            num_samples: 记录的样本数量
        """
        # 将输出转换为预测的类别索引
        predictions = torch.stack([output.argmax(1) for output in outputs], dim=1)
        
        # 绘制预测结果图
        fig = plot_sample_predictions(images, predictions, labels, char_set, num_samples)
        
        # 记录图表
        self.log_figure(f'predictions/samples', fig, epoch)
    
    def log_comprehensive_metrics(self, outputs: List[torch.Tensor], labels: torch.Tensor, 
                               images: Optional[torch.Tensor] = None, epoch: int = 0, phase: str = 'valid'):
        """
        记录全面的评估指标
        
        Args:
            outputs: 模型输出 List[B, num_classes]
            labels: 真实标签 [B, CAPTCHA_LENGTH]
            images: 输入图像 [B, C, H, W]，如果提供则记录预测结果
            epoch: 当前轮次
            phase: 阶段 ('train', 'valid', 'test')
        """
        metrics = {}
        
        # 计算位置准确率
        position_acc = calculate_position_accuracy(outputs, labels)
        metrics['position_acc'] = position_acc
        
        # 计算精确率、召回率和F1分数
        precisions, recalls, f1s = calculate_precision_recall_f1(
            outputs, labels, config.NUM_CLASSES, average='macro'
        )
        metrics['precision'] = precisions
        metrics['recall'] = recalls
        metrics['f1'] = f1s
        
        # 计算GMean
        gmeans = calculate_gmean(outputs, labels)
        metrics['gmean'] = gmeans
        
        # 计算AUC
        aucs = calculate_auc(outputs, labels, config.NUM_CLASSES)
        metrics['auc'] = aucs
        
        # 记录指标
        self.log_metrics(phase, metrics, epoch)
        
        # 只在验证或测试阶段记录混淆矩阵
        if phase in ['valid', 'test']:
            self.log_confusion_matrices(outputs, labels, config.NUM_CLASSES, config.CHAR_SET, epoch)
        
        # 如果提供了图像，并且每5个epoch记录一次预测结果
        if images is not None and epoch % 5 == 0:
            self.log_sample_predictions(images, outputs, labels, config.CHAR_SET, epoch)
    
    def close(self):
        """关闭SummaryWriter"""
        self.writer.close() 