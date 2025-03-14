import os
from dataclasses import dataclass, field
from typing import Tuple, Dict, Any

# 获取模块根目录
MODULE_ROOT = os.path.dirname(os.path.abspath(__file__))

@dataclass
class Config:
    """统一配置类"""
    # 字符集配置
    CHAR_SET: str = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ'
    NUM_CLASSES: int = len(CHAR_SET)
    CAPTCHA_LENGTH: int = 4
    IMAGE_SIZE: Tuple[int, int] = (100, 40)  # 宽, 高
    
    # 路径配置
    DATA_ROOT: str = os.path.join(MODULE_ROOT, 'data')
    EXPERIMENT_ROOT: str = os.path.join(MODULE_ROOT, 'experiments')
    # 实验配置
    EXPERIMENT_FORMAT: str = "{model_name}_{timestamp}"
    EXPORT_ROOT: str = os.path.join(MODULE_ROOT, 'exported')
    
    # 数据生成配置
    TRAIN_RATIO: float = 0.8
    TOTAL_SAMPLES: int = 60000
    
    # 数据增强参数
    AUGMENTATION: Dict[str, Any] = field(default_factory=lambda: {
        'rotation_range': 5,
        'zoom_range': 0.1,
        'distortion_scale': 0.2,
        'brightness_range': 0.2,
        'contrast_range': 0.2
    })
    
    # 训练基础参数
    EPOCHS: int = 100
    BATCH_SIZE: int = 128
    LR: float = 1e-3

    NUM_WORKERS: int = 4
    PIN_MEMORY: bool = True

    WEIGHT_DECAY: float = 1e-4
    LR_DECAY_PATIENCE: int = 5
    LR_DECAY_FACTOR: float = 0.5
    MIN_LR: float = 1e-6

    LABEL_SMOOTHING: float = 0.1
    DROPOUT: float = 0.2

    # 早停策略
    EARLY_STOPPING: bool = True
    PATIENCE: int = 10
    DELTA: float = 0.001



# 创建默认配置实例
config = Config() 