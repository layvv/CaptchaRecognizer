import torch
from torch import nn
from torchvision.models import densenet121

from model.char.config import config
from model.char.models.base import BaseModel


class DenseNet121(BaseModel):
    model_name = "densenet121"

    def __init__(self):
        super().__init__()
        # 修改输入通道为1
        self.densenet = densenet121(weights=None)
        
        # 替换第一个卷积层以适应灰度图像
        self.densenet.features.conv0 = nn.Conv2d(
            1, 64, kernel_size=7, stride=2, padding=3, bias=False
        )

        # 获取最终特征维度
        num_features = self.densenet.classifier.in_features

        # 移除原分类器
        self.densenet.classifier = nn.Identity()

        # 多任务输出头
        self.heads = nn.ModuleList([
            nn.Linear(num_features, config.NUM_CLASSES)  # DenseNet121最终特征维度1024
            for _ in range(config.CAPTCHA_LENGTH)
        ])

    def forward(self, x):
        x = self.densenet.features(x)
        x = nn.functional.relu(x, inplace=True)
        x = nn.functional.adaptive_avg_pool2d(x, (1, 1))
        x = torch.flatten(x, 1)
        return tuple(head(x) for head in self.heads) 