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
        if num_samples and num_samples < len(self.image_files):
            self.image_files = sample(self.image_files, int(num_samples * DataSetConfig.TRAIN_RATIO)) \
            if mode == 'train' else sample(self.image_files, int(num_samples - num_samples * DataSetConfig.TRAIN_RATIO))
        
        self.train_transform = transforms.Compose([
            # 几何变换（在原始尺寸下进行）
            transforms.RandomApply([
                transforms.RandomAffine(
                    degrees=15,
                    translate=(0.1, 0.1),
                    scale=(0.9, 1.1),
                    shear=10,
                    fill=255
                )
            ], p=0.5),
            transforms.RandomPerspective(
                distortion_scale=0.2,
                p=0.5,
                fill=255
            ),
            # 颜色变换
            transforms.ColorJitter(
                brightness=0.1,
                contrast=0.1,
                saturation=0.1,
                hue=0.05
            ),
            # 调整尺寸和标准化
            transforms.Resize(BaseConfig.IMAGE_SIZE[::-1], antialias=True),
            transforms.ToTensor(),
            transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225])
        ])
        
        self.valid_transform = transforms.Compose([
            transforms.Resize(BaseConfig.IMAGE_SIZE[::-1]),
            transforms.ToTensor(),
            transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225])
        ])

    def __len__(self):
        return len(self.image_files)

    def __getitem__(self, idx):
        image_path = os.path.join(self.image_dir, self.image_files[idx])
        image = Image.open(image_path).convert('RGB')
        label_str = image_path.split('_')[1].split('.')[0]
        
        # 转换标签为数字序列
        label = [BaseConfig.CHAR_SET.index(c) for c in label_str]
        
        # 根据模式选择预处理
        if self.mode == 'train':
            image = self.train_transform(image)
        else:
            image = self.valid_transform(image)
        
        return image, torch.tensor(label)
