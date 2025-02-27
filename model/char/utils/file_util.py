import os
import shutil
import threading
from datetime import datetime
from queue import Queue

import psutil
import torch
from PIL import ImageFont

from model.char.config import CheckpointConfig, BaseConfig


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
    """加载并验证字体文件"""
    valid_fonts = []
    for filename in os.listdir(font_dir):
        font_path = os.path.join(font_dir, filename)
        try:
            # 验证字体有效性
            font = ImageFont.truetype(font_path, size=20)
            valid_fonts.append(font_path)
        except Exception as e:
            print(f"⚠️ 跳过无效字体: {filename} ({str(e)})")
    return valid_fonts


def create_experiment_dir(model_name, model_params):
    """创建实验目录"""
    params = {
        'timestamp': datetime.now().strftime("%Y-%m-%d_%H-%M"),
        'model_name': model_name,
        'batch_size': model_params['batch_size'],
        'lr': model_params['lr'],
    }
    dir_name = CheckpointConfig.EXPERIMENT_FORMAT.format(**params)
    exp_dir = os.path.join(CheckpointConfig.CHECKPOINT_ROOT, dir_name)
    os.makedirs(exp_dir, exist_ok=True)
    return exp_dir


# 全局保存管理类
class SaveManager:
    def __init__(self):
        self.save_queue = Queue()
        self.save_thread = None
        self.lock = threading.Lock()
        self.running = True  # 新增运行状态标志

    def add_task(self, task):
        with self.lock:
            # 确保线程持续运行
            if not self.save_thread or not self.save_thread.is_alive():
                self.save_thread = threading.Thread(target=self._process_queue, daemon=True)
                self.save_thread.start()
            self.save_queue.put(task)

    def _process_queue(self):
        while self.running or not self.save_queue.empty():  # 修改循环条件
            try:
                task = self.save_queue.get()
                task()
            except Exception as e:
                print(f"❌ 保存任务执行失败: {str(e)}")
            finally:
                self.save_queue.task_done()

    def shutdown(self):
        self.running = False
        if self.save_thread:
            self.save_thread.join()

save_manager = SaveManager()

def save_checkpoint(model, epoch):
    """保存准确率更高的模型"""
    if model.val_accs[-1] < model.best_val_acc:
        return
    
    # 将保存任务加入队列
    save_manager.add_task(lambda: _save_checkpoint(model, epoch))

def save_final_model(model):
    """将最终模型保存任务加入队列"""
    save_manager.add_task(lambda: _do_final_save(model))

def _do_final_save(model):
    model_path = None
    for file in os.listdir(model.experiment_dir):
        if file.endswith('.pth'):
            model_path = os.path.join(model.experiment_dir, file)
            break
    if not model_path:
        print("⚠️ 未找到任何检查点文件！")  # 调试日志
        return
    state = torch.load(model_path, map_location=torch.device("cuda" if torch.cuda.is_available() else "cpu"))
    # 清理不需要的键
    for key in ['optimizer_state_dict', 'scheduler_state_dict', 'epoch']:
        if key in state:
            del state[key]
    
    final_model_path = os.path.join(CheckpointConfig.FINAL_DIR, f'{model.name}.pth')
    torch.save(state, final_model_path)
    print(f"💾 最终模型已保存: {final_model_path}")  # 调试日志

def _save_checkpoint(model, epoch):
    # 移除旧模型
    model_files = [f for f in os.listdir(model.experiment_dir) if f.endswith('.pth')]
    for file in model_files:
        os.remove(os.path.join(model.experiment_dir, file))

    # 保存新检查点
    checkpoint_path = os.path.join(
        model.experiment_dir,
        f'{model.name}_epoch{epoch}_acc{model.best_val_acc * 100:.2f}.pth'
    )
    
    state = {
        'model_class' : model.__class__.__name__,
        'model_module': model.__class__.__module__,
        'epoch': epoch,
        'model_state_dict': model.state_dict(),
        'optimizer_state_dict': model.optimizer.state_dict(),
        'scheduler_state_dict': model.scheduler.state_dict(),
    }
    torch.save(state, checkpoint_path)
    
    # 保存配置文件
    save_training_config(model)


