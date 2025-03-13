from typing import List

import torch
import torch.nn as nn
import torch.nn.functional as F

from model.char_input.config import config
from model.char_input.models.base_model import BaseModel


class BasicCNN(BaseModel):
    """简单CNN模型"""
    
    model_type = "cnn"
    
    def __init__(self):
        super(BasicCNN, self).__init__()
        
        # 获取模型参数
        conv_channels = config.MODEL_PARAMS['cnn']['conv_layers']
        fc_sizes = config.MODEL_PARAMS['cnn']['fc_layers']
        
        # 特征提取层
        self.features = nn.Sequential(
            # 第一个卷积块
            nn.Conv2d(1, conv_channels[0], kernel_size=5, padding=2),
            nn.BatchNorm2d(conv_channels[0]),
            nn.ReLU(inplace=True),
            nn.MaxPool2d(2, 2),
            nn.Dropout(config.DROPOUT),
            
            # 第二个卷积块
            nn.Conv2d(conv_channels[0], conv_channels[1], kernel_size=3, padding=1),
            nn.BatchNorm2d(conv_channels[1]),
            nn.ReLU(inplace=True),
            nn.MaxPool2d(2, 2),
            nn.Dropout(config.DROPOUT),
            
            # 第三个卷积块
            nn.Conv2d(conv_channels[1], conv_channels[2], kernel_size=3, padding=1),
            nn.BatchNorm2d(conv_channels[2]),
            nn.ReLU(inplace=True),
            nn.MaxPool2d(2, 2),
            nn.Dropout(config.DROPOUT)
        )
        
        # 计算卷积后的特征图大小
        h, w = config.IMAGE_SIZE
        for _ in range(3):  # 3个最大池化层
            h = (h + 1) // 2
            w = (w + 1) // 2
            
        # 分类器
        self.classifier = nn.Sequential(
            nn.Linear(conv_channels[2] * h * w, fc_sizes[0]),
            nn.BatchNorm1d(fc_sizes[0]),
            nn.ReLU(inplace=True),
            nn.Dropout(config.DROPOUT),
            
            nn.Linear(fc_sizes[0], fc_sizes[1]),
            nn.BatchNorm1d(fc_sizes[1]),
            nn.ReLU(inplace=True),
            nn.Dropout(config.DROPOUT)
        )
        
        # 多个头部，每个头部负责一个字符位置的分类
        self.heads = nn.ModuleList([
            nn.Linear(fc_sizes[1], config.NUM_CLASSES)
            for _ in range(config.CAPTCHA_LENGTH)
        ])
        
        # 权重初始化
        self._init_weights()
    
    def forward(self, x: torch.Tensor) -> List[torch.Tensor]:
        """前向传播
        
        Args:
            x: 输入张量，形状为 [B, C, H, W]
            
        Returns:
            输出张量列表，每个元素对应一个字符位置的分类结果
        """
        # 特征提取
        features = self.features(x)
        features = torch.flatten(features, 1)
        
        # 共享特征
        shared = self.classifier(features)
        
        # 多头输出
        return [head(shared) for head in self.heads] 