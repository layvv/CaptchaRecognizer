import argparse
import os
import sys
from typing import List, Optional

# 添加项目根目录到路径
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '../../..')))

from model.char.executors.evaluator import Evaluator
from model.char.config import config
from model.char.models import (
    CNN, ResNet18, ResNet34, ResNet50, 
    DenseNet121, MobileNetV3Small, EfficientNetB0
)


def parse_args():
    """解析命令行参数"""
    parser = argparse.ArgumentParser(description='验证码识别模型评估工具')
    
    # 评估模式参数
    mode_group = parser.add_mutually_exclusive_group(required=True)
    mode_group.add_argument('--all-exported', action='store_true', help='评估所有导出的模型')
    mode_group.add_argument('--exported', nargs='+', help='评估指定的导出模型')
    mode_group.add_argument('--new', action='store_true', help='训练并评估新模型')
    
    # 可选参数
    parser.add_argument('--output-dir', help='评估结果输出目录')
    parser.add_argument('--models', nargs='+', choices=[
        'cnn', 'resnet18', 'resnet34', 'resnet50', 
        'densenet121', 'mobilenet_v3_small', 'efficientnet_b0', 'all'
    ], default=['all'], help='要训练和评估的模型类型')
    
    # 训练参数
    parser.add_argument('--epochs', type=int, help='训练轮次，覆盖配置文件')
    parser.add_argument('--batch-size', type=int, help='批次大小，覆盖配置文件')
    parser.add_argument('--lr', type=float, help='学习率，覆盖配置文件')
    parser.add_argument('--samples', type=int, help='训练样本数，默认使用所有样本')
    
    return parser.parse_args()


def train_and_evaluate_models(models: List[str], args):
    """训练并评估指定的模型"""
    from model.char.executors.trainer import Trainer
    
    # 如果提供了训练参数，临时修改配置
    if args.epochs:
        config.EPOCHS = args.epochs
    if args.batch_size:
        config.BATCH_SIZE = args.batch_size
    if args.lr:
        config.LR = args.lr
    
    # 初始化评估器
    evaluator = Evaluator(args.output_dir)
    
    # 模型映射
    model_map = {
        'cnn': CNN,
        'resnet18': ResNet18,
        'resnet34': ResNet34,
        'resnet50': ResNet50,
        'densenet121': DenseNet121,
        'mobilenet_v3_small': MobileNetV3Small,
        'efficientnet_b0': EfficientNetB0
    }
    
    # 如果指定了'all'，则训练和评估所有模型
    if 'all' in models:
        models = list(model_map.keys())
    
    # 对每个模型进行训练和评估
    for model_name in models:
        print(f"\n{'='*50}\n训练并评估模型: {model_name}\n{'='*50}")
        
        # 初始化模型
        model_class = model_map.get(model_name)
        if not model_class:
            print(f"未知模型类型: {model_name}")
            continue
        
        model = model_class()
        
        # 训练模型
        trainer = Trainer(model)
        trainer.train(args.samples)
        
        # 获取导出的模型路径
        model_path = os.path.join(config.EXPORT_ROOT, model.model_name, 'model.pth')
        
        # 评估模型
        if os.path.exists(model_path):
            evaluator.evaluate_model(model_path, model.model_name)
        else:
            print(f"模型文件不存在: {model_path}")
    
    # 比较所有评估过的模型
    evaluator.compare_models()


def main():
    """主函数"""
    args = parse_args()
    
    # 创建评估器
    evaluator = Evaluator(args.output_dir)
    
    # 根据模式执行评估
    if args.all_exported:
        print("评估所有导出的模型")
        evaluator.evaluate_exported_models()
    
    elif args.exported:
        print(f"评估指定的导出模型: {', '.join(args.exported)}")
        evaluator.evaluate_exported_models(args.exported)
    
    elif args.new:
        print("训练并评估新模型")
        train_and_evaluate_models(args.models, args)


if __name__ == '__main__':
    main() 