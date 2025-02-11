import os
import torch
from PIL import Image
import io
from datetime import datetime

from model.char.config import BaseConfig
from model.char.model.resnet18 import ResNet18MultiHead
from torchvision import transforms

class CaptchaPredictor:
    def __init__(self, model_path: str):
        """验证码识别API核心类（必须指定模型路径）
        
        参数：
            checkpoint_path (str): 模型检查点完整路径
        """
        if not model_path:
            raise ValueError("必须提供模型检查点路径")
            
        if not os.path.exists(model_path):
            raise FileNotFoundError(f"模型文件不存在: {model_path}")
            
        self.device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        self.model = self._load_model(model_path)
        self.transform = self._build_transform()

    def _build_transform(self):
        """构建图像预处理流水线"""
        return transforms.Compose([
            transforms.Resize(BaseConfig.IMAGE_SIZE[::-1]),
            transforms.ToTensor(),
            transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225])
        ])
    
    def _load_model(self, checkpoint_path: str):
        """加载指定模型检查点"""
        # 初始化模型
        model = ResNet18MultiHead().to(self.device)
        
        # 加载检查点
        state = torch.load(checkpoint_path, map_location=self.device)
        model.load_state_dict(state['model_state_dict'])
        model.eval()
        print(f"✅ 成功加载模型: {os.path.basename(checkpoint_path)}")
        return model

    def predict_from_bytes(self, image_bytes: bytes) -> str:
        """通过字节流进行预测
        
        参数：
            image_bytes: 图片的二进制数据
            
        返回：
            str: 识别结果
        """
        return self._predict(image_bytes)

    def predict_from_path(self, image_path: str) -> str:
        """通过本地文件路径进行预测
        
        参数：
            image_path: 图片文件路径
            
        返回：
            str: 识别结果
        """
        if not os.path.exists(image_path):
            raise FileNotFoundError(f"Image not found: {image_path}")
        with open(image_path, "rb") as f:
            return self._predict(f.read())

    def _predict(self, image_input):
        """统一预测方法"""
        with torch.no_grad():
            tensor = self._preprocess(image_input)
            outputs = self.model(tensor)
            predictions = [output.argmax(dim=1).item() for output in outputs]
            return ''.join([BaseConfig.CHAR_SET[i] for i in predictions])

    def _preprocess(self, image_input):
        """统一预处理方法"""
        try:
            if isinstance(image_input, bytes):
                image = Image.open(io.BytesIO(image_input)).convert('RGB')
            else:
                raise ValueError("Invalid input type")
            
            return self.transform(image).unsqueeze(0).to(self.device)
        except Exception as e:
            raise RuntimeError(f"Image processing failed: {str(e)}")

if __name__ == '__main__':
    predictor = CaptchaPredictor("C:\\Dev\\code\\Projects\\CaptchaRecognizer\\model\\char\\checkpoint\\resnet18_multi_head_bs64_lr0.001_20250211_202340\\resnet18_multi_head_40.pth")
    result = predictor.predict_from_path("C:\\Users\\yu\\Downloads\\captcha (4).jpg")
    print(f"识别结果: {result}")