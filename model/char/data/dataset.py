import os
from random import sample

import cv2
import numpy as np
import torch
from PIL import Image
from torch.utils.data import Dataset
from torchvision import transforms
from torchvision.transforms import InterpolationMode

from model.char.config import BaseConfig, DataSetConfig


def preprocess(img: Image.Image):
    """统一的预处理流程"""
    img = binarize(img)
    return img

def resize(img: Image.Image):
    """保持宽高比的智能缩放"""
    original_width, original_height = img.size
    target_width, target_height = BaseConfig.IMAGE_SIZE

    # 计算缩放比例
    width_ratio = target_width / original_width
    height_ratio = target_height / original_height
    scale_ratio = min(width_ratio, height_ratio)

    # 等比缩放
    new_width = int(original_width * scale_ratio)
    new_height = int(original_height * scale_ratio)
    img = img.resize((new_width, new_height), Image.Resampling.NEAREST)

    # 创建目标画布（使用固定背景色）
    canvas = Image.new('L', (target_width, target_height), 0)

    # 粘贴或裁剪图像
    if new_width <= target_width and new_height <= target_height:
        # 计算粘贴位置
        x = (target_width - new_width) // 2
        y = (target_height - new_height) // 2
        canvas.paste(img, (x, y))
    else:
        # 裁剪中心区域
        left = max(0, (new_width - target_width) // 2)
        upper = max(0, (new_height - target_height) // 2)
        right = left + target_width
        lower = upper + target_height
        canvas = img.crop((left, upper, right, lower))

    return canvas

def binarize(image):
    tmp = np.array(image)
    tmp = cv2.medianBlur(tmp, 3)

    # 自适应阈值处理（高斯加权+反向二值化）
    tmp = cv2.adaptiveThreshold(
        src=tmp,
        maxValue=255,
        adaptiveMethod=cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
        thresholdType=cv2.THRESH_BINARY_INV,
        blockSize=9,
        C=2
    )
    # tmp = cv2.medianBlur(tmp, 3)
    kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (2,2))
    tmp = cv2.morphologyEx(tmp, cv2.MORPH_CLOSE, kernel)

    return Image.fromarray(tmp)

class CaptchaDataset(Dataset):

    train_transform = transforms.Compose([
        transforms.Lambda(preprocess),
        transforms.RandomAffine(  # 随机仿射变换（旋转、平移、缩放、剪切）
            degrees=5,            # 旋转角度范围：±5度（轻微旋转）
            scale=(0.9, 1.1),     # 缩放比例范围（0.9到1.1倍）
            shear=5,              # 剪切角度范围
            interpolation=InterpolationMode.BILINEAR
        ),
        transforms.RandomPerspective(  # 随机透视变换（轻微变形）
            distortion_scale=0.2,  # 变形程度（0.2表示较小变形）
            p=0.3,                 # 应用概率（30%）
        ),
        transforms.Lambda(resize),
        transforms.ToTensor(),
        transforms.Normalize(mean=[0.5], std=[0.5])
    ])

    valid_transform = transforms.Compose([
        transforms.Lambda(preprocess),
        transforms.Lambda(resize),
        transforms.ToTensor(),
        transforms.Normalize(mean=[0.5], std=[0.5])
    ])


    def __init__(self, num_samples=None, mode='train'):
        self.mode = mode
        self.image_dir = os.path.join(DataSetConfig.DATA_ROOT, mode)
        self.image_files = [f for f in os.listdir(self.image_dir) if f.endswith('.png')]

        # 样本数量控制
        if num_samples and num_samples < DataSetConfig.TOTAL_SAMPLES:
            split_ratio = DataSetConfig.TRAIN_RATIO
            split_size = int(num_samples * split_ratio) if mode == 'train' else num_samples - int(num_samples * split_ratio)
            self.image_files = sample(self.image_files, split_size)

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