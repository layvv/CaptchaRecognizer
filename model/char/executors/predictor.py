import io
from typing import List, Union, Tuple

import torch
from PIL import Image

from model.char.config import config
from model.char.data.dataset import CaptchaDataset
from model.char.utils.model_util import load_model


class Predictor:
    """验证码预测器"""

    def __init__(self, model_path: str):
        # 加载模型
        self.model = load_model(model_path)
        self.device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        self.model.to(self.device)
        self.model.eval()

        # 图像变换
        self.transform = CaptchaDataset.valid_transform

        # 调试信息
        print(f"📷 验证码识别器已初始化")
        print(f"   - 模型名称: {self.model.model_name}")
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

    def predict_batch(self, images: List[Union[str, bytes, Image.Image]]) -> List[Tuple[str, List[float]]]:
        """批量预测验证码

        Args:
            images: 图像路径、字节流或PIL图像列表

        Returns:
            识别结果和置信度列表
        """
        results = []
        for image in images:
            result, confidences = self.predict(image)
            results.append((result, confidences))
        return results