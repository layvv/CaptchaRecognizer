import os

from model.char.config import config
from model.char.executors.predictor import Predictor


if __name__ == '__main__':
    dataset = 'test'
    image_dir = os.path.join(config.DATA_ROOT, dataset)
    model_path = "C:\Dev\code\Projects\CaptchaRecognizer\model\char\exported\\resnet50\model.pth"
    predictor = Predictor(model_path)
    images = os.listdir(image_dir)
    images.sort()
    for image_path in images[:20]:
        if image_path.endswith('.png') or image_path.endswith('.jpg'):
            result, confidences = predictor.predict(os.path.join(image_dir, image_path))
            print(f"\n🔍 验证码识别结果:")
            print(f"   识别结果: {result}")
            print(f"   图像: {os.path.basename(image_path)}")
            print(f"   置信度: {sum(confidences)/len(confidences):.4f}")
            # 打印每个字符的置信度
            # print(f"\n📊 字符置信度:")
            # for i, (char, conf) in enumerate(zip(result, confidences)):
            #     print(f"   位置 {i+1}: {char} ({conf:.4f})")