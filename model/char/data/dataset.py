import os
from random import sample

import torch
from PIL import Image
from torch.utils.data import Dataset
from torchvision import transforms

from model.char.config import BaseConfig, DataSetConfig


class CaptchaDataset(Dataset):
    def __init__(self, num_samples=None, mode='train'):
        self.mode = mode
        self.image_dir = DataSetConfig.DATA_ROOT + '/' + mode
        self.image_files = [f for f in os.listdir(self.image_dir) if f.endswith('.png')]
        if num_samples and num_samples < DataSetConfig.TOTAL_SAMPLES:
            self.image_files = sample(self.image_files, int(num_samples * DataSetConfig.TRAIN_RATIO)) \
            if mode == 'train' else sample(self.image_files, int(num_samples - num_samples * DataSetConfig.TRAIN_RATIO))
        
        self.train_transform = transforms.Compose([
            # 几何变换（保持RGB处理）
            transforms.RandomApply([
                transforms.RandomAffine(
                    degrees=15,
                    translate=(0.1, 0.1),
                    scale=(0.8, 1.2),
                    shear=10,
                    fill=255
                )
            ], p=0.5),
            transforms.RandomPerspective(
                distortion_scale=0.2,
                p=0.5,
                fill=255
            ),
            
            # 调整尺寸应放在颜色变换前
            transforms.Lambda(CaptchaDataset.resize),
            
            # 颜色变换（需要RGB图像）
            transforms.ColorJitter(
                brightness=0.1,
                contrast=0.1,
                # 移除饱和度和色相调整（灰度后无效）
                # saturation=0.1,  # 删除
                # hue=0.05         # 删除
            ),
            
            # 转为灰度
            transforms.Grayscale(num_output_channels=1),
            
            # 后续处理
            transforms.ToTensor(),
            transforms.Normalize(mean=[0.5], std=[0.5])
        ])
        
        self.valid_transform = transforms.Compose([
            # 调整尺寸
            transforms.Lambda(CaptchaDataset.resize),
            # 颜色变换（需要RGB图像）
            transforms.ColorJitter(brightness=0.1, contrast=0.1),
            # 最后转为灰度
            transforms.Grayscale(num_output_channels=1),
            transforms.ToTensor(),
            transforms.Normalize(mean=[0.5], std=[0.5])
        ])

    def __len__(self):
        return len(self.image_files)

    def __getitem__(self, idx):
        image_path = os.path.join(self.image_dir, self.image_files[idx])
        image = Image.open(image_path).convert('L')
        
        label_str = image_path.split('_')[1].split('.')[0]
        
        # 转换标签为数字序列
        label = [BaseConfig.CHAR_SET.index(c) for c in label_str]
        
        # 根据模式选择预处理
        if self.mode == 'train':
            image = self.train_transform(image)
        else:
            image = self.valid_transform(image)
        
        return image, torch.tensor(label)

    @staticmethod
    def resize(img):
        """调整图像尺寸并填充至指定大小（动态背景色）"""
        # 获取原始图像尺寸
        original_width, original_height = img.size
        (target_width, target_height) = BaseConfig.IMAGE_SIZE

        # 计算新的宽度，保持宽高比不变
        new_width = int(original_width * (target_height / original_height))

        # 调整图像大小
        img_resized = img.resize((new_width, target_height), Image.Resampling.BILINEAR)

        # 动态获取背景色（优化采样方式）
        def get_background_color(image):
            """通过边缘采样获取背景色"""
            # 采样策略：四边各取5个像素点（间隔采样）
            samples = []
            width, height = image.size
            
            # 上边沿
            for x in range(0, width, max(1, width//5))[:5]:
                samples.append(image.getpixel((x, 0)))
            # 下边沿
            for x in range(0, width, max(1, width//5))[:5]:
                samples.append(image.getpixel((x, height-1)))
            # 左边沿
            for y in range(0, height, max(1, height//5))[:5]:
                samples.append(image.getpixel((0, y)))
            # 右边沿
            for y in range(0, height, max(1, height//5))[:5]:
                samples.append(image.getpixel((width-1, y)))

            # 统计最常出现的颜色（考虑灰度值）
            from collections import Counter
            color_counter = Counter(samples)
            return color_counter.most_common(1)[0][0]

        bg_color = get_background_color(img)  # 获取原始图像背景色

        # 创建新图像并填充
        new_img = Image.new('L', (target_width, target_height), bg_color)

        if new_width <= target_width:
            # 如果新宽度小于或等于目标宽度，则居中填充
            paste_position = ((target_width - new_width) // 2, 0)
            new_img.paste(img_resized, paste_position)
        else:
            # 如果新宽度大于目标宽度，则从中间裁剪
            left = (new_width - target_width) // 2
            right = left + target_width
            img_cropped = img_resized.crop((left, 0, right, target_height))
            new_img.paste(img_cropped, (0, 0))

        return new_img