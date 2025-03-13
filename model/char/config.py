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
    CHECKPOINT_ROOT: str = os.path.join(MODULE_ROOT, 'checkpoints')
    EXPERIMENT_ROOT: str = os.path.join(MODULE_ROOT, 'experiments')
    EXPORT_ROOT: str = os.path.join(MODULE_ROOT, 'exported_models')
    
    # 数据生成配置
    TRAIN_RATIO: float = 0.8
    TOTAL_SAMPLES: int = 60
    
    # 数据增强参数
    AUGMENTATION: Dict[str, Any] = field(default_factory=lambda: {
        'rotation_range': 5,
        'zoom_range': 0.1,
        'distortion_scale': 0.2,
        'brightness_range': 0.2,
        'contrast_range': 0.2
    })
    
    # 训练基础参数
    BATCH_SIZE: int = 128
    EPOCHS: int = 100
    NUM_WORKERS: int = 4
    PIN_MEMORY: bool = True
    
    # 优化器参数
    OPTIMIZER: str = 'adamw'  # 可选：'adam', 'adamw', 'sgd'
    LEARNING_RATE: float = 1e-3
    WEIGHT_DECAY: float = 1e-4
    
    # 学习率调度
    LR_SCHEDULER: str = 'reducelr'  # 可选：'reducelr', 'cosine', 'step'
    LR_PATIENCE: int = 5
    LR_FACTOR: float = 0.5
    MIN_LR: float = 1e-6
    
    # 早停策略
    EARLY_STOPPING: bool = True
    PATIENCE: int = 10
    DELTA: float = 0.001
    
    # 通用模型参数
    DROPOUT: float = 0.2
    MODEL_TYPE: str = 'resnet'  # 可选：'cnn', 'resnet', 'crnn'
    
    # 模型特定参数
    MODEL_PARAMS: Dict[str, Any] = field(default_factory=lambda: {
        'cnn': {
            'conv_layers': [32, 64, 128],
            'fc_layers': [256, 128],
        },
        'resnet': {
            'blocks_per_layer': [2, 2, 2],
            'channels': [64, 128, 256], 
            'use_attention': True
        },
        'crnn': {
            'rnn_hidden': 256,
            'rnn_layers': 2,
            'bidirectional': True
        }
    })
    
    # 实验配置
    EXPERIMENT_FORMAT: str = "{timestamp}_{model_type}"

# 创建默认配置实例
config = Config() 