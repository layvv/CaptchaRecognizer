import os
from dataclasses import dataclass

MODULE_ROOT = os.path.dirname(__file__)

@dataclass(frozen=True)
class BaseConfig:
    # 基本配置
    CHAR_SET = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ'
    NUM_CLASSES = len(CHAR_SET)
    CAPTCHA_LENGTH = 4
    IMAGE_SIZE = (160, 60)

@dataclass(frozen=True)
class DataSetConfig(BaseConfig):
    # 数据集配置
    DATA_ROOT = os.path.join(MODULE_ROOT, 'data')
    TRAIN_RATIO = 0.8
    TOTAL_SAMPLES = 10000
    # 数据增强
    AUGMENT = {
        'blur_prob': 0.1,          # 高斯模糊概率
        'noise_prob': 0.05,        # 椒盐噪声概率
        'rotation_range': 10,      # 最大旋转角度
        'rotation_prob': 0.5       # 旋转概率
    }

@dataclass(frozen=True)
class CheckpointConfig(BaseConfig):
    # 检查点配置
    CHECKPOINT_ROOT = os.path.join(MODULE_ROOT, 'checkpoint')
    SAVE_INTERVAL = 10
    EXPERIMENT_FORMAT = "{model_name}_bs{batch_size}_lr{lr}_{timestamp}"  # 保持模板不变

