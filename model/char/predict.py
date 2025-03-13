import os
import time
import argparse
from typing import List, Union, Tuple
import io

import torch
import numpy as np
from PIL import Image
from torchvision import transforms

from model.char_input.config import config
from model.char_input.data.dataset import preprocess, resize
from model.char_input.utils.model_util import load_model


class CaptchaPredictor:
    """验证码预测器"""
    
    def __init__(self, model_path=None):
        """初始化预测器
        
        Args:
            model_path: 模型路径，None使用最新模型
        """
        self.device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        
        # 加载模型
        self.model = load_model(model_path)
        self.model.to(self.device)
        self.model.eval()
        
        # 图像变换
        self.transform = transforms.Compose([
            transforms.Lambda(preprocess),
            transforms.Lambda(resize),
            transforms.ToTensor(),
            transforms.Normalize(mean=[0.5], std=[0.5])
        ])
        
        # 调试信息
        print(f"📷 验证码识别器已初始化")
        print(f"   - 模型类型: {self.model.model_type}")
        print(f"   - 设备: {self.device}")
        print(f"   - 字符集大小: {config.NUM_CLASSES}")
        print(f"   - 图像大小: {config.IMAGE_SIZE}")
    
    def predict(self, image: Union[str, bytes, Image.Image]) -> Tuple[str, List[float]]:
        """预测验证码
        
        Args:
            image: 图像路径、字节流或PIL图像
            
        Returns:
            识别结果和置信度
        """
        # 加载图像
        if isinstance(image, str):
            # 图像路径
            img = Image.open(image)
        elif isinstance(image, bytes):
            # 字节流
            img = Image.open(io.BytesIO(image))
        elif isinstance(image, Image.Image):
            # PIL图像
            img = image
        else:
            raise TypeError("不支持的图像类型")
        
        # 预处理图像
        img_tensor = self.transform(img).unsqueeze(0).to(self.device)
        
        # 推理
        with torch.no_grad():
            outputs = self.model(img_tensor)
            
            # 获取预测结果和置信度
            confidences = []
            result = ""
            
            for output in outputs:
                # 应用softmax获取概率
                probs = torch.nn.functional.softmax(output, dim=1)
                
                # 获取最大概率及其索引
                confidence, pred = probs.max(1)
                
                # 保存结果
                result += config.CHAR_SET[pred.item()]
                confidences.append(confidence.item())
        
        return result, confidences
    
    def batch_predict(self, images: List[Union[str, Image.Image]]) -> List[Tuple[str, List[float]]]:
        """批量预测验证码
        
        Args:
            images: 图像路径或PIL图像列表
            
        Returns:
            识别结果和置信度列表
        """
        results = []
        for image in images:
            results.append(self.predict(image))
        return results


def predict_image(image_path, model_path=None):
    """预测单个图像
    
    Args:
        image_path: 图像路径
        model_path: 模型路径，None使用最新模型
    """
    predictor = CaptchaPredictor(model_path)
    result, confidences = predictor.predict(image_path)
    
    # 打印结果
    print(f"\n🔍 验证码识别结果:")
    print(f"   图像: {os.path.basename(image_path)}")
    print(f"   识别结果: {result}")
    print(f"   置信度: {sum(confidences)/len(confidences):.4f}")
    
    # 打印每个字符的置信度
    print(f"\n📊 字符置信度:")
    for i, (char, conf) in enumerate(zip(result, confidences)):
        print(f"   位置 {i+1}: {char} ({conf:.4f})")
    
    return result


def main():
    """命令行入口"""
    parser = argparse.ArgumentParser(description='验证码识别预测')
    parser.add_argument('--image', type=str, required=True,
                        help='图像路径')
    parser.add_argument('--model', type=str, default=None,
                        help='模型路径')
    
    args = parser.parse_args()
    predict_image(args.image, args.model)


if __name__ == '__main__':
    main() 