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
    TRAIN_RATIO = 0.85
    TOTAL_SAMPLES = 50000


@dataclass(frozen=True)
class CheckpointConfig(BaseConfig):
    # 检查点配置
    CHECKPOINT_ROOT = os.path.join(MODULE_ROOT, 'checkpoint')
    SAVE_INTERVAL = 10
    EXPERIMENT_FORMAT = "{timestamp}_{model_name}_bs{batch_size}_lr{lr}"


