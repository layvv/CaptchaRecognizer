from torch.utils.data import Dataset
from PIL import Image
import os
import torch
from model.char.config import DataSetConfig
from torchvision import transforms


class CaptchaDataset(Dataset):
    def __init__(self, mode='train'):
        self.root = os.path.join(DataSetConfig.DATA_ROOT, mode)
        self.filenames = [f for f in os.listdir(self.root) if f.endswith('.png')]
        self.transform = transforms.Compose([
            transforms.ToTensor(),
            transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225])
        ])
        
    def __len__(self):
        return len(self.filenames)
    
    def __getitem__(self, idx):
        filename = self.filenames[idx]
        img_path = os.path.join(self.root, filename)
        image = Image.open(img_path).convert('RGB')
        label_str = filename.split('_')[1].split('.')[0]
        
        # 将标签转换为数字序列
        label = [DataSetConfig.CHAR_SET.index(c) for c in label_str]
        return self.transform(image), torch.tensor(label)
