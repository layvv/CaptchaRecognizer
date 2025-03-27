import numpy as np
import torch
import torch.nn.functional as F
from sklearn.metrics import (
    confusion_matrix, precision_score, recall_score, 
    f1_score, precision_recall_curve, average_precision_score,
    roc_auc_score, accuracy_score
)
import matplotlib.pyplot as plt
import seaborn as sns
from typing import List, Dict, Tuple, Union, Optional
import io
from PIL import Image
from torchvision import transforms

# 设置中文字体为微软雅黑
plt.rcParams['font.sans-serif'] = ['Microsoft YaHei', 'SimHei']  # 优先微软雅黑，备选黑体
plt.rcParams['axes.unicode_minus'] = False  # 解决负号显示异常

def calculate_accuracy(outputs: List[torch.Tensor], labels: torch.Tensor) -> float:
    """
    计算整体准确率（所有字符都预测正确的比例）
    """
    predictions = torch.stack([output.argmax(1) for output in outputs], dim=1)
    correct = (predictions == labels).all(dim=1).sum().item()
    return correct / labels.size(0)


def calculate_position_accuracy(outputs: List[torch.Tensor], labels: torch.Tensor) -> List[float]:
    """
    计算每个位置的准确率
    """
    position_acc = []
    for i, output in enumerate(outputs):
        predictions = output.argmax(1)
        correct = (predictions == labels[:, i]).sum().item()
        position_acc.append(correct / labels.size(0))
    return position_acc


def calculate_char_accuracy(outputs: List[torch.Tensor], labels: torch.Tensor, num_classes: int) -> Dict[int, float]:
    """
    计算每个字符的准确率
    """
    char_correct = {i: 0 for i in range(num_classes)}
    char_total = {i: 0 for i in range(num_classes)}
    
    for i, output in enumerate(outputs):
        predictions = output.argmax(1)
        for j in range(len(predictions)):
            label = labels[j, i].item()
            char_total[label] += 1
            if predictions[j].item() == label:
                char_correct[label] += 1
    
    char_accuracy = {char: (correct / char_total[char] if char_total[char] > 0 else 0) 
                    for char, correct in char_correct.items()}
    return char_accuracy


def calculate_confusion_matrices(outputs: List[torch.Tensor], labels: torch.Tensor, num_classes: int) -> List[np.ndarray]:
    """
    计算每个位置的混淆矩阵
    """
    confusion_matrices = []
    for i, output in enumerate(outputs):
        predictions = output.argmax(1).cpu().numpy()
        target = labels[:, i].cpu().numpy()
        cm = confusion_matrix(target, predictions, labels=range(num_classes))
        confusion_matrices.append(cm)
    return confusion_matrices


def calculate_precision_recall_f1(outputs: List[torch.Tensor], labels: torch.Tensor, num_classes: int, average: str = 'macro') -> Tuple[List[float], List[float], List[float]]:
    """
    计算每个位置的精确率、召回率和F1分数
    average参数控制平均方式：'micro', 'macro', 'weighted', None(返回每个类)
    """
    precisions, recalls, f1s = [], [], []
    
    for i, output in enumerate(outputs):
        predictions = output.argmax(1).cpu().numpy()
        target = labels[:, i].cpu().numpy()
        
        precision = precision_score(target, predictions, labels=range(num_classes), average=average, zero_division=0)
        recall = recall_score(target, predictions, labels=range(num_classes), average=average, zero_division=0)
        f1 = f1_score(target, predictions, labels=range(num_classes), average=average, zero_division=0)
        
        precisions.append(precision)
        recalls.append(recall)
        f1s.append(f1)
    
    return precisions, recalls, f1s


