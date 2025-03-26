import importlib
import json
import os
import platform
import shutil
from datetime import datetime

import psutil
import torch

from model.char.config import config
from model.char.models import BaseModel

def load_model(model_path: str):
    if not os.path.exists(model_path):
        raise FileNotFoundError(f"模型文件不存在: {model_path}")
    state = torch.load(model_path)
    module = importlib.import_module(state['module_name'])
    model = getattr(module, state['class_name'])()
    model.load_state_dict(state['model_state_dict'])
    return model

def save_checkpoint(trainer):
    """保存检查点

    Args:
        trainer: 训练器
    """
    experiment_dir = trainer.experiment_dir
    epoch = trainer.current_epoch
    new_acc = trainer.valid_accs[-1]
    model: BaseModel = trainer.model
    # 保存正确率更高的检查点
    if new_acc <= trainer.best_valid_acc:
        return

    # 创建新检查点文件名
    checkpoint_dir = os.path.join(
        experiment_dir,
        'checkpoint'
    )
    os.makedirs(checkpoint_dir,exist_ok=True)

    for file in os.listdir(checkpoint_dir):
        if file.endswith('.pth'):
            os.remove(os.path.join(checkpoint_dir, file))

    # 保存状态
    state = {
        'epoch': epoch,
        'model_state_dict': model.state_dict(),
        'model_name': model.model_name,
        'module_name': model.__class__.__module__,
        'class_name': model.__class__.__name__,
        'accuracy': new_acc,
        'date': datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        'config': {k: v for k, v in vars(config).items() if not k.startswith('_')}
    }
    checkpoint_path = os.path.join(
        checkpoint_dir,
        f"{model.model_name}_epoch{epoch}_acc{new_acc:.4f}.pth"
    )
    torch.save(state, checkpoint_path)
    # print(f"检查点已保存: {checkpoint_path}")

    return checkpoint_path


def save_final_model(trainer):
    """保存最终模型

    Args:
        trainer: 训练器
    """
    # 确保导出目录存在
    os.makedirs(config.EXPORT_ROOT, exist_ok=True)
    model = trainer.model

    # 如果发生早停，使用最佳checkpoint
    if trainer.early_stop:
        print(f"检测到早停，导出最佳模型 (准确率: {trainer.best_val_acc:.4f})")
        # 找到checkpoint目录中最佳模型
        experiment_dir = trainer.experiment_dir
        best_model = None
        best_acc = 0

        for file in os.listdir(experiment_dir):
            if file.endswith('.pth'):
                try:
                    acc = float(file.split('_acc')[-1].split('.pth')[0])
                    if acc > best_acc:
                        best_acc = acc
                        best_model = file
                except:
                    continue

        if best_model:
            checkpoint_path = os.path.join(experiment_dir, best_model)
            # 复制最佳模型到导出目录
            export_path = os.path.join(
                config.EXPORT_ROOT,
                f"{model.model_name}_best_acc{best_acc:.4f}.pth"
            )
            shutil.copy(checkpoint_path, export_path)
            print(f"最佳模型已导出至: {export_path}")
            return

    # 没有早停，保存当前模型
    export_path = os.path.join(
        config.EXPORT_ROOT,
        f"{model.model_name}_final_acc{trainer.best_val_acc:.4f}.pth"
    )

    # 保存状态
    state = {
        'epoch': trainer.current_epoch,
        'model_state_dict': trainer.model.state_dict(),
        'model_name': model.model_name,
        'module_name': model.__class__.__module__,
        'class_name': model.__class__.__name__,
        'accuracy': trainer.best_val_acc,
        'date': datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        'config': {k: v for k, v in vars(config).items() if not k.startswith('_')}
    }

    torch.save(state, export_path)
    print(f"最终模型已导出至: {export_path}")
    # 保存配置信息
    config_path = os.path.join(config.EXPORT_ROOT, f"{model.model_name}_config.json")
    config_dict = {
        'model': {
            'name': model.model_name,
            'class': model.__class__.__name__,
            'module': model.__class__.__module__,
        },
        'training': {
            'batch_size': config.BATCH_SIZE,
            'optimizer': trainer.optimizer.__class__.__name__,
            'learning_rate': config.LR,
            'weight_decay': config.WEIGHT_DECAY,
            'scheduler': trainer.scheduler.__class__.__name__,
            'epochs': trainer.current_epoch + '/' + config.EPOCHS,
            'early_stopping': config.EARLY_STOPPING,
            'patience': config.PATIENCE,
            'best_val_acc': trainer.best_valid_acc,
            'best_val_loss': trainer.best_valid_loss,
            'training_time': trainer.training_time,
        },
        'dataset': {
            'char_set': config.CHAR_SET,
            'num_classes': config.NUM_CLASSES,
            'captcha_length': config.CAPTCHA_LENGTH,
            'image_size': config.IMAGE_SIZE
        },
        'system': {
            'timestamp': datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
            'pytorch_version': torch.__version__,
            'cuda_available': torch.cuda.is_available(),
            'gpu_name': torch.cuda.get_device_name(0) if torch.cuda.is_available() else 'N/A',
            'platform': platform.platform(),
            'cpu_count': os.cpu_count(),
            'memory': f"{psutil.virtual_memory().total / (1024**3):.1f}GB"
        }
    }

    # 保存为JSON
    with open(config_path, 'w', encoding='utf-8') as f:
        json.dump(config_dict, f, indent=2, ensure_ascii=False)

    return export_path