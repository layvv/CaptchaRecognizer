import os
import random
import math

import numpy as np
from PIL import Image, ImageDraw, ImageFont, ImageFilter
from captcha.image import ImageCaptcha
from torchvision import transforms
from tqdm import tqdm

from model.char.config import DataSetConfig
from model.char.utils import clear_dir, load_fonts


class CaptchaGenerator:
    """统一验证码生成器"""

    def __init__(self):
        # 初始化配置
        self.fonts = load_fonts(os.path.join(DataSetConfig.DATA_ROOT, 'fonts'))
        self.char_set = DataSetConfig.CHAR_SET
        self.length = DataSetConfig.CAPTCHA_LENGTH

    def generate_dataset(self):
        train_path = os.path.join(DataSetConfig.DATA_ROOT, 'train')
        valid_path = os.path.join(DataSetConfig.DATA_ROOT, 'valid')
        # 清理目录
        clear_dir(train_path)
        clear_dir(valid_path)

        total_samples = DataSetConfig.TOTAL_SAMPLES

        train_samples = int(total_samples * 0.8)
        self._generate_batch('train', 0, train_samples)
        self._generate_batch('valid', train_samples, total_samples - train_samples)

    def _generate_batch(self, mode, start, num_samples):
        """生成指定模式的批次数据"""
        save_path = os.path.join(DataSetConfig.DATA_ROOT, mode)

        for i in tqdm(range(start, start + num_samples), desc=f'Generating {mode}', unit='img'):
            text = ''.join(random.choices(self.char_set, k=self.length))
            image = self._generate_base_image(text)  # 增强已集成到生成方法中

            # 保存到对应目录
            filename = f"{i:05d}_{text}.png"
            image.save(os.path.join(save_path, filename))

    def _generate_base_image(self, text):
        """生成基础图像（多方法随机选择）"""
        # generator = random.choice([self._lib_generate, self._manual_generate])
        # return generator(text)
        return self._manual_generate(text)

    def _lib_generate(self, text):
        height = np.random.randint(50, 100)
        width = int(height * random.uniform(2.5, 3.5))
        # 库生成方法保持纯净，不应用任何增强
        image = ImageCaptcha(
            width=width,
            height=height,
            fonts=self.fonts,
            font_sizes=tuple([int(height * random.uniform(0.75, 0.9)) for _ in range(10)])
        ).generate_image(text)
        return image

    def _manual_generate(self, text):
        height = np.random.randint(30, 120)
        width = int(height * random.uniform(2.2, 3.5))
        bg_color = (random.randint(220, 255), random.randint(220, 255), random.randint(220, 255))
        image = Image.new('RGB', (width, height), bg_color)
        draw = ImageDraw.Draw(image)

        # 字符绘制边距
        margin = int(height * 0.05)  # 5%的边距
        text_box_width = width - margin * 2
        text_box_height = height

        # 生成字符图片
        char_imgs = []
        for i, char in enumerate(text):
            font_color = (random.randint(0, 100), random.randint(0, 100), random.randint(0, 100))
            font_size = int(text_box_height * random.uniform(0.7, 0.85))
            font = ImageFont.truetype(random.choice(self.fonts), font_size)
            # 创建字符画布
            char_box_width = math.ceil(font.getlength(char))
            char_box_height = text_box_height
            char_img = Image.new('RGBA', (char_box_width, char_box_height), (0, 0, 0, 0))
            char_draw = ImageDraw.Draw(char_img)

            char_x = 0
            # y轴方向随机绘制字符
            char_margin_top = (char_box_height - font_size) // 2
            char_y = char_margin_top + random.uniform(-char_margin_top, char_margin_top)

            char_draw.text((char_x, char_y), char, font=font, fill=font_color)

            # 旋转
            angle = random.uniform(-15, 15)
            char_img = char_img.rotate(angle, expand=True)

            char_imgs.append(char_img)

        total_char_width = sum([char_img.width for char_img in char_imgs])
        avg_space = (text_box_width - total_char_width) / len(text)
        avg_width = sum([char_img.width for char_img in char_imgs])
        # 向image中添加字符
        x = 0
        for i, char_img in enumerate(char_imgs):
            x += random.uniform(-avg_space*0.5, avg_space*0.5)
            # 如果当前图片的宽度超过平均宽度，那么需要减小x的值
            if char_img.width > avg_width:
                x -= (char_img.width - avg_width) * 0.5
            # 如果超出左边界，则x值设为左边界
            if x < margin:
                x = margin
            # 右侧超出忽略margin
            if x + char_img.width > width:
                x = width - char_img.width
            image.paste(char_img, (int(x), 0), char_img)
            x += char_img.width

        # 对低分辨率图片进行处理
        if height < 50:
            # 放大图片重采样
            image = image.resize((int(width * 1.5), int(height * 1.5)), Image.Resampling.LANCZOS)
            # 平滑处理
            image.filter(ImageFilter.SMOOTH_MORE)
            # 缩小回原尺寸
            image = image.resize((width, height), Image.Resampling.LANCZOS)

        # 透视变换
        image = transforms.RandomPerspective(
            distortion_scale=0.3,
            p=0.5,
            fill=bg_color
        )(image)
        pixels = image.load()
        # 随机像素噪点
        for _ in range(int(width * height * 0.02)):  # 2%像素点
            x = random.randint(0, width - 1)
            y = random.randint(0, height - 1)
            pixels[x, y] = (random.randint(0, 255), random.randint(0, 255), random.randint(0, 255))

        # 贝赛尔曲线
        def draw_bezier_curve(points, num_points=5):
            def binomial(n, k):
                """二项式系数"""
                result = 1
                for i in range(1, k+1):
                    result = result * (n-i+1) / i
                return result

            def bezier(t, points):
                """根据t值计算贝塞尔曲线上的一点"""
                n = len(points) - 1
                x = y = 0
                for i, point in enumerate(points):
                    bernstein = binomial(n, i) * t**i * (1-t)**(n-i)
                    x += point[0] * bernstein
                    y += point[1] * bernstein
                return x, y

            # 计算曲线上的一系列点
            curve_points = [bezier(t/num_points, points) for t in range(num_points)]

            # 将点连接起来形成曲线
            draw.line(curve_points, fill=tuple([ random.randint(80, 230) for _ in range(3)]),
                      width= 1 if height < 60 else 2)

        # # 添加干扰线
        draw = ImageDraw.Draw(image)
        for _ in range(random.randint(3, 5)):
            control_points = [(random.randint(0, width), random.randint(0, height)) for _ in range(random.randint(2,6))]
            draw_bezier_curve(control_points)

        # 高斯模糊
        if random.random() < 0.2:
            image = image.filter(ImageFilter.GaussianBlur(radius=random.uniform(0.8, 1)))
        # 颜色抖动
        if random.random() < 0.8:
            image = transforms.ColorJitter(0.2, 0.2, 0.2)(image)

        return image
