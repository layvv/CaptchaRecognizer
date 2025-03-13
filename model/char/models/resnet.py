from typing import List, Tuple

import torch
import torch.nn as nn
import torch.nn.functional as F

from model.char_input.config import config
from model.char_input.models.base_model import BaseModel


class BasicBlock(nn.Module):
    """ResNet基本块"""
    
    def __init__(self, in_channels: int, out_channels: int, stride: int = 1):
        super(BasicBlock, self).__init__()
        
        # 第一个卷积层
        self.conv1 = nn.Conv2d(
            in_channels, out_channels,
            kernel_size=3, stride=stride, padding=1, bias=False
        )
        self.bn1 = nn.BatchNorm2d(out_channels)
        
        # 第二个卷积层
        self.conv2 = nn.Conv2d(
            out_channels, out_channels,
            kernel_size=3, stride=1, padding=1, bias=False
        )
        self.bn2 = nn.BatchNorm2d(out_channels)
        
        # 短路连接
        self.shortcut = nn.Sequential()
        if stride != 1 or in_channels != out_channels:
            self.shortcut = nn.Sequential(
                nn.Conv2d(
                    in_channels, out_channels,
                    kernel_size=1, stride=stride, bias=False
                ),
                nn.BatchNorm2d(out_channels)
            )
    
    def forward(self, x: torch.Tensor) -> torch.Tensor:
        """前向传播"""
        out = F.relu(self.bn1(self.conv1(x)))
        out = self.bn2(self.conv2(out))
        out += self.shortcut(x)
        return F.relu(out)


class SEBlock(nn.Module):
    """Squeeze-and-Excitation注意力块"""
    
    def __init__(self, channel: int, reduction: int = 16):
        super(SEBlock, self).__init__()
        self.avg_pool = nn.AdaptiveAvgPool2d(1)
        self.fc = nn.Sequential(
            nn.Linear(channel, channel // reduction, bias=False),
            nn.ReLU(inplace=True),
            nn.Linear(channel // reduction, channel, bias=False),
            nn.Sigmoid()
        )
    
    def forward(self, x: torch.Tensor) -> torch.Tensor:
        """前向传播"""
        b, c, _, _ = x.size()
        y = self.avg_pool(x).view(b, c)
        y = self.fc(y).view(b, c, 1, 1)
        return x * y.expand_as(x)


class ResNet(BaseModel):
    """ResNet多头验证码识别模型"""
    
    model_type = "resnet"
    
    def __init__(self):
        super(ResNet, self).__init__()
        
        # 获取配置参数
        blocks_per_layer = config.MODEL_PARAMS['resnet']['blocks_per_layer']
        channels = config.MODEL_PARAMS['resnet']['channels']
        use_attention = config.MODEL_PARAMS['resnet']['use_attention']
        
        # 初始卷积层
        self.stem = nn.Sequential(
            nn.Conv2d(1, 32, kernel_size=3, stride=1, padding=1, bias=False),
            nn.BatchNorm2d(32),
            nn.ReLU(inplace=True),
            nn.MaxPool2d(kernel_size=3, stride=2, padding=1)
        )
        
        # ResNet层
        self.layer1 = self._make_layer(BasicBlock, 32, channels[0], blocks_per_layer[0], stride=1)
        self.layer2 = self._make_layer(BasicBlock, channels[0], channels[1], blocks_per_layer[1], stride=2)
        self.layer3 = self._make_layer(BasicBlock, channels[1], channels[2], blocks_per_layer[2], stride=2)
        
        # 注意力机制 (SE Block)
        self.attention = None
        if use_attention:
            self.attention = SEBlock(channels[2])
        
        # 全局池化
        self.global_pool = nn.AdaptiveAvgPool2d(1)
        
        # 共享全连接层
        self.shared_fc = nn.Sequential(
            nn.Linear(channels[2], 512),
            nn.BatchNorm1d(512),
            nn.ReLU(inplace=True),
            nn.Dropout(config.DROPOUT)
        )
        
        # 多头输出
        self.heads = nn.ModuleList([
            nn.Sequential(
                nn.Linear(512, 256),
                nn.BatchNorm1d(256),
                nn.ReLU(inplace=True),
                nn.Dropout(config.DROPOUT),
                nn.Linear(256, config.NUM_CLASSES)
            ) for _ in range(config.CAPTCHA_LENGTH)
        ])
        
        # 初始化权重
        self._init_weights()
    
    def _make_layer(self, block, in_channels: int, out_channels: int, blocks: int, stride: int = 1) -> nn.Sequential:
        """构建ResNet层
        
        Args:
            block: 基本块类
            in_channels: 输入通道数
            out_channels: 输出通道数
            blocks: 块数量
            stride: 步长
            
        Returns:
            nn.Sequential: 构建的层
        """
        layers = [block(in_channels, out_channels, stride)]
        for _ in range(1, blocks):
            layers.append(block(out_channels, out_channels))
        return nn.Sequential(*layers)

    
    def forward(self, x: torch.Tensor) -> List[torch.Tensor]:
        """前向传播
        
        Args:
            x: 输入张量，形状为 [B, C, H, W]
            
        Returns:
            输出张量列表，每个元素对应一个字符位置的分类结果
        """
        # 特征提取
        x = self.stem(x)
        x = self.layer1(x)
        x = self.layer2(x)
        x = self.layer3(x)
        
        # 注意力机制
        if self.attention:
            x = self.attention(x)
        
        # 全局池化
        x = self.global_pool(x)
        x = torch.flatten(x, 1)
        
        # 共享特征
        shared = self.shared_fc(x)
        
        # 多头输出
        return [head(shared) for head in self.heads] 