import os
import json
import threading
import time
import shutil
import platform
import torch
import psutil

from model.char.config import config


def save_checkpoint(model):
    """保存检查点
    
    Args:
        model: 模型
        experiment_dir: 实验目录
        epoch: 当前轮次
        accuracy: 准确率
    """
    # 删除之前的检查点
    experiment_dir = model.experiment_dir
    epoch = model.current_epoch
    accuracy = model.val_accs[-1]

    for file in os.listdir(experiment_dir):
        if file.endswith('.pth'):
            os.remove(os.path.join(experiment_dir, file))
    
    # 创建新检查点文件名
    checkpoint_path = os.path.join(
        experiment_dir,
        f"{model.model_type}_epoch{epoch}_acc{accuracy:.4f}.pth"
    )
    
    # 保存状态
    state = {
        'epoch': epoch,
        'model_state_dict': model.state_dict(),
        'model_type': model.model_type,
        'accuracy': accuracy,
        'date': time.strftime('%Y-%m-%d %H:%M:%S'),
        'config': {k: v for k, v in vars(config).items() if not k.startswith('_')}
    }
    
    torch.save(state, checkpoint_path)
    print(f"检查点已保存: {checkpoint_path}")
    
    return checkpoint_path


def save_final_model(model):
    """保存最终模型
    
    Args:
        model: 模型
    """
    # 确保导出目录存在
    os.makedirs(config.EXPORT_ROOT, exist_ok=True)
    
    # 如果发生早停，使用最佳checkpoint
    if model.early_stop:
        print(f"检测到早停，导出最佳模型 (准确率: {model.best_val_acc*100:.2f}%)")
        # 找到checkpoint目录中最佳模型
        experiment_dir = model.experiment_dir
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
                f"{model.model_type}_best_acc{best_acc:.4f}.pth"
            )
            shutil.copy(checkpoint_path, export_path)
            print(f"最佳模型已导出至: {export_path}")
            return
    
    # 没有早停，保存当前模型
    export_path = os.path.join(
        config.EXPORT_ROOT,
        f"{model.model_type}_final_acc{model.best_val_acc:.4f}.pth"
    )
    
    # 保存状态
    state = {
        'epoch': model.current_epoch,
        'model_state_dict': model.state_dict(),
        'model_type': model.model_type,
        'accuracy': model.best_val_acc,
        'date': time.strftime('%Y-%m-%d %H:%M:%S'),
        'config': {k: v for k, v in vars(config).items() if not k.startswith('_')}
    }
    
    torch.save(state, export_path)
    print(f"最终模型已导出至: {export_path}")
    
    # 保存配置信息
    config_path = os.path.join(config.EXPORT_ROOT, f"{model.model_type}_config.json")
    config_dict = {
        'model': {
            'type': model.model_type,
            'class': model.__class__.__name__,
            'module': model.__class__.__module__,
        },
        'training': {
            'batch_size': config.BATCH_SIZE,
            'optimizer': config.OPTIMIZER,
            'learning_rate': config.LEARNING_RATE,
            'weight_decay': config.WEIGHT_DECAY,
            'scheduler': config.LR_SCHEDULER,
            'epochs': config.EPOCHS,
            'early_stopping': config.EARLY_STOPPING,
            'patience': config.PATIENCE
        },
        'dataset': {
            'char_set': config.CHAR_SET,
            'num_classes': config.NUM_CLASSES,
            'captcha_length': config.CAPTCHA_LENGTH,
            'image_size': config.IMAGE_SIZE
        },
        'system': {
            'timestamp': time.strftime('%Y-%m-%d %H:%M:%S'),
            'pytorch_version': torch.__version__,
            'cuda_available': torch.cuda.is_available(),
            'gpu_name': torch.cuda.get_device_name(0) if torch.cuda.is_available() else 'N/A',
            'platform': platform.platform(),
            'cpu_count': os.cpu_count(),
            'memory': f"{psutil.virtual_memory().total / (1024**3):.1f}GB"
        }
    }
    
    # 添加训练结果
    if hasattr(model, 'best_val_acc') and model.best_val_acc > 0:
        config_dict['results'] = {
            'best_accuracy': model.best_val_acc,
            'best_loss': model.best_val_loss,
            'training_epochs': len(model.train_losses),
            'stopped_early': model.early_stop
        }
    
    # 保存为JSON
    with open(config_path, 'w', encoding='utf-8') as f:
        json.dump(config_dict, f, indent=2, ensure_ascii=False)
    
    return export_path


def load_model(model_path=None):
    """加载模型
    
    Args:
        model_path: 模型路径，None使用最新模型
        
    Returns:
        加载的模型
    """
    # 如果未指定路径，寻找最新模型
    if model_path is None:
        if not os.path.exists(config.EXPORT_ROOT):
            raise FileNotFoundError(f"未找到导出目录: {config.EXPORT_ROOT}")
            
        models = [f for f in os.listdir(config.EXPORT_ROOT) if f.endswith('.pth')]
        if not models:
            raise FileNotFoundError(f"未找到导出模型")
            
        # 按照准确率排序
        models.sort(key=lambda x: float(x.split('_acc')[-1].split('.pth')[0]), reverse=True)
        model_path = os.path.join(config.EXPORT_ROOT, models[0])
        
    # 加载模型
    if not os.path.exists(model_path):
        raise FileNotFoundError(f"模型文件不存在: {model_path}")
        
    # 加载状态
    state = torch.load(model_path, map_location='cpu')
    
    # 获取模型类
    from model.char.models import get_model
    model = get_model(state.get('model_type', config.MODEL_TYPE))
    
    # 加载权重
    model.load_state_dict(state['model_state_dict'])
    model.eval()
    
    return model 