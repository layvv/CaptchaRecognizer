import os
import random

from PIL import Image, ImageDraw, ImageFilter
from captcha.image import ImageCaptcha
from tqdm import tqdm

from model.char.config import DataSetConfig
from model.char.utils import clear_dir, load_fonts


def generate_captcha(save_dir='train', start_idx=0, num_samples=0):
    """生成验证码图片"""
    save_path = os.path.join(DataSetConfig.DATA_ROOT, save_dir)
    width=DataSetConfig.IMAGE_SIZE[0]
    height=DataSetConfig.IMAGE_SIZE[1]
    augment = DataSetConfig.AUGMENT

    # 清空目录
    clear_dir(save_path)

    # 初始化ImageCaptcha
    image_generator = ImageCaptcha(
        width=width,
        height=height,
        fonts=load_fonts(os.path.join(DataSetConfig.DATA_ROOT, 'fonts')),
        font_sizes=(int(height * 0.8), int(height * 0.85), int(height * 0.9))
    )
    
    for i in tqdm(range(start_idx, start_idx + num_samples), desc=f'📁 Generating {save_dir}', unit='img'):
        # 生成验证码文本
        captcha_text = ''.join(random.choices(DataSetConfig.CHAR_SET, k=DataSetConfig.CAPTCHA_LENGTH))
        
        # 使用captcha库生成基础图片
        img = image_generator.generate_image(captcha_text)
        draw = ImageDraw.Draw(img)  # 获取Draw对象用于后续增强
        
        # 添加干扰
        num_lines = random.randint(3, 8)  # 随机5-10条干扰线
        for _ in range(num_lines):
            x1 = random.randint(0, width)
            y1 = random.randint(0, height)
            x2 = random.randint(0, width)
            y2 = random.randint(0, height)
            draw.line([(x1,y1), (x2,y2)], 
                     fill=(random.randint(0,200), random.randint(0,200), random.randint(0,200)),
                     width=1)
        
        # 添加高斯模糊
        if random.random() < augment['blur_prob']:
            img = img.filter(ImageFilter.GaussianBlur(radius=1))
        
        # 添加随机旋转
        if random.random() < augment['rotation_prob']:
            angle = random.uniform(-augment['rotation_range'], augment['rotation_range'])
            img = img.rotate(angle, resample=Image.Resampling.BILINEAR, expand=False, fillcolor=(255,255,255))
        
        # 添加椒盐噪声
        if random.random() < augment['noise_prob']:
            pixels = img.load()
            for _ in range(int(0.01 * width * height)):
                x = random.randint(0, width-1)
                y = random.randint(0, height-1)
                pixels[x, y] = (0, 0, 0) if random.random() < 0.5 else (255, 255, 255)

        
        # 在保存前添加质量检查
        filename = f"{i:06d}_{captcha_text}.png"
        if captcha_text != filename.split('_')[1].split('.')[0]:
            raise ValueError("标签不匹配!")

        
        # 保存文件时添加验证
        full_path = os.path.join(save_path, filename)
        try:
            img.save(full_path)
        except Exception as e:
            print(f"❌ 保存失败：{filename} - {str(e)}")
            continue
    
    print(f"\n✅ {save_dir.upper()}集生成完成")
    print(f"📁 路径：{os.path.abspath(save_path)}")
    print(f"📊 数量：{len(os.listdir(save_path))}个样本\n")

