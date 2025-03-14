import math
import os
import random
from typing import List, Optional

from PIL import Image, ImageDraw, ImageFont
from tqdm import tqdm

from model.char.config import config


class Generator:
    """验证码生成器"""
    
    def __init__(self):
        """初始化验证码生成器"""
        self.fonts = self._load_fonts()
        self.char_set = config.CHAR_SET
        self.length = config.CAPTCHA_LENGTH
    
    def _load_fonts(self) -> List[str]:
        """加载字体文件"""
        font_dir = os.path.join(config.DATA_ROOT, 'fonts')
        if not os.path.exists(font_dir):
            raise FileNotFoundError(f"字体目录不存在：{font_dir}")
        
        font_files = []
        for filename in os.listdir(font_dir):
            if filename.lower().endswith(('.ttf', '.otf')):
                font_files.append(os.path.join(font_dir, filename))
        
        if not font_files:
            raise FileNotFoundError(f"未找到任何字体文件，请在 {font_dir} 中添加TTF或OTF字体")
        
        return font_files
    
    def generate(self, total_samples: Optional[int] = None):
        """生成数据集
        
        Args:
            total_samples: 总样本数，默认使用配置中的值
        """
        if total_samples is None:
            total_samples = config.TOTAL_SAMPLES
            
        # 创建目录
        train_dir = os.path.join(config.DATA_ROOT, 'train')
        valid_dir = os.path.join(config.DATA_ROOT, 'valid')
        os.makedirs(train_dir, exist_ok=True)
        os.makedirs(valid_dir, exist_ok=True)
        
        # 清空目录
        for dir_path in [train_dir, valid_dir]:
            for file in os.listdir(dir_path):
                file_path = os.path.join(dir_path, file)
                if os.path.isfile(file_path):
                    os.unlink(file_path)
        
        # 计算训练集和验证集数量
        train_count = int(total_samples * config.TRAIN_RATIO)
        valid_count = total_samples - train_count
        
        print(f"🚀 开始生成数据集...")
        print(f"📊 训练集: {train_count} 样本")
        print(f"📊 验证集: {valid_count} 样本")
        
        # 生成数据集
        self._generate(train_dir, train_count, "训练集")
        self._generate(valid_dir, valid_count, "验证集")
        
        print("✅ 数据集生成完成!")
    
    def _generate(self, output_dir: str, count: int, desc: str):
        """生成指定数量的样本
        
        Args:
            output_dir: 输出目录
            count: 样本数量
            desc: 进度条描述
        """
        for i in tqdm(range(count), desc=f"生成{desc}", unit="样本"):
            # 生成随机文本
            text = ''.join(random.choices(self.char_set, k=self.length))
            
            # 生成验证码图像
            image = self._generate_image(text)
            
            # 保存图像
            image_path = os.path.join(output_dir, f"{i:05d}_{text}.png")
            image.save(image_path)
    
    def _generate_image(self, text: str) -> Image.Image:
        """生成验证码图像
        
        Args:
            text: 验证码文本
            
        Returns:
            PIL.Image: 生成的验证码图像
        """
        # 设置图像参数
        height = random.randint(30, 50)
        bg_color = tuple(random.randint(220, 255) for _ in range(3))
        text_box_height = height
        font_size = int(text_box_height * random.uniform(0.65, 0.85))
        font = ImageFont.truetype(random.choice(self.fonts), font_size)
        
        # 生成字符图像
        char_imgs = []
        for char in text:
            # 字符颜色
            font_color = tuple(random.randint(0, 200) for _ in range(3))
            
            # 字符图像
            char_width = math.ceil(font.getlength(char))
            char_img = Image.new('RGBA', (char_width, text_box_height), (0, 0, 0, 0))
            char_draw = ImageDraw.Draw(char_img)
            
            # 绘制字符（随机位置）
            y_offset = random.randint(0, int(text_box_height*0.1) + 1)
            char_draw.text((0, y_offset), char, font=font, fill=font_color)
            
            # 应用随机旋转
            angle = random.uniform(-15, 15)
            char_img = char_img.rotate(angle, expand=True, resample=Image.Resampling.BILINEAR)
            
            char_imgs.append(char_img)
        
        # 计算图像尺寸
        width = sum(img.width for img in char_imgs)
        height = max(img.height for img in char_imgs)
        
        # 创建背景图像
        image = Image.new('RGB', (width, height), bg_color)
        
        # 粘贴字符
        x = 0
        for char_img in char_imgs:
            image.paste(char_img, (x, 0), char_img)
            x += char_img.width
        
        # 添加噪点
        pixels = image.load()
        for _ in range(0,int(width * height * 0.01)):
            x = random.randint(0, width - 1)
            y = random.randint(0, height - 1)
            pixels[x, y] = tuple(random.randint(0, 255) for _ in range(3))
        
        # 添加干扰线
        draw = ImageDraw.Draw(image)
        for _ in range(random.randint(0, 3)):
            line_color = tuple(random.randint(0, 200) for _ in range(3))
            points = []
            for _ in range(random.randint(2, 3)):
                points.append((random.randint(0, width), random.randint(0, height)))
            draw.line(points, fill=line_color, width=1)
        
        return image 