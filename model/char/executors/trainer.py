import os
from datetime import datetime
from typing import Union, List

import torch
from torch import nn
from torch.utils.data import DataLoader
from tqdm import tqdm

from model.char.config import config
from model.char.data.dataset import CaptchaDataset
from model.char.models import BaseModel
from model.char.utils.model_util import save_final_model, save_checkpoint
from model.char.utils.tensorboard_util import TensorboardLogger
from model.char.utils.evaluator import ModelEvaluator


class Trainer:
    best_valid_loss = float('inf')
    best_valid_acc = 0.0
    train_losses = []
    valid_losses = []
    train_accs = []
    valid_accs = []
    learning_rates = []
    no_improve = 0
    early_stop = False
    experiment_dir = None
    train_dataset = None
    valid_dataset = None
    test_dataset = None
    train_loader = None
    valid_loader = None
    test_loader = None
    current_epoch = 0
    training_time = 0

    def __init__(self, model: BaseModel):
        self.device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        model.to(self.device)

        self.optimizer = torch.optim.AdamW(
            model.parameters(),
            lr=config.LR,
            weight_decay=config.WEIGHT_DECAY
        )

        self.scheduler = torch.optim.lr_scheduler.ReduceLROnPlateau(
            self.optimizer,
            mode='max',
            factor=config.LR_DECAY_FACTOR,
            patience=config.LR_DECAY_PATIENCE,
            min_lr=config.MIN_LR
        )

        self.criterion = nn.CrossEntropyLoss(label_smoothing=config.LABEL_SMOOTHING)

        self.model = model

        self.experiment_dir = os.path.join(
            config.EXPERIMENT_ROOT,
            config.EXPERIMENT_FORMAT.format(
                model_name=model.model_name,
                timestamp=datetime.now().strftime("%Y-%m-%d_%H-%M-%S")
            )
        )
        os.makedirs(self.experiment_dir, exist_ok=True)

        # 初始化tensorboard记录器
        self.logger = TensorboardLogger(os.path.join(self.experiment_dir, 'logs'))
        
        # 初始化评估器
        self.evaluator = ModelEvaluator(model, self.device)

    def load_data(self, num_samples: int = None):
        print(f"开始加载数据集..."
              f"(数据集路径: {config.DATA_ROOT})"
              )
        # 加载数据集
        self.train_dataset = CaptchaDataset('train', num_samples)
        self.valid_dataset = CaptchaDataset('valid', num_samples)
        self.test_dataset = CaptchaDataset('test', num_samples)
        print(f"数据集加载完成，训练集样本数: {len(self.train_dataset)}, "
              f"验证集样本数: {len(self.valid_dataset)}, "
              f"测试集样本数: {len(self.test_dataset)}")

        # 数据加载器
        self.train_loader = DataLoader(
            self.train_dataset,
            batch_size=config.BATCH_SIZE,
            shuffle=True,
            num_workers=config.NUM_WORKERS,
            pin_memory=config.PIN_MEMORY,
        )

        self.valid_loader = DataLoader(
            self.valid_dataset,
            batch_size=config.BATCH_SIZE,
            shuffle=False,
            num_workers=config.NUM_WORKERS,
            pin_memory=config.PIN_MEMORY,
        )

        self.test_loader = DataLoader(
            self.test_dataset,
            batch_size=config.BATCH_SIZE,
            shuffle=False,
            num_workers=config.NUM_WORKERS,
            pin_memory=config.PIN_MEMORY,
        )

    def log_start_info(self):
        """打印训练信息"""
        info = {
            "模型": self.model.model_name,
            "GPU": torch.cuda.get_device_name(0) if torch.cuda.is_available() else "CPU",
            "训练样本": len(self.train_dataset),
            "验证样本": len(self.valid_dataset),
            "测试样本": len(self.test_dataset),
            "批次大小": config.BATCH_SIZE,
            "学习率": config.LR,
            "权重衰减": config.WEIGHT_DECAY,
            "最大轮次": config.EPOCHS,
            "字符长度": config.CAPTCHA_LENGTH,
            "字符类别": config.NUM_CLASSES,
            "图像大小": config.IMAGE_SIZE
        }

        print("\n" + "=" * 50)
        print(f"{'训练配置':^50}")
        print("=" * 50)
        for key, value in info.items():
            print(f"{key:>15}: {value}")
        print("=" * 50 + "\n")

    def train(self, num_samples: int = None):
        start_time = datetime.now()
        self.load_data(num_samples)

        self.log_start_info()

        for epoch in range(1, config.EPOCHS + 1):
            self.current_epoch = epoch
            train_loss, train_acc = self.train_epoch()
            valid_loss, valid_acc = self.validate()

            # 更新学习率
            if isinstance(self.scheduler, torch.optim.lr_scheduler.ReduceLROnPlateau):
                self.scheduler.step(valid_acc)
            else:
                self.scheduler.step()
            # 记录指标
            current_lr = self.optimizer.param_groups[0]['lr']
            self.train_losses.append(train_loss)
            self.train_accs.append(train_acc)
            self.valid_losses.append(valid_loss)
            self.valid_accs.append(valid_acc)
            self.learning_rates.append(current_lr)

            # 记录到tensorboard
            self.logger.log_loss(train_loss, epoch, 'train')
            self.logger.log_loss(valid_loss, epoch, 'valid')
            self.logger.log_accuracy(train_acc, epoch, 'train')
            self.logger.log_accuracy(valid_acc, epoch, 'valid')
            self.logger.log_learning_rate(current_lr, epoch)

            # 保存最佳模型
            if valid_acc > self.best_valid_acc:
                self.best_valid_acc = valid_acc
                self.best_valid_loss = valid_loss
                self.no_improve = 0
            else:
                self.no_improve += 1

            # 打印进度
            print(f"Epoch {epoch}/{config.EPOCHS} | "
                  f"[Train Loss/Acc: {train_loss:.4f}/{train_acc * 100:.2f}%] | "
                  f"[Valid Loss/Acc: {valid_loss:.4f}/{valid_acc * 100:.2f}%] | "
                  f"LR: {current_lr} | "
                  f"No Improve: {self.no_improve} | "
                  f"Best Acc: {self.best_valid_acc * 100:.2f}%"
                  )

            # 早停
            if config.EARLY_STOPPING and self.no_improve >= config.PATIENCE:
                print(f"Early stopping triggered after {epoch} epochs")
                self.early_stop = True
                break

            save_checkpoint(self)

        end_time = datetime.now()
        delta = end_time - start_time
        minutes, seconds = divmod(delta.seconds + delta.days * 86400, 60)
        self.training_time = f"{minutes} min {seconds} s"
        print(f"✅ 训练完成！"
              f"⏱️ 训练时间: {self.training_time}"
              )
        
        # 保存最终模型
        save_final_model(self)
        
        # 在测试集上评估
        print("\n开始测试集评估...")
        test_metrics = self.evaluator.evaluate(self.test_loader, self.logger, self.current_epoch)
        self.evaluator.save_evaluation_results(test_metrics, self.experiment_dir, self.model.model_name)
        
        # 关闭tensorboard记录器
        self.logger.close()
        
        return

    def train_epoch(self):
        self.model.train()
        total_loss = 0
        total_acc = 0
        progress_bar = tqdm(
            self.train_loader,
            desc=f'Train Epoch {self.current_epoch}/{config.EPOCHS}',
            leave=False
        )
        for _, (images, labels) in enumerate(progress_bar):
            images: torch.Tensor = images.to(self.device)
            labels: torch.Tensor = labels.to(self.device)

            # 前向传播
            outputs: List[torch.Tensor] = self.model(images)

            # 计算多任务损失
            loss = sum(self.criterion(output, labels[:, i]) for i, output in enumerate(outputs))

            # 反向传播
            self.optimizer.zero_grad()
            loss.backward()
            torch.nn.utils.clip_grad_norm_(self.model.parameters(), max_norm=2.0)
            self.optimizer.step()

            # 计算指标
            total_loss += loss.item()
            full_acc = self.calculate_accuracy(outputs, labels)
            total_acc += full_acc

            # 实时更新进度信息
            progress_bar.set_postfix({
                'loss': f'{loss.item():.4f}',
                'acc': f'{full_acc * 100:.2f}%',
                'lr': f'{self.optimizer.param_groups[0]["lr"]:.2e}'
            })

        return total_loss / len(self.train_loader), total_acc / len(self.train_loader)

    def validate(self):
        self.model.eval()  # 设置为评估模式
        # 在不计算梯度的情况下进行前向传播
        total_loss = 0
        total_acc = 0
        all_preds = []
        all_labels = []
        all_images = []
        all_predictions = []
        
        progress_bar = tqdm(
            self.valid_loader,
            desc=f"Valid Epoch {self.current_epoch}/{config.EPOCHS}",
            leave=False
        )
        with torch.no_grad():
            for images, labels in progress_bar:
                images: torch.Tensor = images.to(self.device)
                labels: torch.Tensor = labels.to(self.device)

                # 前向传播
                outputs: List[torch.Tensor] = self.model(images)

                # 计算损失
                loss = sum(self.criterion(output, labels[:, i]) for i, output in enumerate(outputs))

                # 计算准确率
                predictions = torch.stack([output.argmax(1) for output in outputs], dim=1)
                correct = (predictions == labels).all(dim=1).sum().item()
                total_acc += correct

                # 收集预测结果
                all_preds.extend(predictions.cpu().numpy().flatten())
                all_labels.extend(labels.cpu().numpy().flatten())
                all_images.append(images.cpu())
                all_predictions.append([output.cpu() for output in outputs])

                # 更新进度条
                progress_bar.set_postfix({
                    'loss': f'{loss.item():.4f}',
                    'acc': f'{correct / labels.size(0) * 100:.2f}%'
                })
                # 更新总和
                total_loss += loss.item()

        # 计算平均值
        val_loss = total_loss / len(self.valid_loader)
        val_acc = total_acc / len(self.valid_dataset)

        # 记录到tensorboard
        if self.current_epoch % 5 == 0:  # 每5个epoch记录一次
            # 记录混淆矩阵
            self.logger.log_confusion_matrix(all_labels, all_preds, self.current_epoch, 'valid')
            
            # 记录样本预测结果
            all_images = torch.cat(all_images, dim=0)
            all_predictions = [torch.cat([pred[i] for pred in all_predictions], dim=0) 
                             for i in range(config.CAPTCHA_LENGTH)]
            self.logger.log_sample_predictions(
                all_images, 
                torch.tensor(all_labels).view(-1, config.CAPTCHA_LENGTH),
                all_predictions,
                self.current_epoch,
                phase='valid'
            )

        return val_loss, val_acc

    @staticmethod
    def calculate_accuracy(outputs: List[torch.Tensor], labels: torch.Tensor) -> float:
        """
        计算多任务模型的准确率
        """
        predictions = torch.stack([output.argmax(1) for output in outputs], dim=1)
        correct = (predictions == labels).all(dim=1).sum().item()
        return correct / labels.size(0)
