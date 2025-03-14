from typing import List

import torch

from model.char.models import BaseModel, ModelFactory


@ModelFactory.register()
class ResNet(BaseModel):

    model_name = 'resnet'
    optimizer = None
    scheduler = None

    def forward(self, x: torch.Tensor) -> List[torch.Tensor]:
        pass