def save_training_config(model):
    """独立保存配置的方法"""
    config_path = os.path.join(model.experiment_dir, 'training_config.json')
    config = {
        'model': {
            'name': model.name,
            'class': model.__class__.__name__,
            'conv_dropout': model.conv_dropout,
            'shared_dropout': model.shared_dropout,
            'head_dropout': model.head_dropout,
            'captcha_length': model.captcha_length,
            'num_classes': model.num_classes,
        },
        'training': {
            'batch_size': model.batch_size,
            'epochs': model.epochs,
            'lr': model.lr,
            'weight_decay': model.weight_decay,
            'early_stop_patience': model.early_stop_patience,
            'early_stop_delta': model.early_stop_delta,
            'best_val_loss': model.best_val_loss,
            'best_val_acc': model.best_val_acc,
            'total_epochs': len(model.train_losses),
            'valid_accs': model.val_accs,
            'valid_losses': model.val_losses,
        },
        'dataset': {
            'IMAGE_SIZE': BaseConfig.IMAGE_SIZE,
            'CHAR_SET': BaseConfig.CHAR_SET,
            'CAPTCHA_LENGTH': BaseConfig.CAPTCHA_LENGTH,
            'NUM_CLASSES': BaseConfig.NUM_CLASSES
        },
        'environment': {
            'saved_time': datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
            'device': str(model.device),
            'torch_version': torch.__version__
        }
    }

    import json
    with open(config_path, 'w') as f:
        json.dump(config, f, indent=2, ensure_ascii=False)


def log_startup_info(model):
    """优化后的训练启动信息（聚焦核心参数）"""
    # 核心信息分类
    env_info = {
        "PyTorch Ver": torch.__version__,
        "CUDA Available": "✅" if torch.cuda.is_available() else "❌",
        "GPU Name": torch.cuda.get_device_name(0) if torch.cuda.is_available() else "N/A",
    }

    hardware_info = {
        "CPU Cores": os.cpu_count(),
        "RAM": f"{psutil.virtual_memory().total / 1024 ** 3:.1f}G",
    }

    training_config = {
        "Batch Size": model.batch_size,
        "Init LR": model.lr,
        "Weight Decay": model.weight_decay,
        "Max Epochs": model.epochs,
        "Early Stop": f"{model.early_stop_patience} epochs (Δ<{model.early_stop_delta})",
        "Tracking Positions": model.captcha_length
    }

    dataset_info = {
        "Image Size": BaseConfig.IMAGE_SIZE,
        "Char Length": BaseConfig.CAPTCHA_LENGTH,
        "Char Classes": BaseConfig.NUM_CLASSES,
        "Train Samples": len(model.train_dataset),
        "Valid Samples": len(model.val_dataset)
    }

    model_info = {
        "Backbone": "ResNet",
        "Attention": "SE Block",
        "Total Params": f"{sum(p.numel() for p in model.parameters()) / 1e6:.2f}M"
    }

    # 信息排版
    def format_section(title, items, width=40):
        lines = [f"╞═ {title} ═" + "═" * (width - len(title) - 4)]
        for k, v in items.items():
            line = f"│ {k:<16} {v}"
            lines.append(line.ljust(width - 1) + "│")
        return "\n".join(lines)

    # 构建显示内容
    content = [
        format_section("Environment", env_info),
        format_section("Hardware", hardware_info),
        format_section("Training Config", training_config),
        format_section("Dataset Info", dataset_info),
        format_section("Model Architecture", model_info),
        f"╰──────────────────────────────────────────╯",
        f"📁 Experiment Dir: {model.experiment_dir}"
    ]

    # 打印信息
    print("\n╭────────────────── Training Session ──────────────────╮")
    print("\n".join(content))
