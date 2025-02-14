import os
from random import sample, random

import numpy as np
import torch
from PIL import Image
from sklearn.cluster import KMeans
from torch.utils.data import Dataset
from torchvision import transforms
from torchvision.transforms import InterpolationMode

from model.char.config import DataSetConfig

class CaptchaDataset(Dataset):
    def __init__(self, num_samples, mode='train'):
        
        self.root = os.path.join(DataSetConfig.DATA_ROOT, mode)
        self.datasets = [f for f in os.listdir(self.root) if f.endswith('.png')]
        
        # 添加样本数量校验
        if num_samples:
            max_samples = len(self.datasets)
            num_samples = min(num_samples, max_samples)  # 防止请求超过实际样本数
            num_samples = int(num_samples * DataSetConfig.TRAIN_RATIO) if mode == 'train' \
                else int(num_samples - num_samples * DataSetConfig.TRAIN_RATIO)
            self.datasets = sample(self.datasets, num_samples)
        # 修改后的增强配置
        self.transform = transforms.Compose([
            transforms.RandomPerspective(
                distortion_scale=0.3,
                p=0.5,
                fill=255
            ),
            transforms.RandomApply([
                transforms.RandomAffine(
                    degrees=15,
                    translate=(0.2, 0.2),
                    scale=(0.8, 1.2),
                    shear=15,
                    fill=255
                )
            ], p=0.6),
            transforms.RandomApply([
                transforms.ColorJitter(0.3, 0.3, 0.3, 0.1)  # 增强颜色抖动强度
            ], p=0.7),
            transforms.Resize(DataSetConfig.IMAGE_SIZE[::-1]),
            transforms.ToTensor(),
            transforms.Normalize(mean=[0.5, 0.5, 0.5], std=[0.5, 0.5, 0.5])
        ])

    def __len__(self):
        return len(self.datasets)

    def __getitem__(self, idx):
        filename = self.datasets[idx]
        img_path = os.path.join(self.root, filename)
        image = Image.open(img_path).convert('RGB')
        
        label_str = filename.split('_')[1].split('.')[0]

        # 将标签转换为数字序列
        label = [DataSetConfig.CHAR_SET.index(c) for c in label_str]
        return self.transform(image), torch.tensor(label)
