from typing import Union

import torch

from model.char.models import BaseModel


class Predictor:
    def __init__(self):
        self.model = None

    def use(self,model: Union[BaseModel, str]):
        return self