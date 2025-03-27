import os
import json
from datetime import datetime
from typing import Dict, List, Optional, Union, Tuple

import matplotlib.pyplot as plt
import numpy as np
import pandas as pd
import seaborn as sns
import torch
from torch.utils.data import DataLoader
from tqdm import tqdm

from model.char.config import config
from model.char.data.dataset import CaptchaDataset
from model.char.models import BaseModel
from model.char.utils.metrics import (
    calculate_accuracy, calculate_position_accuracy,
    calculate_precision_recall_f1, calculate_gmean, calculate_auc,
    calculate_confusion_matrices, plot_confusion_matrix,
    plot_sample_predictions
)
from model.char.utils.model_util import load_model
from model.char.utils.visualization import TensorboardLogger


class Evaluator:
    """模型评估器"""
    
    def __init__(self, output_dir: Optional[str] = None):
        """
        初始化评估器
        
        Args:
            output_dir: 评估结果输出目录，默认为'experiments/evaluation_{timestamp}'
        """
        self.device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        
        if output_dir is None:
            timestamp = datetime.now().strftime("%Y-%m-%d_%H-%M-%S")
            output_dir = os.path.join(config.EVALUATION_ROOT, f"evaluation_{timestamp}")
        
        os.makedirs(output_dir, exist_ok=True)
        self.output_dir = output_dir
        
        # 初始化TensorBoard日志记录器
        self.logger = TensorboardLogger(os.path.join(output_dir, 'tensorboard'))
        
        # 加载测试数据集
        self.test_dataset = CaptchaDataset('test')
        self.test_loader = DataLoader(
            self.test_dataset,
            batch_size=config.BATCH_SIZE,
            shuffle=False,
            num_workers=config.NUM_WORKERS,
            pin_memory=config.PIN_MEMORY
        )
        
        # 评估结果存储
        self.results = {}
    
    def evaluate_model(self, model: Union[BaseModel, str], model_name: Optional[str] = None) -> Dict:
        """
        评估单个模型
        
        Args:
            model: 模型实例或模型路径
            model_name: 模型名称，如果为None则使用model.model_name
        
        Returns:
            评估结果字典
        """
        # 如果传入的是模型路径，加载模型
        if isinstance(model, str):
            model = load_model(model)
        
        if model_name is None:
            model_name = model.model_name
        
        model.to(self.device)
        model.eval()
        
        total_acc = 0
        all_outputs = []
        all_labels = []
        all_images = []
        
        with torch.no_grad():
            for images, labels in tqdm(self.test_loader, desc=f"评估模型: {model_name}"):
                images = images.to(self.device)
                labels = labels.to(self.device)
                
                # 保存一部分图像用于可视化
                if len(all_images) < 100:  # 只保存100张图像
                    all_images.append(images)
                
                # 前向传播
                outputs = model(images)
                
                # 保存输出和标签用于计算指标
                all_outputs.extend([output.cpu() for output in outputs])
                all_labels.append(labels.cpu())
        
        # 转换为张量
        all_outputs = [torch.cat(outputs, dim=0) for outputs in zip(*[all_outputs])]
        all_labels = torch.cat(all_labels, dim=0)
        
        # 如果保存了图像，将它们拼接起来
        if all_images:
            all_images = torch.cat(all_images, dim=0)[:100]  # 只使用前100张
        
        # 计算准确率
        accuracy = calculate_accuracy(all_outputs, all_labels)
        position_accuracy = calculate_position_accuracy(all_outputs, all_labels)
        
        # 计算各项指标
        precisions, recalls, f1s = calculate_precision_recall_f1(
            all_outputs, all_labels, config.NUM_CLASSES, average='macro'
        )
        gmeans = calculate_gmean(all_outputs, all_labels)
        aucs = calculate_auc(all_outputs, all_labels, config.NUM_CLASSES)
        
        # 计算混淆矩阵
        cms = calculate_confusion_matrices(all_outputs, all_labels, config.NUM_CLASSES)
        
        # 保存结果
        result = {
            'model_name': model_name,
            'accuracy': accuracy,
            'position_accuracy': position_accuracy,
            'precision': precisions,
            'recall': recalls,
            'f1': f1s,
            'gmean': gmeans,
            'auc': aucs,
            'confusion_matrices': cms
        }
        
        # 记录到TensorBoard
        metrics = {
            'accuracy': accuracy,
            'position_acc': position_accuracy,
            'precision': precisions,
            'recall': recalls,
            'f1': f1s,
            'gmean': gmeans,
            'auc': aucs
        }
        
        # 使用独立的命名空间记录每个模型的指标
        for name, value in metrics.items():
            if isinstance(value, list):
                # 记录平均值
                avg_value = sum(value) / len(value)
                self.logger.log_scalar(f'models/{model_name}/{name}_avg', avg_value, 0)
                # 记录每个位置的值
                for i, val in enumerate(value):
                    self.logger.log_scalar(f'models/{model_name}/{name}_pos{i+1}', val, 0)
            else:
                self.logger.log_scalar(f'models/{model_name}/{name}', value, 0)
        
        # 记录混淆矩阵
        for i, cm in enumerate(cms):
            fig = plot_confusion_matrix(cm, classes=list(config.CHAR_SET), normalize=True)
            self.logger.log_figure(f'models/{model_name}/confusion_matrix_pos{i+1}', fig, 0)
        
        # 记录样本预测
        if len(all_images) > 0:
            predictions = torch.stack([output.argmax(1) for output in all_outputs], dim=1)
            indices = np.random.choice(len(all_images), min(20, len(all_images)), replace=False)
            
            sample_images = all_images[indices]
            sample_predictions = predictions[indices]
            sample_labels = all_labels[indices]
            
            fig = plot_sample_predictions(
                sample_images, sample_predictions, sample_labels, config.CHAR_SET
            )
            self.logger.log_figure(f'models/{model_name}/sample_predictions', fig, 0)
        
        # 保存到评估结果
        self.results[model_name] = result
        
        # 保存结果到JSON文件
        self._save_result(model_name, result)
        
        return result
    
    def _save_result(self, model_name: str, result: Dict):
        """保存评估结果到JSON文件"""
        # 创建模型结果目录
        model_dir = os.path.join(self.output_dir, model_name)
        os.makedirs(model_dir, exist_ok=True)
        
        # 准备可以JSON序列化的结果
        serializable_result = {
            'model_name': result['model_name'],
            'accuracy': result['accuracy'],
            'position_accuracy': result['position_accuracy'],
            'precision': result['precision'],
            'recall': result['recall'],
            'f1': result['f1'],
            'gmean': result['gmean'],
            'auc': result['auc'],
        }
        
        # 保存为JSON
        with open(os.path.join(model_dir, 'result.json'), 'w', encoding='utf-8') as f:
            json.dump(serializable_result, f, ensure_ascii=False, indent=2)
    
    def compare_models(self, models: Optional[List[str]] = None):
        """
        比较多个模型的性能
        
        Args:
            models: 要比较的模型名称列表，如果为None则比较所有已评估的模型
        """
        if not self.results:
            print("没有模型评估结果可供比较")
            return
        
        if models is None:
            models = list(self.results.keys())
        
        # 确保所有指定的模型都有评估结果
        missing_models = [m for m in models if m not in self.results]
        if missing_models:
            print(f"以下模型没有评估结果: {', '.join(missing_models)}")
            models = [m for m in models if m in self.results]
        
        if not models:
            print("没有可比较的模型")
            return
        
        # 准备比较数据
        comparison = {
            'model': [],
            'accuracy': [],
            'precision_avg': [],
            'recall_avg': [],
            'f1_avg': [],
            'gmean_avg': [],
            'auc_avg': []
        }
        
        for model_name in models:
            result = self.results[model_name]
            comparison['model'].append(model_name)
            comparison['accuracy'].append(result['accuracy'])
            comparison['precision_avg'].append(np.mean(result['precision']))
            comparison['recall_avg'].append(np.mean(result['recall']))
            comparison['f1_avg'].append(np.mean(result['f1']))
            comparison['gmean_avg'].append(np.mean(result['gmean']))
            comparison['auc_avg'].append(np.mean(result['auc']))
        
        # 创建DataFrame
        df = pd.DataFrame(comparison)
        
        # 保存为CSV
        df.to_csv(os.path.join(self.output_dir, 'model_comparison.csv'), index=False)
        
        # 绘制比较图表
        self._plot_model_comparison(df)
    
    def _plot_model_comparison(self, df: pd.DataFrame):
        """绘制模型比较图表"""
        metrics = ['accuracy', 'precision_avg', 'recall_avg', 'f1_avg', 'gmean_avg', 'auc_avg']
        
        # 条形图比较
        plt.figure(figsize=(15, 10))
        for i, metric in enumerate(metrics):
            plt.subplot(2, 3, i+1)
            sns.barplot(x='model', y=metric, data=df)
            plt.title(metric)
            plt.xticks(rotation=45)
            plt.ylim(0, 1)
        
        plt.tight_layout()
        plt.savefig(os.path.join(self.output_dir, 'model_comparison_bar.png'))
        
        # 雷达图比较
        self._plot_radar_chart(df, metrics)
        
        # 热力图比较
        plt.figure(figsize=(12, 8))
        # 将数据透视为模型x指标的热力图
        pivot_df = df.set_index('model')[metrics]
        sns.heatmap(pivot_df, annot=True, fmt='.4f', cmap='YlGnBu')
        plt.title('模型性能比较热力图')
        plt.tight_layout()
        plt.savefig(os.path.join(self.output_dir, 'model_comparison_heatmap.png'))
    
    def _plot_radar_chart(self, df: pd.DataFrame, metrics: List[str]):
        """绘制雷达图比较模型性能"""
        # 设置画布
        fig = plt.figure(figsize=(10, 10))
        
        # 计算雷达图的角度
        angles = np.linspace(0, 2*np.pi, len(metrics), endpoint=False).tolist()
        # 闭合雷达图
        angles += angles[:1]
        
        # 初始化雷达图
        ax = fig.add_subplot(111, polar=True)
        
        # 设置第一个轴的位置
        ax.set_theta_offset(np.pi / 2)
        ax.set_theta_direction(-1)
        
        # 设置雷达图的刻度标签
        plt.xticks(angles[:-1], metrics)
        
        # 设置y轴范围
        ax.set_ylim(0, 1)
        
        # 绘制每个模型的雷达图
        for i, model in enumerate(df['model']):
            values = df.loc[i, metrics].values.tolist()
            # 闭合雷达图
            values += values[:1]
            ax.plot(angles, values, linewidth=2, linestyle='solid', label=model)
            ax.fill(angles, values, alpha=0.1)
        
        # 添加图例
        plt.legend(loc='upper right', bbox_to_anchor=(0.1, 0.1))
        
        plt.title('模型性能雷达图比较')
        plt.tight_layout()
        plt.savefig(os.path.join(self.output_dir, 'model_comparison_radar.png'))
    
    def evaluate_models(self, models: Dict[str, Union[BaseModel, str]]):
        """
        评估多个模型并比较它们的性能
        
        Args:
            models: 模型字典，键为模型名称，值为模型实例或模型路径
        """
        for model_name, model in models.items():
            self.evaluate_model(model, model_name)
        
        # 比较所有模型
        self.compare_models()
    
    def evaluate_exported_models(self, model_names: Optional[List[str]] = None):
        """
        评估导出目录中的所有模型
        
        Args:
            model_names: 要评估的模型名称列表，如果为None则评估所有导出的模型
        """
        # 获取导出目录中的所有模型
        if not os.path.exists(config.EXPORT_ROOT):
            print(f"导出目录不存在: {config.EXPORT_ROOT}")
            return
        
        available_models = []
        for model_dir in os.listdir(config.EXPORT_ROOT):
            model_path = os.path.join(config.EXPORT_ROOT, model_dir, 'model.pth')
            if os.path.exists(model_path):
                available_models.append((model_dir, model_path))
        
        if not available_models:
            print("导出目录中没有找到模型")
            return
        
        # 过滤模型
        if model_names is not None:
            available_models = [(name, path) for name, path in available_models if name in model_names]
        
        if not available_models:
            print("没有找到指定的模型")
            return
        
        # 评估每个模型
        for model_name, model_path in available_models:
            try:
                self.evaluate_model(model_path, model_name)
            except Exception as e:
                print(f"评估模型 {model_name} 时出错: {e}")
        
        # 比较所有模型
        self.compare_models() 