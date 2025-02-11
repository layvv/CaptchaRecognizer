from model.char.config import DataSetConfig
from model.char.data.generator import generate_captcha

if __name__ == "__main__":
    total = DataSetConfig.TOTAL_SAMPLES
    ratio = DataSetConfig.TRAIN_RATIO
    train_samples = int(total * ratio)
    val_samples = total - train_samples
    print("\n" + "="*40)
    print("🚀 开始生成验证码数据集")
    print(f"总样本数：{total} (训练集：{train_samples} | 验证集：{val_samples})")
    print("="*40 + "\n")
    generate_captcha(
        save_dir='train',
        start_idx=0,
        num_samples=train_samples
    )
    generate_captcha(
        save_dir='val',
        start_idx=0,
        num_samples=val_samples
    )
