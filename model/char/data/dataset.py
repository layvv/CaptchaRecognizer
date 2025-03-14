import os
import random
from typing import Optional, Tuple

import torch
from PIL import Image
from torch.utils.data import Dataset
from torchvision import transforms

from model.char.config import config


def preprocess(img: Image.Image) -> Image.Image:
    """预处理图像，转为灰度图"""
    if img.mode != 'L':
        return img.convert('L')
    return img

def resize(img: Image.Image) -> Image.Image:
    """保持比例调整尺寸"""
    target_width, target_height = config.IMAGE_SIZE
    original_width, original_height = img.size
    
    # 计算等比缩放宽度
    new_width = int(original_width * (target_height / original_height))
    img_resized = img.resize((new_width, target_height), Image.Resampling.BILINEAR)
    
    # 创建新图像
    new_img = Image.new('L', (target_width, target_height), random.randint(220, 255))
    
    # 粘贴图像（居中）
    if new_width <= target_width:
        paste_pos = ((target_width - new_width) // 2, 0)
        new_img.paste(img_resized, paste_pos)
    else:
        crop_left = (new_width - target_width) // 2
        crop_right = crop_left + target_width
        new_img.paste(img_resized.crop((crop_left, 0, crop_right, target_height)), (0, 0))
    
    return new_img


class CaptchaDataset(Dataset):
    """验证码数据集"""
    
    # 训练集增强变换
    train_transform = transforms.Compose([
        transforms.Lambda(preprocess),
        transforms.RandomAffine(
            degrees=config.AUGMENTATION['rotation_range'],
            scale=(1-config.AUGMENTATION['zoom_range'], 1+config.AUGMENTATION['zoom_range']),
            fill=random.randint(220, 255)
        ),
        transforms.RandomPerspective(
            distortion_scale=config.AUGMENTATION['distortion_scale'],
            p=0.3,
            fill=random.randint(220, 255)
        ),
        transforms.ColorJitter(
            brightness=config.AUGMENTATION['brightness_range'],
            contrast=config.AUGMENTATION['contrast_range']
        ),
        transforms.Lambda(resize),
        transforms.ToTensor(),
        transforms.Normalize(mean=[0.5], std=[0.5])
    ])
    
    # 验证集变换
    valid_transform = transforms.Compose([
        transforms.Lambda(preprocess),
        transforms.Lambda(resize),
        transforms.ToTensor(),
        transforms.Normalize(mean=[0.5], std=[0.5])
    ])
    
    def __init__(self, mode: str = 'train', num_samples: int = config.TOTAL_SAMPLES) -> None:
        """
        初始化数据集
        
        Args:
            mode: 数据集模式，'train', 'valid', 或 'test'
            num_samples: 样本数量限制，None表示使用全部样本
        """
        self.mode = mode
        self.image_dir = os.path.join(config.DATA_ROOT, mode)
        
        # 确保目录存在
        if not os.path.exists(self.image_dir):
            if mode == 'test':
                # 测试目录不存在时自动创建
                os.makedirs(self.image_dir, exist_ok=True)
                print(f"测试目录已创建: {self.image_dir}")
                print(f"请将测试图像放入该目录")
                self.image_files = []
                return
            else:
                raise FileNotFoundError(f"数据目录不存在：{self.image_dir}，请先生成数据集")
        
        # 获取图像文件列表 (.png, .jpg, .jpeg)
        self.image_files = [f for f in os.listdir(self.image_dir) 
                           if f.lower().endswith(('.png', '.jpg', '.jpeg'))]
        
        # 限制样本数
        if num_samples and num_samples < len(self.image_files):
            import random
            random.shuffle(self.image_files)
            self.image_files = self.image_files[:num_samples]

    def __len__(self) -> int:
        return len(self.image_files)
    
    def __getitem__(self, idx: int) -> Tuple[torch.Tensor, torch.Tensor]:
        image_path = os.path.join(self.image_dir, self.image_files[idx])
        image = Image.open(image_path)
        
        # 解析标签 - 对测试集特殊处理
        # 从文件名解析标签（train/valid格式: index_label.ext, test: label.ext）
        if self.mode != 'test':
            label_str = self.image_files[idx].split('_')[1].split('.')[0]
        else:
            label_str = self.image_files[idx].split('.')[0]
        # 确保标签长度正确
        if len(label_str) != config.CAPTCHA_LENGTH:
            raise ValueError(f"标签长度错误：{label_str}，应为 {config.CAPTCHA_LENGTH} 个字符")
        label = [config.CHAR_SET.index(c) for c in label_str]
        
        # 应用变换
        transform = self.train_transform if self.mode == 'train' else self.valid_transform
        return transform(image), torch.tensor(label)