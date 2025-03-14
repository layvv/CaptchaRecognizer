import os

from model.char.config import config
from model.char.executors.generator import Generator


if __name__ == '__main__':
    # 初始化生成器
    generator = Generator()

    # 打印信息
    print(f"\n🚀 开始生成验证码数据集")
    print(f"📊 生成配置:")
    print(f"   - 样本总数: {config.TOTAL_SAMPLES}")
    print(f"   - 训练集比例: {config.TRAIN_RATIO}")
    print(f"   - 验证码长度: {config.CAPTCHA_LENGTH}")
    print(f"   - 字符集大小: {config.NUM_CLASSES}")
    print(f"   - 图像大小: {config.IMAGE_SIZE}")

    # 生成数据集
    generator.generate(config.TOTAL_SAMPLES)

    # 打印结果
    train_dir = os.path.join(config.DATA_ROOT, 'train')
    valid_dir = os.path.join(config.DATA_ROOT, 'valid')

    train_samples = len(os.listdir(train_dir)) if os.path.exists(train_dir) else 0
    valid_samples = len(os.listdir(valid_dir)) if os.path.exists(valid_dir) else 0

    print(f"\n✅ 数据集生成完成！")
    print(f"📁 训练集: {train_samples}个样本")
    print(f"📁 验证集: {valid_samples}个样本")
    print(f"📂 数据目录: {config.DATA_ROOT}")