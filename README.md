# 验证码识别系统

## 指标追踪与模型评估功能

本项目使用TensorBoard和自定义指标追踪系统，提供全面的模型训练和评估功能。

### 主要功能

- **全面的指标追踪**：记录并可视化损失、准确率、学习率、字符准确率等多种指标
- **TensorBoard集成**：实时监控训练进度，直观展示模型性能变化
- **详细的评估报告**：生成混淆矩阵、精确率、召回率、F1值等详细评估指标
- **模型比较**：对比不同模型在相同测试集上的性能
- **错误分析**：对识别错误的样本进行详细分析和可视化

### 使用方法

#### 安装依赖

```bash
pip install -r requirements.txt
```

#### 训练模型

```bash
# 基本训练
python -m model.char.scripts.train train

# 指定模型类型和参数
python -m model.char.scripts.train train --model_type resnet --epochs 50 --batch_size 128 --learning_rate 0.001
```

#### 评估模型

```bash
# 在测试集上评估模型
python -m model.char.scripts.train evaluate --model_dir experiments/2023_0101_12_00_00_resnet

# 在验证集上评估模型
python -m model.char.scripts.train evaluate --model_dir experiments/2023_0101_12_00_00_resnet --dataset valid
```

#### 比较多个模型

```bash
# 比较多个模型的性能
python -m model.char.scripts.train compare --model_dirs experiments/2023_0101_12_00_00_resnet experiments/2023_0101_13_00_00_cnn
```

### 指标可视化

训练过程中，所有指标会保存在实验目录下的`logs`、`plots`和`eval`子目录中：

- 使用TensorBoard查看实时训练指标：
  ```bash
  tensorboard --logdir=experiments/2023_0101_12_00_00_resnet/logs
  ```

- 查看生成的图表和评估报告：
  ```
  experiments/
  └── 2023_0101_12_00_00_resnet/
      ├── logs/           # TensorBoard日志
      ├── checkpoints/    # 模型检查点
      ├── plots/          # 训练曲线图表
      │   ├── loss_curves.png
      │   ├── accuracy_curves.png
      │   ├── char_accuracy_curves.png
      │   └── ...
      ├── eval/           # 评估报告
      │   ├── metrics.json
      │   ├── classification_report.json
      │   ├── confusion_matrix.png
      │   ├── position_accuracy.png
      │   ├── sample_predictions.png
      │   └── ...
      └── comparisons/    # 模型比较结果
          ├── model_comparison.csv
          ├── metrics_comparison.png
          └── ...
  ```
