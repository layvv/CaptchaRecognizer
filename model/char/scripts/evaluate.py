import json
import os
import time
from typing import Dict, List, Any, Optional

import matplotlib.pyplot as plt
import numpy as np
import pandas as pd
import seaborn as sns
import torch
from sklearn.metrics import confusion_matrix, classification_report, precision_recall_fscore_support
from torch.utils.data import DataLoader
from tqdm import tqdm

from model.char.config import config
from model.char.data.dataset import CaptchaDataset
from model.char.models.base_model import BaseModel


def evaluate_model(
    model: BaseModel,
    dataset_name: str = 'test',
    batch_size: int = None,
    save_dir: str = None,
    verbose: bool = True,
    num_samples: Optional[int] = None
) -> Dict[str, Any]:
    """评估模型性能
    
    Args:
        model: 要评估的模型
        dataset_name: 数据集名称，可以是'test'、'valid'或其他自定义数据集
        batch_size: 批大小，如果为None则使用配置中的批大小
        save_dir: 保存评估结果的目录，如果为None则使用模型实验目录下的eval目录
        verbose: 是否打印详细信息
        num_samples: 限制样本数量
    
    Returns:
        评估结果字典
    """
    # 确保模型处于评估模式
    model.eval()
    device = model.device
    
    # 设置批大小
    if batch_size is None:
        batch_size = config.BATCH_SIZE
    
    # 设置保存目录
    if save_dir is None:
        save_dir = os.path.join(model.experiment_dir, 'eval')
    os.makedirs(save_dir, exist_ok=True)
    
    # 准备结果目录
    timestamp = time.strftime("%Y%m%d_%H%M%S")
    eval_dir = os.path.join(save_dir, f'{dataset_name}_{timestamp}')
    os.makedirs(eval_dir, exist_ok=True)
    
    # 加载数据集
    if dataset_name == 'test':
        # 使用测试集
        dataset = CaptchaDataset(mode='test', num_samples=num_samples)
    elif dataset_name == 'valid':
        # 使用验证集
        dataset = CaptchaDataset(mode='valid', num_samples=num_samples)
    else:
        # 可以在这里添加加载自定义数据集的代码
        raise ValueError(f"未知的数据集名称: {dataset_name}")
    
    data_loader = DataLoader(
        dataset,
        batch_size=batch_size,
        shuffle=False,
        num_workers=config.NUM_WORKERS,
        pin_memory=config.PIN_MEMORY
    )
    
    # 初始化指标
    total_loss = 0
    all_preds = []
    all_labels = []
    all_confidences = []
    all_images = []
    
    # 遍历数据集
    progress_bar = tqdm(data_loader, desc=f'Evaluating {dataset_name}') if verbose else data_loader
    
    with torch.no_grad():
        for images, labels in progress_bar:
            images = images.to(device)
            labels = labels.to(device)
            
            # 前向传播
            outputs = model(images)
            
            # 计算损失
            loss = sum(model.criterion(output, labels[:, i]) for i, output in enumerate(outputs))
            
            # 获取预测和置信度
            batch_preds = []
            batch_confidences = []
            
            for i, output in enumerate(outputs):
                probs = torch.softmax(output, dim=1)
                confidences, preds = torch.max(probs, dim=1)
                batch_preds.append(preds)
                batch_confidences.append(confidences)
            
            # 收集结果
            batch_preds = torch.stack(batch_preds, dim=1)
            batch_confidences = torch.stack(batch_confidences, dim=1)
            
            all_preds.append(batch_preds.cpu())
            all_labels.append(labels.cpu())
            all_confidences.append(batch_confidences.cpu())
            
            if len(all_images) < 100:  # 只保存一部分图像用于可视化
                all_images.append(images.cpu())
            
            # 更新总损失
            total_loss += loss.item()
    
    # 合并所有批次的结果
    all_preds = torch.cat(all_preds, dim=0)
    all_labels = torch.cat(all_labels, dim=0)
    all_confidences = torch.cat(all_confidences, dim=0)
    
    # 计算总体准确率
    total_chars = all_preds.numel()
    correct_chars = (all_preds == all_labels).sum().item()
    char_accuracy = correct_chars / total_chars
    
    # 计算每个位置的准确率
    position_accuracies = []
    for i in range(config.CAPTCHA_LENGTH):
        pos_acc = (all_preds[:, i] == all_labels[:, i]).float().mean().item()
        position_accuracies.append(pos_acc)
    
    # 计算完整验证码的准确率
    captcha_correct = torch.all(all_preds == all_labels, dim=1).float().mean().item()
    
    # 计算精确率、召回率和F1值 (字符级别)
    all_preds_flat = all_preds.flatten().numpy()
    all_labels_flat = all_labels.flatten().numpy()
    
    precision, recall, f1, _ = precision_recall_fscore_support(
        all_labels_flat, all_preds_flat, average='macro'
    )
    
    # 计算每个字符的混淆矩阵
    cm = confusion_matrix(all_labels_flat, all_preds_flat, labels=range(config.NUM_CLASSES))
    
    # 生成每个字符的分类报告
    class_report = classification_report(
        all_labels_flat, all_preds_flat, 
        labels=range(config.NUM_CLASSES),
        target_names=[f"{c}" for c in config.CHAR_SET],
        output_dict=True
    )
    
    # 分析错误
    errors = []
    for i in range(len(all_labels)):
        if not torch.all(all_preds[i] == all_labels[i]).item():
            # 找出错误的位置
            error_positions = [j for j in range(config.CAPTCHA_LENGTH) if all_preds[i, j] != all_labels[i, j]]
            
            # 构建错误信息
            pred_text = ''.join([config.CHAR_SET[idx] for idx in all_preds[i].numpy()])
            true_text = ''.join([config.CHAR_SET[idx] for idx in all_labels[i].numpy()])
            
            error_info = {
                'index': i.item(),
                'prediction': pred_text,
                'true_label': true_text,
                'error_positions': error_positions,
                'confidences': all_confidences[i].tolist()
            }
            errors.append(error_info)
    
    # 计算平均损失
    avg_loss = total_loss / len(data_loader)
    
    # 准备结果字典
    results = {
        'dataset': dataset_name,
        'num_samples': len(dataset),
        'avg_loss': avg_loss,
        'char_accuracy': char_accuracy,
        'position_accuracies': position_accuracies,
        'captcha_accuracy': captcha_correct,
        'precision': precision,
        'recall': recall,
        'f1_score': f1,
        'errors': errors,
        'timestamp': timestamp,
        'model_type': model.model_type
    }
    
    # 保存评估结果
    if save_dir is not None:
        # 保存基础指标
        metrics_file = os.path.join(eval_dir, 'metrics.json')
        with open(metrics_file, 'w') as f:
            # 将numpy数组转换为列表以便JSON序列化
            json_results = {k: v if not isinstance(v, np.ndarray) else v.tolist() 
                          for k, v in results.items() if k != 'errors'}
            json.dump(json_results, indent=4, fp=f)
        
        # 保存分类报告
        report_file = os.path.join(eval_dir, 'classification_report.json')
        with open(report_file, 'w') as f:
            json.dump(class_report, indent=4, fp=f)
        
        # 保存错误案例
        if errors:
            error_file = os.path.join(eval_dir, 'errors.json')
            with open(error_file, 'w') as f:
                json.dump(errors, indent=4, fp=f)
        
        # 绘制并保存混淆矩阵热图
        plt.figure(figsize=(15, 15))
        sns.heatmap(cm, cmap='Blues', annot=False)
        plt.title('Character-Level Confusion Matrix')
        plt.xlabel('Predicted Characters')
        plt.ylabel('True Characters')
        plt.savefig(os.path.join(eval_dir, 'confusion_matrix.png'), dpi=200, bbox_inches='tight')
        plt.close()
        
        # 保存字符位置准确率柱状图
        plt.figure(figsize=(10, 6))
        positions = [f'Position {i+1}' for i in range(config.CAPTCHA_LENGTH)]
        plt.bar(positions, position_accuracies)
        plt.title('Character Position Accuracy')
        plt.xlabel('Position')
        plt.ylabel('Accuracy')
        plt.ylim(0, 1)
        for i, v in enumerate(position_accuracies):
            plt.text(i, v + 0.01, f'{v:.4f}', ha='center')
        plt.savefig(os.path.join(eval_dir, 'position_accuracy.png'))
        plt.close()
        
        # 保存一些示例图像及其预测结果
        if all_images:
            # 将所有批次的图像合并
            all_images = torch.cat(all_images, dim=0)
            
            # 选择一些正确和错误的样本
            num_samples = min(16, all_images.shape[0])
            fig, axes = plt.subplots(4, 4, figsize=(15, 15))
            axes = axes.flatten()
            
            # 优先选择错误的样例
            error_indices = [e['index'] for e in errors[:num_samples]]
            num_errors = len(error_indices)
            
            # 如果错误样例不足，添加一些正确的样例
            if num_errors < num_samples:
                correct_indices = [i for i in range(len(all_labels)) 
                               if torch.all(all_preds[i] == all_labels[i]).item()]
                correct_indices = correct_indices[:num_samples-num_errors]
                sample_indices = error_indices + correct_indices
            else:
                sample_indices = error_indices[:num_samples]
            
            for i, idx in enumerate(sample_indices):
                if idx < all_images.shape[0]:
                    img = all_images[idx].permute(1, 2, 0).numpy()
                    img = img * 0.5 + 0.5  # 反归一化
                    
                    pred_text = ''.join([config.CHAR_SET[j] for j in all_preds[idx].numpy()])
                    true_text = ''.join([config.CHAR_SET[j] for j in all_labels[idx].numpy()])
                    
                    axes[i].imshow(img)
                    match = "✓" if pred_text == true_text else "✗"
                    axes[i].set_title(f'{match} Pred: {pred_text}\nTrue: {true_text}')
                    axes[i].axis('off')
            
            plt.savefig(os.path.join(eval_dir, 'sample_predictions.png'))
            plt.close()
    
    # 打印评估结果摘要
    if verbose:
        print(f"\n===== 模型评估结果 ({dataset_name}) =====")
        print(f"样本数量: {len(dataset)}")
        print(f"平均损失: {avg_loss:.4f}")
        print(f"字符准确率: {char_accuracy:.4f} ({correct_chars}/{total_chars})")
        print(f"验证码准确率: {captcha_correct:.4f}")
        print(f"字符精确率: {precision:.4f}")
        print(f"字符召回率: {recall:.4f}")
        print(f"字符F1值: {f1:.4f}")
        print(f"字符位置准确率: {[f'{acc:.4f}' for acc in position_accuracies]}")
        print(f"错误案例数量: {len(errors)}")
        print(f"结果已保存到: {eval_dir}")
    
    return results


