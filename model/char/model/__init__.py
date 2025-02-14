import importlib
from pathlib import Path

from torch import nn


def create_model(config_path: str) -> nn.Module:
    """根据配置文件动态创建模型实例"""
    import json
    with open(config_path, 'r') as f:
        config = json.load(f)
    
    model_class_name = config['model']['class']
    model_params = config['model']
    
    # 动态导入模型模块
    model_dir = Path(__file__).parent
    for module_file in model_dir.glob("*.py"):
        if module_file.stem.startswith("_"):
            continue
        module = importlib.import_module(f"model.char.model.{module_file.stem}")
        if hasattr(module, model_class_name):
            model_class = getattr(module, model_class_name)
            return model_class(**model_params)
    
    raise ValueError(f"未找到模型类: {model_class_name}")