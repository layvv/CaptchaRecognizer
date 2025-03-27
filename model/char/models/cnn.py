import torch
import torch.nn as nn
import torch.nn.functional as F
from model.char.config import config
from model.char.models.base import BaseModel


class CNN(BaseModel):
    model_name = "cnn"

    def __init__(self):
        super().__init__()
        # 卷积层
        self.conv1 = nn.Conv2d(1, 32, kernel_size=3, padding=1)
        self.pool = nn.MaxPool2d(2, 2)
        self.conv2 = nn.Conv2d(32, 64, kernel_size=3, padding=1)

        # 自适应池化解决尺寸问题
        self.adaptive_pool = nn.AdaptiveAvgPool2d((4, 4))

        # 全连接层
        self.fc1 = nn.Linear(64 * 4 * 4, 256)
        self.dropout = nn.Dropout(0.5)

        # 多任务输出头
        self.heads = nn.ModuleList([
            nn.Linear(256, config.NUM_CLASSES)
            for _ in range(config.CAPTCHA_LENGTH)
        ])

    def forward(self, x):
        x = self.pool(F.relu(self.conv1(x)))
        x = self.pool(F.relu(self.conv2(x)))
        x = self.adaptive_pool(x)
        x = torch.flatten(x, 1)
        x = F.relu(self.fc1(x))
        x = self.dropout(x)
        return tuple(head(x) for head in self.heads)