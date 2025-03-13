import argparse
import os
import time

from PIL import Image
from torchvision import transforms

from model.char.config import config
from model.char.data.dataset import resize, preprocess
from model.char.models import get_model


def train_model(model_type=None, epochs=None, batch_size=None, learning_rate=None):
    """训练验证码识别模型
    
    Args:
        model_type: 模型类型，None使用配置中的默认值
        epochs: 训练轮次，None使用配置中的默认值
        batch_size: 批量大小，None使用配置中的默认值
        learning_rate: 学习率，None使用配置中的默认值
    """
    # 更新配置
    if model_type:
        config.MODEL_TYPE = model_type
    if epochs:
        config.EPOCHS = epochs
    if batch_size:
        config.BATCH_SIZE = batch_size
    if learning_rate:
        config.LEARNING_RATE = learning_rate
    
    # 获取模型
    model = get_model(config.MODEL_TYPE)
    
    # 打印训练信息
    print(f"\n🚀 开始训练 {model.model_type} 模型")
    print(f"📊 训练配置:")
    print(f"   - 模型类型: {model.model_type}")
    print(f"   - 训练轮次: {config.EPOCHS}")
    print(f"   - 批量大小: {config.BATCH_SIZE}")
    print(f"   - 学习率: {config.LEARNING_RATE}")
    print(f"   - 验证码长度: {config.CAPTCHA_LENGTH}")
    print(f"   - 字符集大小: {config.NUM_CLASSES}")
    
    # 开始训练
    start_time = time.time()
    model.train_model()
    training_time = time.time() - start_time
    
    # 打印训练结果
    print(f"\n✅ 训练完成！")
    print(f"⏱️ 训练时间: {training_time:.2f}秒")
    
    return model


def main():
    """命令行入口"""
    parser = argparse.ArgumentParser(description='验证码识别模型训练')
    parser.add_argument('--model', type=str, default=None, choices=['cnn', 'resnet', 'crnn'],
                        help='模型类型: cnn, resnet, crnn')
    parser.add_argument('--epochs', type=int, default=None,
                        help='训练轮次')
    parser.add_argument('--batch-size', type=int, default=None,
                        help='批量大小')
    parser.add_argument('--lr', type=float, default=None,
                        help='学习率')
    
    args = parser.parse_args()
    
    train_model(args.model, args.epochs, args.batch_size, args.lr)

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
    # main()
    check_image()