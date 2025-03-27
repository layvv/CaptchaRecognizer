import torch
from torch import nn
from torchvision.models import efficientnet_b0

from model.char.config import config
from model.char.models.base import BaseModel


class EfficientNetB0(BaseModel):
    model_name = "efficientnet_b0"

    def __init__(self):
        super().__init__()
        # 加载模型
        self.efficientnet = efficientnet_b0(weights=None)
        
        # 修改输入通道为1
        self.efficientnet.features[0][0] = nn.Conv2d(
            1, 32, kernel_size=3, stride=2, padding=1, bias=False
        )

        # 获取最终特征维度
        num_features = self.efficientnet.classifier[1].in_features
        
        # 移除原分类器
        self.efficientnet.classifier = nn.Identity()

        # 多任务输出头
        self.heads = nn.ModuleList([
            nn.Linear(num_features, config.NUM_CLASSES)  # EfficientNet-B0最终特征维度1280
            for _ in range(config.CAPTCHA_LENGTH)
        ])

    def forward(self, x):
        x = self.efficientnet.features(x)
        x = self.efficientnet.avgpool(x)
        x = torch.flatten(x, 1)
        return tuple(head(x) for head in self.heads) 