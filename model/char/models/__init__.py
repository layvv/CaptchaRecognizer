from abc import ABC, abstractmethod
from typing import List

import torch
import torch.nn as nn

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

class ModelFactory:
    registry = {}

    @classmethod
    def register(cls):
        """ 注册模型 """
        def decorator(model_cls):
            cls.registry[model_cls.model_name] = model_cls
            return model_cls
        return decorator

    def get_model(self, model_name: str):
        """获取模型

        Args:
            model_name: 模型名称
        """
        if model_name not in self.registry:
            raise ValueError(f"Model {model_name} not registered")
        return self.registry[model_name]()
