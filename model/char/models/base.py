from abc import ABC, abstractmethod
from typing import List

import torch
from torch import nn as nn


class BaseModel(nn.Module, ABC):
    """验证码识别模型基类"""

    # 模型名称
    model_name = "base"

    def __init__(self):
        """初始化模型"""
        super().__init__()

    @abstractmethod
    def forward(self, x: torch.Tensor) -> List[torch.Tensor]:
        """前向传播

        Args:
            x: 输入张量，形状 [B, C, H, W]

        Returns:
            输出张量列表，每个元素对应一个位置的分类结果
        """
        pass
