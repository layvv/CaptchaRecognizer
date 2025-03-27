import torch
from torch import nn
from torchvision.models import mobilenet_v3_small

from model.char.config import config
from model.char.models.base import BaseModel


class MobileNetV3Small(BaseModel):
    model_name = "mobilenet_v3_small"

    def __init__(self):
        super().__init__()
        # 加载模型
        self.mobilenet = mobilenet_v3_small(weights=None)
        
        # 修改输入通道为1
        self.mobilenet.features[0][0] = nn.Conv2d(
            1, 16, kernel_size=3, stride=2, padding=1, bias=False
        )

        # 获取最终特征维度
        num_features = self.mobilenet.classifier[-1].in_features
        
        # 移除原分类器
        self.mobilenet.classifier = nn.Identity()

        # 多任务输出头
        self.heads = nn.ModuleList([
            nn.Linear(num_features, config.NUM_CLASSES)  # MobileNetV3 Small最终特征维度576
            for _ in range(config.CAPTCHA_LENGTH)
        ])

    def forward(self, x):
        x = self.mobilenet.features(x)
        x = self.mobilenet.avgpool(x)
        x = torch.flatten(x, 1)
        return tuple(head(x) for head in self.heads) 