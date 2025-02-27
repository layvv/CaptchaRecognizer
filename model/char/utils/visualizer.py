import matplotlib
matplotlib.use('Agg')
import os
import numpy as np
import matplotlib.pyplot as plt
from sklearn.metrics import confusion_matrix
from torch.utils.tensorboard import SummaryWriter
import threading
from matplotlib.ticker import PercentFormatter

from model.char.config import BaseConfig


class Visualizer:
    """可视化工具类（集成训练过程可视化功能）"""
    def __init__(self, log_dir):
        self.writer = SummaryWriter(log_dir=log_dir)
        os.makedirs(log_dir, exist_ok=True)
        self.plot_semaphores = {
            'position': threading.Semaphore(1),
            'distribution': threading.Semaphore(1),
            'confusion': threading.Semaphore(1)
        }  # 分类型信号量控制

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
        """异步记录混淆矩阵"""
        def _async_plot():
            with self.plot_semaphores['confusion']:
                cm = self._gen_confusion_matrix(all_labels, all_preds)
                fig = self._create_cm_figure(cm, list(BaseConfig.CHAR_SET))
                self.log_figure('ConfusionMatrix', fig, epoch)
        threading.Thread(target=_async_plot, daemon=True).start()

    def log_char_distribution(self, char_stats, epoch):
        """记录字符统计"""
        def _async_plot():
            with self.plot_semaphores['distribution']:
                fig = self._create_char_distribution_figure(char_stats)
                self.log_figure('CharDistribution', fig, epoch)
        threading.Thread(target=_async_plot, daemon=True).start()

    def log_char_pos_acc(self, position_acc, epoch):
        """异步绘制位置准确率柱状图"""
        def _async_plot():
            with self.plot_semaphores['position']:
                fig = plt.figure(figsize=(10, 6), dpi=100)
                ax = fig.add_subplot(111)
                positions = [f'Pos {i}' for i in range(len(position_acc))]
                bars = ax.bar(positions, position_acc, color='#4C72B0')
                
                # 设置坐标轴
                ax.set_ylim(0, 1)
                ax.yaxis.set_major_formatter(PercentFormatter(1.0))
                ax.set_xlabel('Character Position')
                ax.set_ylabel('Accuracy (%)')
                ax.set_title(f'Position Accuracy @ Epoch {epoch}')
                
                # 添加数值标签
                for bar in bars:
                    height = bar.get_height()
                    ax.text(bar.get_x() + bar.get_width()/2., height,
                            f'{height:.1%}',
                            ha='center', va='bottom')
                
                self.writer.add_figure('PositionAccuracy', fig, epoch)
                plt.close(fig)
        threading.Thread(target=_async_plot, daemon=True).start()

    def log_position_acc(self, position_acc, epoch):
        """异步绘制位置准确率柱状图"""
        def _async_plot():
            with self.plot_semaphores['position']:
                fig = plt.figure(figsize=(10, 6), dpi=100)
                ax = fig.add_subplot(111)
                positions = [f'Pos {i}' for i in range(len(position_acc))]
                bars = ax.bar(positions, position_acc, color='#4C72B0')
                
                # 设置坐标轴
                ax.set_ylim(0, 1)
                ax.yaxis.set_major_formatter(PercentFormatter(1.0))
                ax.set_xlabel('Character Position')
                ax.set_ylabel('Accuracy (%)')
                ax.set_title(f'Position Accuracy @ Epoch {epoch}')
                
                # 添加数值标签
                for bar in bars:
                    height = bar.get_height()
                    ax.text(bar.get_x() + bar.get_width()/2., height,
                            f'{height:.1%}',
                            ha='center', va='bottom')
                
                self.writer.add_figure('PositionAccuracy', fig, epoch)
                plt.close(fig)
        
        threading.Thread(target=_async_plot, daemon=True).start()

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
        """重叠柱状图设计"""
        fig = plt.figure(figsize=(20, 8), dpi=120)
        chars = list(BaseConfig.CHAR_SET)
        
        # 计算统计值
        accuracies = []
        totals = []
        for c in chars:
            stats = char_stats.get(c, {'correct':0, 'total':0})
            acc = stats['correct'] / stats['total'] if stats['total'] > 0 else 0
            accuracies.append(acc)
            totals.append(stats['total'])
        
        # 创建双轴
        ax1 = fig.add_subplot(111)
        ax2 = ax1.twinx()
        
        # 设置x轴位置
        x = np.arange(len(chars))
        width = 0.6  # 相同宽度
        
        # 绘制准确率柱状图（主）
        bars_acc = ax1.bar(
            x, accuracies, width,
            color='#4C72B0', alpha=0.8,
            label='Accuracy'
        )
        
        # 绘制出现次数柱状图（背景）
        bars_count = ax2.bar(
            x, totals, width,
            color='#55A868', alpha=0.3,
            label='Count'
        )
        
        # 坐标轴设置
        ax1.set_ylabel('Accuracy (%)', color='#4C72B0')
        ax1.set_ylim(0, 1)
        ax1.yaxis.set_major_formatter(PercentFormatter(1.0))
        ax1.tick_params(axis='y', labelcolor='#4C72B0')
        
        ax2.set_ylabel('Occurrence Count', color='#55A868')
        ax2.yaxis.set_major_locator(plt.MaxNLocator(integer=True))
        ax2.tick_params(axis='y', labelcolor='#55A868')
        
        # X轴设置
        ax1.set_xticks(x)
        ax1.set_xticklabels(chars, rotation=45, fontsize=9)
        ax1.set_xlabel('Characters')
        
        # 添加数值标签
        def add_labels(bars, ax, color, fmt):
            for bar in bars:
                height = bar.get_height()
                ax.text(
                    bar.get_x() + bar.get_width()/2., height,
                    fmt.format(height),
                    ha='center', va='bottom',
                    color=color, fontsize=8
                )
        
        add_labels(bars_acc, ax1, '#2A4E6E', '{:.1%}')  # 深蓝色标签
        add_labels(bars_count, ax2, '#2F5C3C', '{:,}')  # 深绿色标签
        
        # 合并图例
        lines = [bars_acc, bars_count]
        labels = [l.get_label() for l in lines]
        ax1.legend(lines, labels, loc='upper left', fontsize=9)
        
        # 图表装饰
        plt.title(f'Character Performance (Accuracy & Count, Total Chars: {sum(totals):,})',
                 pad=20, fontsize=14)
        plt.tight_layout(pad=3)
        return fig

    @staticmethod
    def _gen_confusion_matrix(all_labels, all_preds):
        """生成并记录混淆矩阵"""
        # 将标签和预测结果展平
        labels_flat = np.array(all_labels).flatten()
        preds_flat = np.array(all_preds).flatten()

        # 计算混淆矩阵
        return confusion_matrix(labels_flat, preds_flat)

