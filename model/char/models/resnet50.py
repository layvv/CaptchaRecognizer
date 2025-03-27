import torch
from torch import nn
from torchvision.models import resnet50

from model.char.config import config
from model.char.models.base import BaseModel


class ResNet50(BaseModel):
    model_name = "resnet50"

    def __init__(self):
        super().__init__()
        # 修改输入通道为1
        self.resnet = resnet50(weights=None)
        self.resnet.conv1 = nn.Conv2d(
            1, 64, kernel_size=7, stride=2, padding=3, bias=False
        )

        # 移除原全连接层
        self.resnet.fc = nn.Identity()

        # 多任务输出头
        self.heads = nn.ModuleList([
            nn.Linear(2048, config.NUM_CLASSES)  # ResNet50最终特征维度2048
            for _ in range(config.CAPTCHA_LENGTH)
        ])

    def forward(self, x):
        x = self.resnet.conv1(x)
        x = self.resnet.bn1(x)
        x = self.resnet.relu(x)
        x = self.resnet.maxpool(x)

        x = self.resnet.layer1(x)
        x = self.resnet.layer2(x)
        x = self.resnet.layer3(x)
        x = self.resnet.layer4(x)

        x = self.resnet.avgpool(x)
        x = torch.flatten(x, 1)
        return tuple(head(x) for head in self.heads) 