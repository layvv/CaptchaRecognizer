import os
import numpy as np
import matplotlib.pyplot as plt
from sklearn.metrics import confusion_matrix
from torch.utils.tensorboard import SummaryWriter

from model.char.config import BaseConfig


class Visualizer:
    """可视化工具类（集成训练过程可视化功能）"""
    def __init__(self, log_dir):
        self.writer = SummaryWriter(log_dir=log_dir)
        os.makedirs(log_dir, exist_ok=True)

    def log_scalars(self, main_tag, tag_scalar_dict, epoch):
        """记录多个标量到同一图表"""
        self.writer.add_scalars(main_tag, tag_scalar_dict, epoch)

    def log_figure(self, tag, figure, epoch):
        """记录可视化图表"""
        self.writer.add_figure(tag, figure, epoch)
        plt.close(figure)

    def log_histogram(self, tag, values, epoch):
        """记录直方图"""
        self.writer.add_histogram(tag, values, epoch)

    def log_learning_rate(self, lr, epoch):
        """记录学习率"""
        self.writer.add_scalar('Learning Rate', lr, epoch)

    def log_confusion_matrix(self, all_labels, all_preds, epoch):
        cm = self._gen_confusion_matrix(all_labels, all_preds)
        class_names=list(BaseConfig.CHAR_SET)
        """记录混淆矩阵"""
        fig = self._create_cm_figure(cm, class_names)
        self.log_figure('ConfusionMatrix', fig, epoch)

    def log_char_distribution(self, char_stats, epoch):
        """记录字符统计"""
        fig = self._create_char_distribution_figure(char_stats)
        self.log_figure('CharDistribution', fig, epoch)

    def log_char_pos_acc(self, position_acc, epoch):
        for pos, acc in enumerate(position_acc):
            self.log_scalars('Position Accuracy', {
                f'pos_{pos}': acc
            }, epoch)

    @staticmethod
    def _create_cm_figure(cm, class_names):
        fig = plt.figure(figsize=(12, 10))
        plt.imshow(cm, interpolation='nearest', cmap=plt.cm.Blues)
        plt.title("Confusion Matrix")
        plt.colorbar()
        tick_marks = np.arange(len(class_names))
        plt.xticks(tick_marks, class_names, rotation=45)
        plt.yticks(tick_marks, class_names)
        plt.tight_layout()
        return fig

    @staticmethod
    def _create_char_distribution_figure(char_stats):
        fig = plt.figure(figsize=(18, 8))
        chars = list(char_stats.keys())
        
        # 计算统计值
        accuracies = [s['correct']/s['total'] if s['total']>0 else 0 for s in char_stats.values()]
        totals = [s['total'] for s in char_stats.values()]
        
        # 创建双轴图表
        ax1 = fig.add_subplot(111)
        ax2 = ax1.twinx()
        
        # 绘制准确率柱状图
        bars = ax1.bar(chars, accuracies, alpha=0.6, color='b', label='Accuracy')
        ax1.set_ylabel('Accuracy', color='b')
        ax1.set_ylim(0, 1)
        
        # 绘制出现次数折线图
        line, = ax2.plot(chars, totals, 'r-', marker='o', label='Count')
        ax2.set_ylabel('Occurrence Count', color='r')
        ax2.grid(False)
        
        # 添加柱状图数值标签
        for bar, acc, count in zip(bars, accuracies, totals):
            height = bar.get_height()
            ax1.text(bar.get_x() + bar.get_width()/2., height,
                     f'{acc:.2f}\n({count})', 
                     ha='center', va='bottom',
                     fontsize=8, color='blue')

        # 图表装饰
        plt.title('Character Performance (Accuracy & Occurrence Count)')
        ax1.tick_params(axis='y', labelcolor='b')
        ax2.tick_params(axis='y', labelcolor='r')
        plt.xticks(rotation=45)
        
        # 合并图例
        handles = [bars, line]
        labels = ['Accuracy', 'Occurrence Count']
        ax1.legend(handles, labels, loc='upper left')
        
        plt.tight_layout()
        return fig

    @staticmethod
    def _gen_confusion_matrix(all_labels, all_preds):
        """生成并记录混淆矩阵"""
        # 将标签和预测结果展平
        labels_flat = np.array(all_labels).flatten()
        preds_flat = np.array(all_preds).flatten()

        # 计算混淆矩阵
        return confusion_matrix(labels_flat, preds_flat)