def compare_models(
    model_dir: str,
    dataset_name: str = 'test',
    save_dir: str = None,
    verbose: bool = True
) -> pd.DataFrame:
    """比较多个模型的性能
    
    Args:
        model_dir: 模型目录列表
        dataset_name: 数据集名称，可以是'test'、'valid'或其他自定义数据集
        save_dir: 保存比较结果的目录
        verbose: 是否打印详细信息
    
    Returns:
        比较结果DataFrame
    """
    if save_dir is None:
        save_dir = os.path.join(config.EXPERIMENT_ROOT, 'comparisons')
    os.makedirs(save_dir, exist_ok=True)
    
    timestamp = time.strftime("%Y%m%d_%H%M%S")
    comparison_dir = os.path.join(save_dir, f'comparison_{timestamp}')
    os.makedirs(comparison_dir, exist_ok=True)
    
    results = []

    model_paths = [os.path.abspath(m) for m in os.listdir(model_dir)]
    
    # 加载并评估每个模型
    for model_path in model_paths:
        model_name = os.path.basename(model_path)
        if verbose:
            print(f"\n正在评估模型: {model_name}")
        
        # 加载模型
        from model.char.utils.model_util import load_model

        try:
            model = load_model(model_path)
            
            # 评估模型
            eval_result = evaluate_model(
                model=model,
                dataset_name=dataset_name,
                save_dir=os.path.join(comparison_dir, model_name),
                verbose=verbose
            )
            
            # 添加模型名称
            eval_result['model_name'] = model_name
            results.append(eval_result)
            
        except Exception as e:
            print(f"加载或评估模型 {model_name} 时出错: {str(e)}")
    
    # 创建比较DataFrame
    if results:
        # 提取关键指标
        df_data = []
        for result in results:
            row = {
                'model_name': result['model_name'],
                'model_type': result['model_type'],
                'loss': result['avg_loss'],
                'char_accuracy': result['char_accuracy'],
                'captcha_accuracy': result['captcha_accuracy'],
                'precision': result['precision'],
                'recall': result['recall'],
                'f1_score': result['f1_score']
            }
            
            # 添加位置准确率
            for i, acc in enumerate(result['position_accuracies']):
                row[f'pos_{i}_acc'] = acc
                
            df_data.append(row)
        
        # 创建DataFrame
        comparison_df = pd.DataFrame(df_data)
        
        # 保存比较结果
        csv_path = os.path.join(comparison_dir, 'model_comparison.csv')
        comparison_df.to_csv(csv_path, index=False)
        
        # 绘制对比柱状图
        metrics = ['char_accuracy', 'captcha_accuracy', 'precision', 'recall', 'f1_score']
        
        plt.figure(figsize=(15, 10))
        for i, metric in enumerate(metrics):
            plt.subplot(2, 3, i+1)
            sns.barplot(x='model_name', y=metric, data=comparison_df)
            plt.title(f'Models Comparison - {metric}')
            plt.xticks(rotation=45)
            plt.ylim(0, 1)
            
        plt.tight_layout()
        plt.savefig(os.path.join(comparison_dir, 'metrics_comparison.png'))
        plt.close()
        
        # 位置准确率对比
        plt.figure(figsize=(15, 8))
        pos_cols = [col for col in comparison_df.columns if col.startswith('pos_')]
        
        # 将数据重新组织为长格式
        pos_data = []
        for _, row in comparison_df.iterrows():
            model_name = row['model_name']
            for col in pos_cols:
                pos_idx = int(col.split('_')[1])
                pos_data.append({
                    'model_name': model_name,
                    'position': f'Pos {pos_idx+1}',
                    'accuracy': row[col]
                })
        
        pos_df = pd.DataFrame(pos_data)
        
        # 绘制位置准确率对比
        sns.barplot(x='position', y='accuracy', hue='model_name', data=pos_df)
        plt.title('Character Position Accuracy Comparison')
        plt.ylim(0, 1)
        plt.legend(title='Model')
        plt.savefig(os.path.join(comparison_dir, 'position_accuracy_comparison.png'))
        plt.close()
        
        if verbose:
            print(f"\n===== 模型比较结果 =====")
            print(comparison_df)
            print(f"\n结果已保存到: {comparison_dir}")
        
        return comparison_df
    else:
        if verbose:
            print("没有有效的评估结果可比较")
        return pd.DataFrame()


if __name__ == "__main__":
    
    # 加载模型
    from model.char.utils.model_util import load_model
    model = load_model('model_path')
    
    # 评估模型
    evaluate_model(model)

    # 比较模型
    # compare_models(config.EXPORT_ROOT)