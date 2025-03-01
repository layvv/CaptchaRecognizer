import importlib
import io
import os
from typing import List, Union

import torch
from PIL import Image
from torchvision import transforms

from model.char.config import BaseConfig
from model.char.data.dataset import CaptchaDataset


class CaptchaPredictor:
    def __init__(self, model_path: str):
        """验证码识别器
        
        参数：
            model_path (str): 训练好的模型文件路径（.pth）
        """
        # 参数校验（新增更严格的检查）
        if not os.path.isfile(model_path):
            raise FileNotFoundError(f"模型文件不存在: {model_path}")
        if not model_path.endswith('.pth'):
            raise ValueError("模型文件必须为.pth格式")
        
        # 初始化设备
        self.device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        print(f"⚙️ 运行设备: {self.device}")
        
        # 加载模型
        self._load_model(model_path)
        self._init_image_processing()

    def _load_model(self, model_path: str):
        try:
            state = torch.load(model_path, map_location=self.device)
            
            # 关键字段检查
            if 'model_class' not in state or 'model_module' not in state:
                raise ValueError("模型文件缺少必要的元数据，请使用最新版本训练器保存模型")
            
            # 动态导入
            try:
                module = importlib.import_module(state['model_module'])
                model_class = getattr(module, state['model_class'])
            except (ImportError, AttributeError) as e:
                raise ImportError(f"无法加载模型类: {str(e)}")
            
            # 初始化模型
            self.model = model_class().to(self.device)
            self.model.load_state_dict(state['model_state_dict'])
            self.model.eval()
            print(f"✅ 成功加载 {model_class} 模型")
        except Exception as e:
            raise RuntimeError(f"模型加载失败: {str(e)}")

    def _init_image_processing(self):
        """初始化图像处理流程"""
        self.transform = transforms.Compose([
            # 先调整尺寸
            transforms.Lambda(CaptchaDataset.resize),
            transforms.ToTensor(),
            transforms.Normalize(mean=[0.5], std=[0.5])
        ])
        self.char_set = BaseConfig.CHAR_SET
        print(f"📊 字符集加载完成，共{len(self.char_set)}个字符")

    def predict(self, input_source: Union[str, bytes]) -> str:
        """统一预测接口
        
        参数：
            input_source (str/bytes): 图片路径或二进制数据
            
        返回：
            str: 识别结果
        """
        try:
            # 自动识别输入类型
            if isinstance(input_source, str):
                if not os.path.exists(input_source):
                    raise FileNotFoundError(f"图片路径不存在: {input_source}")
                with open(input_source, "rb") as f:
                    image_bytes = f.read()
            elif isinstance(input_source, bytes):
                image_bytes = input_source
            else:
                raise ValueError("不支持的输入类型，请提供文件路径或字节流")

            # 转换为Tensor
            image = Image.open(io.BytesIO(image_bytes)).convert('L')
            tensor = self.transform(image).unsqueeze(0).to(self.device)

            # 执行预测
            with torch.no_grad():
                outputs = self.model(tensor)
            
            return self._decode_predictions(outputs)
        except Exception as e:
            raise RuntimeError(f"预测过程中发生错误: {str(e)}")

    def _decode_predictions(self, outputs: List[torch.Tensor]) -> str:
        """解析多任务头输出"""
        return ''.join([self.char_set[head.argmax().item()] for head in outputs])

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

if __name__ == '__main__':
    # 示例用法（用户可修改这两个路径）
    MODEL_PATH = "C:\Dev\code\Projects\CaptchaRecognizer\model\char\\final\\resnet_multi_head.pth"  # ← 修改为实际模型路径
    TEST_IMAGE = "C:\\Users\yu\Downloads\captcha (1).jpg"  # ← 修改为测试图片路径
    
    # 创建预测器实例
    try:
        predictor = CaptchaPredictor(MODEL_PATH)
        result = predictor.predict(TEST_IMAGE)
        print(f"\n🔮 识别结果: {result}")
    except Exception as e:
        print(f"❌ 错误: {str(e)}")

    # img = Image.open(TEST_IMAGE).convert('L')
    # trans = transforms.Compose([
    #     transforms.Lambda(CaptchaDataset.resize),  # 必须放在第一个位置确保背景色信息存在
    #     DynamicFillRandomAffine(
    #         degrees=5,
    #         translate=(0.05, 0.05),
    #         scale=(0.8, 1.2),
    #         interpolation=transforms.InterpolationMode.BILINEAR,
    #     ),
    #     DynamicFillRandomPerspective(
    #         distortion_scale=0.1
    #     ),
    #     transforms.ColorJitter(brightness=0.2, contrast=0.2),
    #     # transforms.ToTensor(),
    #     # transforms.Normalize(mean=[0.5], std=[0.5])
    # ])
    # img = trans(img)
    # img.show()
