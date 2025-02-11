import os
import shutil

from matplotlib import pyplot as plt

from model.char.config import CheckpointConfig


def clear_dir(path):
    # 清空目录前验证
    if os.path.exists(path):
        print(f"♻️ 清空已有数据：{path} (共{len(os.listdir(path))}个旧样本)")
        shutil.rmtree(path)  # 删除整个目录树
        os.mkdir(path)  # 重新创建目录
    else:
        print(f"📁 目录不存在，已重新创建: {path}")
        os.mkdir(path)  # 重新创建目录

def load_fonts(font_dir):
    """加载字体文件"""
    fonts = []
    for filename in os.listdir(font_dir):
        if filename.endswith('.ttf'):
            fonts.append(os.path.join(font_dir, filename))
    return fonts

def create_experiment_dir(model_name, model_params):
    """创建实验目录"""
    from datetime import datetime
    params = {
        'model_name': model_name,
        'batch_size': model_params['batch_size'],
        'lr': model_params['lr'],
        'timestamp': datetime.now().strftime("%Y%m%d_%H%M%S")
    }
    dir_name = CheckpointConfig.EXPERIMENT_FORMAT.format(**params)
    exp_dir = os.path.join(CheckpointConfig.CHECKPOINT_ROOT, dir_name)
    os.makedirs(exp_dir, exist_ok=True)
    return exp_dir

def save_checkpoint(model, epoch):
    """检查点保存"""
    import json
    import torch

    # 保存模型参数
    model_name = model.name if hasattr(model, 'name') else model.__class__.__name__
    suffix = ''
    # 如果训练轮次小于总轮次，则为模型名添加轮次信息；如果训练早停，不会进入该函数
    if epoch < model.epochs:
        suffix = f'_{epoch}'
    model_path = os.path.join(model.experiment_dir, f'{model_name}{suffix}.pth')
    state = {
        'model_state_dict': model.state_dict(),
        'learning_rates': model.learning_rates if hasattr(model,'learning_rates') else None,
        'epoch': epoch,
        'batch_size': model.batch_size if hasattr(model, 'batch_size') else None,
        'optimizer_state_dict': model.optimizer.state_dict() if hasattr(model, 'optimizer') else None,
        'scheduler_state_dict': model.scheduler.state_dict() if hasattr(model, 'scheduler') else None,
        'train_losses': model.train_losses if hasattr(model, 'train_losses') else None,
        'train_accs': model.train_accs if hasattr(model, 'train_accs') else None,
        'val_losses': model.val_losses if hasattr(model, 'val_losses') else None,
        'val_accs': model.val_accs if hasattr(model, 'val_accs') else None,
        'best_val_acc': f"{max(model.val_accs)*100:.2f}%" if model.val_accs else None,
        'early_stop': {
            'patience': model.early_stop_patience if hasattr(model, 'early_stop_patience') else None,
            'delta': model.early_stop_delta if hasattr(model, 'early_stop_delta') else None,
            'no_improve_counter': model.no_improve_counter if hasattr(model, 'no_improve_counter') else None
        },
        'hardware_info': {
            'device': str(model.device),
            'num_workers': model.num_workers if hasattr(model, 'num_workers') else None,
            'cuda_version': torch.version.cuda if torch.cuda.is_available() else None
        },
        'confusion_matrix': model.confusion_matrix if hasattr(model, 'confusion_matrix') else None,
    }
    torch.save(state, model_path)
    
    # 保存训练配置
    config_path = os.path.join(model.experiment_dir, 'train_config.json')
    with open(config_path, 'w') as f:
        json.dump({
            'mode_name': model.name if model.name else model.__class__.__name__,
            'learning_rates': model.learning_rates if hasattr(model,'learning_rates') else None,
            'epoch/epochs': f'{epoch}/{model.epochs}',
            'batch_size': model.batch_size if hasattr(model, 'batch_size') else None,
            'optimizer_state_dict': model.optimizer.__class__.__name__ if hasattr(model, 'optimizer') else None,
            'scheduler_state_dict': model.scheduler.__class__.__name__ if hasattr(model, 'scheduler') else None,
            'train_losses': model.train_losses if hasattr(model, 'train_losses') else None,
            'train_accs': model.train_accs if hasattr(model, 'train_accs') else None,
            'val_losses': model.val_losses if hasattr(model, 'val_losses') else None,
            'val_accs': model.val_accs if hasattr(model, 'val_accs') else None,
            'best_val_acc': f"{max(model.val_accs)*100:.2f}%" if model.val_accs else None,
            'early_stop': {
                'patience': model.early_stop_patience if hasattr(model, 'early_stop_patience') else None,
                'delta': model.early_stop_delta if hasattr(model, 'early_stop_delta') else None,
                'no_improve_counter': model.no_improve_counter if hasattr(model, 'no_improve_counter') else None
            },
            'hardware_info': {
                'device': str(model.device),
                'num_workers': model.num_workers if hasattr(model, 'num_workers') else None,
                'cuda_version': torch.version.cuda if torch.cuda.is_available() else None
            },
            'confusion_matrix': model.confusion_matrix if hasattr(model, 'confusion_matrix') else None,
        }, f, indent=2)
    
    # 保存学习曲线
    # plot_learning_curve(
    #     train_losses=model.train_losses,
    #     val_losses=model.val_losses,
    #     val_accs=model.val_accs,
    #     save_path=os.path.join(exp_dir, 'learning_curve.png')
    # )


def plot_learning_curve(train_losses, val_losses, val_accs, save_path):
    """增强版学习曲线"""
    plt.figure(figsize=(12, 6))
    
    # 主Y轴（损失）
    ax1 = plt.gca()
    ax1.plot(train_losses, 'b-', label='Train Loss')
    ax1.plot(val_losses, 'r-', label='Val Loss')
    ax1.set_xlabel('Epochs')
    ax1.set_ylabel('Loss', color='k')
    ax1.tick_params(axis='y', labelcolor='k')
    
    # 次Y轴（准确率）
    if val_accs:
        ax2 = ax1.twinx()
        ax2.plot(val_accs, 'g--', label='Val Acc')
        ax2.set_ylabel('Accuracy (%)', color='g')
        ax2.tick_params(axis='y', labelcolor='g')
        ax2.set_ylim(0, 100)
    
    # 标注关键信息
    plt.title(f'Learning Curve (Best Val Acc: {max(val_accs)*100:.2f}%)')
    plt.grid(True)
    ax1.legend(loc='upper left')
    if val_accs:
        ax2.legend(loc='upper right')
    plt.tight_layout()
    plt.savefig(save_path, dpi=300)
    plt.close()