def calculate_gmean(outputs: List[torch.Tensor], labels: torch.Tensor) -> List[float]:
    """
    计算几何平均值 GMean = sqrt(TPR * TNR)
    适用于二分类问题，这里将其扩展到多分类
    """
    gmeans = []
    
    for i, output in enumerate(outputs):
        predictions = output.argmax(1).cpu().numpy()
        target = labels[:, i].cpu().numpy()
        
        # 对于多分类，我们计算每个类的召回率，然后取几何平均
        recalls = recall_score(target, predictions, average=None, zero_division=0)
        # 过滤掉0值，避免几何平均为0
        non_zero_recalls = recalls[recalls > 0]
        if len(non_zero_recalls) > 0:
            gmean = np.exp(np.mean(np.log(non_zero_recalls)))
        else:
            gmean = 0
        gmeans.append(gmean)
    
    return gmeans


def calculate_auc(outputs: List[torch.Tensor], labels: torch.Tensor, num_classes: int) -> List[float]:
    """
    计算每个位置的AUC值 (ROC曲线下面积)
    """
    aucs = []
    
    for i, output in enumerate(outputs):
        probs = F.softmax(output, dim=1).cpu().numpy()
        target = labels[:, i].cpu().numpy()
        
        # 将标签转为one-hot编码
        target_one_hot = np.zeros((target.size, num_classes))
        for j in range(target.size):
            target_one_hot[j, target[j]] = 1
        
        # 计算每个类别的AUC，然后取平均
        try:
            auc = roc_auc_score(target_one_hot, probs, average='macro', multi_class='ovr')
        except ValueError:
            # 某些类别可能没有样本，导致AUC计算失败
            auc = 0
        
        aucs.append(auc)
    
    return aucs


def plot_confusion_matrix(cm: np.ndarray, classes: Optional[List[str]] = None, normalize: bool = False) -> plt.Figure:
    """
    绘制混淆矩阵
    """
    if normalize:
        cm = cm.astype('float') / cm.sum(axis=1)[:, np.newaxis]
        cm = np.nan_to_num(cm)  # 替换NaN为0
    
    fig, ax = plt.subplots(figsize=(10, 10))
    sns.heatmap(cm, annot=False, fmt='.2f' if normalize else 'd', 
                cmap='Blues', square=True, ax=ax)
    
    # 设置标签
    if classes:
        tick_marks = np.arange(len(classes))
        # 将横坐标标签竖向显示
        plt.xticks(tick_marks + 0.5, classes, rotation=90, verticalalignment='top')
        plt.yticks(tick_marks + 0.5, classes, rotation=0)
    
    plt.ylabel('真实标签')
    plt.xlabel('预测标签')
    plt.tight_layout()
    
    return fig


def plot_sample_predictions(images: torch.Tensor, predictions: torch.Tensor, 
                          targets: torch.Tensor, char_set: str, num_samples: int = 20) -> plt.Figure:
    """
    绘制样本预测结果
    """
    # 选择最多num_samples个样本
    num_samples = min(num_samples, images.size(0))
    indices = np.random.choice(images.size(0), num_samples, replace=False)
    
    # 计算网格尺寸
    grid_size = int(np.ceil(np.sqrt(num_samples)))
    
    fig, axes = plt.subplots(grid_size, grid_size, figsize=(15, 15))
    axes = axes.flatten()
    
    for i, idx in enumerate(indices):
        if i >= len(axes):
            break
            
        # 获取图像和转换为PIL格式
        img = images[idx].cpu().squeeze().numpy()
        axes[i].imshow(img, cmap='gray')
        
        # 获取预测和真实标签
        pred_chars = ''.join([char_set[p] for p in predictions[idx]])
        true_chars = ''.join([char_set[t] for t in targets[idx]])
        
        # 设置标题和隐藏坐标轴
        color = 'green' if pred_chars == true_chars else 'red'
        axes[i].set_title(f'预测: {pred_chars}\n真实: {true_chars}', color=color)
        axes[i].axis('off')
    
    # 隐藏空白子图
    for i in range(num_samples, len(axes)):
        axes[i].axis('off')
    
    plt.tight_layout()
    return fig


def fig_to_image(fig: plt.Figure) -> torch.Tensor:
    """
    将matplotlib图转换为torch张量，用于TensorBoard
    """
    buf = io.BytesIO()
    fig.savefig(buf, format='png')
    plt.close(fig)
    buf.seek(0)
    
    image = Image.open(buf)
    image = transforms.ToTensor()(image)
    return image 