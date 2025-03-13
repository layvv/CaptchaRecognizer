from typing import List, Tuple

import torch
import torch.nn as nn
import torch.nn.functional as F

from model.char.config import config
from model.char.models.base_model import BaseModel


class CRNN(BaseModel):
    """CRNN (CNN + RNN) 验证码识别模型"""
    
    model_type = "crnn"
    
    def __init__(self):
        super(CRNN, self).__init__()
        
        # 获取配置参数
        rnn_hidden = config.MODEL_PARAMS['crnn']['rnn_hidden']
        rnn_layers = config.MODEL_PARAMS['crnn']['rnn_layers']
        bidirectional = config.MODEL_PARAMS['crnn']['bidirectional']
        
        # 卷积特征提取层
        self.cnn = nn.Sequential(
            # 第一层: 1x32x100 -> 64x16x50
            nn.Conv2d(1, 64, kernel_size=3, stride=1, padding=1),
            nn.ReLU(inplace=True),
            nn.MaxPool2d(kernel_size=2, stride=2),
            nn.Dropout(config.DROPOUT),
            
            # 第二层: 64x16x50 -> 128x8x25
            nn.Conv2d(64, 128, kernel_size=3, stride=1, padding=1),
            nn.ReLU(inplace=True),
            nn.MaxPool2d(kernel_size=2, stride=2),
            nn.Dropout(config.DROPOUT),
            
            # 第三层: 128x8x25 -> 256x4x12
            nn.Conv2d(128, 256, kernel_size=3, stride=1, padding=1),
            nn.BatchNorm2d(256),
            nn.ReLU(inplace=True),
            nn.MaxPool2d(kernel_size=(2, 2), stride=(2, 2)),
            nn.Dropout(config.DROPOUT),
            
            # 第四层: 256x4x12 -> 512x2x12
            nn.Conv2d(256, 512, kernel_size=3, stride=1, padding=1),
            nn.BatchNorm2d(512),
            nn.ReLU(inplace=True),
            nn.MaxPool2d(kernel_size=(2, 1), stride=(2, 1)),
            nn.Dropout(config.DROPOUT),
            
            # 第五层: 512x2x12 -> 512x1x12
            nn.Conv2d(512, 512, kernel_size=3, stride=1, padding=1),
            nn.BatchNorm2d(512),
            nn.ReLU(inplace=True),
            nn.MaxPool2d(kernel_size=(2, 1), stride=(2, 1)),
            nn.Dropout(config.DROPOUT)
        )
        
        # 序列宽度（经过CNN后）
        w = config.IMAGE_SIZE[0]
        for _ in range(2):  # 前两层池化
            w = (w + 1) // 2
        for _ in range(3):  # 后三层只在高度上池化
            w = w
        self.seq_width = w
        
        # 双向LSTM
        self.rnn = nn.LSTM(
            input_size=512,
            hidden_size=rnn_hidden,
            num_layers=rnn_layers,
            batch_first=True,
            dropout=config.DROPOUT if rnn_layers > 1 else 0,
            bidirectional=bidirectional
        )
        
        # 输出层
        fc_in_dim = rnn_hidden * 2 if bidirectional else rnn_hidden
        self.fc = nn.Linear(fc_in_dim, 256)
        
        # 多头输出层
        self.heads = nn.ModuleList([
            nn.Linear(256, config.NUM_CLASSES)
            for _ in range(config.CAPTCHA_LENGTH)
        ])
        
        # 初始化权重
        self._init_weights()
    
    def _init_weights(self):
        """初始化权重"""
        for m in self.modules():
            if isinstance(m, nn.Conv2d):
                nn.init.kaiming_normal_(m.weight, mode='fan_out', nonlinearity='relu')
                if m.bias is not None:
                    nn.init.constant_(m.bias, 0)
            elif isinstance(m, nn.BatchNorm2d):
                nn.init.constant_(m.weight, 1)
                nn.init.constant_(m.bias, 0)
            elif isinstance(m, nn.Linear):
                nn.init.kaiming_normal_(m.weight, mode='fan_out', nonlinearity='relu')
                nn.init.constant_(m.bias, 0)
            elif isinstance(m, nn.LSTM):
                for name, param in m.named_parameters():
                    if 'weight' in name:
                        nn.init.orthogonal_(param)
                    elif 'bias' in name:
                        nn.init.constant_(param, 0)
    
    def forward(self, x: torch.Tensor) -> List[torch.Tensor]:
        """前向传播
        
        Args:
            x: 输入张量，形状为 [B, C, H, W]
            
        Returns:
            输出张量列表，每个元素对应一个字符位置的分类结果
        """
        # 通过CNN提取特征 [B, C, H, W]
        conv = self.cnn(x)
        
        # 转换为序列 [B, W, C]
        batch_size = conv.size(0)
        conv = conv.squeeze(2)  # 移除高度维度
        conv = conv.permute(0, 2, 1)  # [B, W, C]
        
        # 通过RNN处理序列
        rnn_output, _ = self.rnn(conv)
        
        # 获取最终状态并进行映射
        # 对序列进行池化得到固定长度表示
        features = F.adaptive_max_pool1d(rnn_output.permute(0, 2, 1), config.CAPTCHA_LENGTH)
        features = features.permute(0, 2, 1)  # [B, captcha_length, hidden]
        
        # 应用全连接层
        features = self.fc(features)
        
        # 多头输出
        outputs = []
        for i, head in enumerate(self.heads):
            outputs.append(head(features[:, i]))
        
        return outputs 