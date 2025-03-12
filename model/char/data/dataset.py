import os
from collections import Counter
from random import sample

import torch
from PIL import Image
from torch.utils.data import Dataset
from torchvision import transforms

from model.char.config import BaseConfig, DataSetConfig


class DynamicFillRandomAffine(transforms.RandomAffine):
    """自定义随机仿射变换，动态获取填充色"""
    def __call__(self, img):
        # 从图像元数据获取背景色
        self.fill = img.info.get('bg_color', 255)
        return super().__call__(img)

class DynamicFillRandomPerspective(transforms.RandomPerspective):
    """自定义随机透视变换，动态获取填充色"""
    def __call__(self, img):
        self.fill = img.info.get('bg_color', 255)
        return super().__call__(img)

class CaptchaDataset(Dataset):
    def __init__(self, num_samples=None, mode='train'):
        self.mode = mode
        self.image_dir = os.path.join(DataSetConfig.DATA_ROOT, mode)
        self.image_files = [f for f in os.listdir(self.image_dir) if f.endswith('.png')]

        # 样本数量控制
        if num_samples and num_samples < DataSetConfig.TOTAL_SAMPLES:
            split_ratio = DataSetConfig.TRAIN_RATIO
            split_size = int(num_samples * split_ratio) if mode == 'train' else num_samples - int(num_samples * split_ratio)
            self.image_files = sample(self.image_files, split_size)

        # 数据增强配置
        self.train_transform = transforms.Compose([
            transforms.Lambda(CaptchaDataset.resize),  # 必须放在第一个位置确保背景色信息存在
            transforms.RandomApply([
                DynamicFillRandomPerspective(
                    distortion_scale=0.1
                ),
                DynamicFillRandomAffine(
                    degrees=5,
                    translate=(0.05, 0.05),
                    scale=(0.8, 1.2),
                    interpolation=transforms.InterpolationMode.BILINEAR,
                )
            ],p=0.5),
            transforms.ColorJitter(brightness=0.2, contrast=0.2),
            transforms.ToTensor(),
            transforms.Normalize(mean=[0.5], std=[0.5])
        ])

        self.valid_transform = transforms.Compose([
            transforms.Lambda(self.resize),
            transforms.ToTensor(),
            transforms.Normalize(mean=[0.5], std=[0.5])
        ])

    def __len__(self):
        return len(self.image_files)

    def __getitem__(self, idx):
        image_path = os.path.join(self.image_dir, self.image_files[idx])
        image = Image.open(image_path).convert('L')

        # 解析标签
        label_str = self.image_files[idx].split('_')[1].split('.')[0]
        label = [BaseConfig.CHAR_SET.index(c) for c in label_str]

        # 应用预处理
        transform = self.train_transform if self.mode == 'train' else self.valid_transform
        return transform(image), torch.tensor(label)

    @staticmethod
    def resize(img: Image.Image):
        """动态调整尺寸并存储背景色"""
        original_width, original_height = img.size
        target_width, target_height = BaseConfig.IMAGE_SIZE

        # 计算等比缩放宽度
        new_width = int(original_width * (target_height / original_height))
        img_resized = img.resize((new_width, target_height), Image.Resampling.BILINEAR)

        # 获取背景色（优化采样逻辑）
        edge_samples = []
        for x in [0, original_width-1]:  # 左右边缘
            for y in range(0, original_height, max(1, original_height//5))[:5]:
                edge_samples.append(img.getpixel((x, y)))
        for y in [0, original_height-1]:  # 上下边缘
            for x in range(0, original_width, max(1, original_width//5))[:5]:
                edge_samples.append(img.getpixel((x, y)))
        bg_color = Counter(edge_samples).most_common(1)[0][0]

        # 创建新图像
        new_img = Image.new('L', (target_width, target_height), bg_color)

        # 填充图像
        if new_width <= target_width:
            paste_pos = ((target_width - new_width) // 2, 0)
            new_img.paste(img_resized, paste_pos)
        else:
            crop_area = ((new_width - target_width)//2, 0,
                         (new_width + target_width)//2, target_height)
            new_img.paste(img_resized.crop(crop_area), (0, 0))

        # 存储背景色到元数据
        # new_img.info['bg_color'] = bg_color
        return new_img