from .base_model import BaseModel
from .cnn import BasicCNN
from .resnet import ResNet
from .crnn import CRNN

# 模型注册表
MODELS = {
    'cnn': BasicCNN,
    'resnet': ResNet,
    'crnn': CRNN
}

def get_model(model_type=None) -> BaseModel:
    """获取模型实例
    
    Args:
        model_type: 模型类型，None时使用配置中的默认值
    
    Returns:
        Model: 模型实例
    """
    from model.char.config import config
    
    if model_type is None:
        model_type = config.MODEL_TYPE
        
    if model_type not in MODELS:
        raise ValueError(f"不支持的模型类型: {model_type}，可用模型: {list(MODELS.keys())}")
    
    return MODELS[model_type]() 