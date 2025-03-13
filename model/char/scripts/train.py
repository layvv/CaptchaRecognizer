import argparse
import os
import time
from typing import List

from PIL import Image
from torchvision import transforms

from model.char.config import config
from model.char.data.dataset import resize, preprocess
from model.char.models import get_model
from model.char.utils.model_util import load_model


def train_model(num_samples=None):
    """训练验证码识别模型
    
    Args:
        num_samples: 限制样本数量（用于调试）
    
    Returns:
        训练好的模型
    """
    
    # 创建模型
    model = get_model(config.MODEL_TYPE)
    
    # 打印配置信息
    print(f"\n🚀 开始训练 {model.model_type.upper()} 模型")
    print(f"📊 训练参数:")
    print(f"   - 设备: {model.device}")
    print(f"   - 训练轮数: {config.EPOCHS}")
    print(f"   - 批大小: {config.BATCH_SIZE}")
    print(f"   - 优化器: {config.OPTIMIZER}")
    print(f"   - 学习率: {config.LEARNING_RATE}")
    print(f"   - 验证码长度: {config.CAPTCHA_LENGTH}")
    print(f"   - 字符集大小: {config.NUM_CLASSES}")
    
    # 开始训练
    start_time = time.time()
    model.train_model(num_samples=num_samples)
    training_time = time.time() - start_time
    
    # 打印训练结果
    print(f"\n✅ 训练完成！")
    print(f"⏱️ 训练时间: {training_time:.2f}秒")
    print(f"📈 最佳验证准确率: {model.best_val_acc*100:.2f}%")


def main():
    # 执行对应命令
    train_model()

def check_image():
    test_images = []
    test_image_dir = os.path.join(config.DATA_ROOT, 'valid')
    for image_file in os.listdir(test_image_dir):
        if image_file.endswith('.png') or image_file.endswith('.jpg'):
            test_images.append(os.path.join(test_image_dir, image_file))

    valid_transform = transforms.Compose([
        transforms.Lambda(preprocess),
        transforms.Lambda(resize),
    ])
    for image_path in test_images:
        img = valid_transform(Image.open(image_path))
        img.show()
        time.sleep(2)

if __name__ == '__main__':
    main()
    # check_image()