import os
import argparse
from model.char_input.data.generator import CaptchaGenerator
from model.char_input.config import config


def generate_dataset(total_samples=None, train_ratio=None):
    """生成验证码数据集
    
    Args:
        total_samples: 样本总数，None使用配置中的默认值
        train_ratio: 训练集比例，None使用配置中的默认值
    """
    # 更新配置
    if total_samples:
        config.TOTAL_SAMPLES = total_samples
    if train_ratio:
        config.TRAIN_RATIO = train_ratio
    
    # 初始化生成器
    generator = CaptchaGenerator()
    
    # 打印信息
    print(f"\n🚀 开始生成验证码数据集")
    print(f"📊 生成配置:")
    print(f"   - 样本总数: {config.TOTAL_SAMPLES}")
    print(f"   - 训练集比例: {config.TRAIN_RATIO}")
    print(f"   - 验证码长度: {config.CAPTCHA_LENGTH}")
    print(f"   - 字符集大小: {config.NUM_CLASSES}")
    print(f"   - 图像大小: {config.IMAGE_SIZE}")
    
    # 生成数据集
    generator.generate_dataset(
        total_samples=config.TOTAL_SAMPLES
    )
    
    # 打印结果
    train_dir = os.path.join(config.DATA_ROOT, 'train')
    valid_dir = os.path.join(config.DATA_ROOT, 'valid')
    
    train_samples = len(os.listdir(train_dir)) if os.path.exists(train_dir) else 0
    valid_samples = len(os.listdir(valid_dir)) if os.path.exists(valid_dir) else 0
    
    print(f"\n✅ 数据集生成完成！")
    print(f"📁 训练集: {train_samples}个样本")
    print(f"📁 验证集: {valid_samples}个样本")
    print(f"📂 数据目录: {config.DATA_ROOT}")
    
    return train_samples, valid_samples


def main():
    """命令行入口"""
    parser = argparse.ArgumentParser(description='验证码数据集生成')
    parser.add_argument('--samples', type=int, default=None,
                        help='样本总数')
    parser.add_argument('--train-ratio', type=float, default=None,
                        help='训练集比例，0-1之间')
    
    args = parser.parse_args()
    
    if args.train_ratio and (args.train_ratio <= 0 or args.train_ratio >= 1):
        parser.error("训练集比例必须在0-1之间")
    
    generate_dataset(args.samples, args.train_ratio)


if __name__ == '__main__':
    main() 