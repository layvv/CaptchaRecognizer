from collections import defaultdict

import torch
import torch.nn.functional as F
from torch import nn
from torch.utils.data import DataLoader
from tqdm import tqdm

from model.char.config import BaseConfig
from model.char.utils.file_util import create_experiment_dir, save_final_model, save_checkpoint, log_startup_info, \
    save_manager
from model.char.utils.visualizer import Visualizer


class BasicBlock(nn.Module):
    def __init__(self, in_channels, out_channels, stride=1):
        super().__init__()
        self.conv1 = nn.Conv2d(
            in_channels, out_channels, kernel_size=3,
            stride=stride, padding=1, bias=False
        )
        self.bn1 = nn.BatchNorm2d(out_channels)
        self.conv2 = nn.Conv2d(
            out_channels, out_channels, kernel_size=3,
            stride=1, padding=1, bias=False
        )
        self.bn2 = nn.BatchNorm2d(out_channels)
        self.shortcut = nn.Sequential()
        if stride != 1 or in_channels != out_channels:
            self.shortcut = nn.Sequential(
                nn.Conv2d(in_channels, out_channels, kernel_size=1, stride=stride, bias=False),
                nn.BatchNorm2d(out_channels)
            )

    def forward(self, x):
        out = F.relu(self.bn1(self.conv1(x)))
        out = self.bn2(self.conv2(out))
        out += self.shortcut(x)
        return F.relu(out)


class ResNetMultiHead(nn.Module):
    name = 'resnet_multi_head'
    num_classes = BaseConfig.NUM_CLASSES
    captcha_length = BaseConfig.CAPTCHA_LENGTH
    batch_size = 128
    epochs = 150
    lr = 1e-3
    min_lr = 1e-6
    num_workers = 4
    pin_memory = True
    persistent_workers = True
    early_stop_patience = 10
    early_stop_delta = 0.002
    weight_decay = 0.05
    conv_dropout = 0.2
    shared_dropout = 0.3
    head_dropout = 0.2


    def __init__(self):
        super().__init__()

        # 重构特征提取层
        self.stem = nn.Sequential(
            nn.Conv2d(1, 32, 3, stride=1, padding=1, bias=False),
            nn.BatchNorm2d(32),
            nn.ReLU(inplace=True),
            nn.MaxPool2d(kernel_size=3, stride=2, padding=1)
        )

        # 构建残差块序列
        self.layer1 = self._make_layer(block=BasicBlock, in_channels=32, out_channels=64, blocks=2, stride=1)
        self.layer2 = self._make_layer(block=BasicBlock, in_channels=64, out_channels=128, blocks=2, stride=2)
        self.layer3 = self._make_layer(block=BasicBlock, in_channels=128, out_channels=256, blocks=2, stride=2)

        # 添加SE注意力模块
        self.se = nn.Sequential(
            nn.AdaptiveAvgPool2d(1),
            nn.Conv2d(256, 64, kernel_size=1),
            nn.ReLU(inplace=True),
            nn.Conv2d(64, 256, kernel_size=1),
            nn.Sigmoid()
        )

        # 修改分类头前的池化层
        self.global_pool = nn.AdaptiveAvgPool2d(1)  # 自适应池化

        self.shared_fc = nn.Sequential(
            nn.Linear(256, 512),  # 直接使用SE模块的输出通道数
            nn.BatchNorm1d(512),
            nn.ReLU(),
            nn.Dropout(self.shared_dropout)
        )

        # 多任务头
        self.heads = nn.ModuleList([
            nn.Sequential(
                nn.Linear(512, 256),
                nn.BatchNorm1d(256),
                nn.ReLU(),
                nn.Dropout(self.head_dropout),
                nn.Linear(256, self.num_classes)
            ) for _ in range(self.captcha_length)
        ])

        self._init_weights()  # 权重初始化

    @staticmethod
    def _make_layer(block, in_channels, out_channels, blocks, stride=1):
        layers = [block(in_channels, out_channels, stride)]
        for _ in range(1, blocks):
            layers.append(block(out_channels, out_channels))
        return nn.Sequential(*layers)

    def _init_weights(self):
        # 只初始化未加载的参数
        for m in self.modules():
            if isinstance(m, nn.Conv2d):
                nn.init.kaiming_normal_(m.weight, mode='fan_out', nonlinearity='relu')
            elif isinstance(m, nn.BatchNorm2d):
                nn.init.constant_(m.weight, 1)
                nn.init.constant_(m.bias, 0)
        # 头部网络特殊初始化（会被预训练参数覆盖）
        for head in self.heads:
            nn.init.normal_(head[-1].weight, mean=0, std=0.01)

    def _init_training_config(self):
        # 初始化设备
        self.device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        self.to(self.device)  # 将模型移动到设备

        # 优化器
        self.optimizer = torch.optim.AdamW(
            self.parameters(),
            lr=self.lr,
            weight_decay=self.weight_decay
        )
        self.scheduler = torch.optim.lr_scheduler.ReduceLROnPlateau(
            self.optimizer,
            mode='max',
            factor=0.3,
            patience=5,
            min_lr=self.min_lr
        )

        # 损失函数
        self.criterion = nn.CrossEntropyLoss(label_smoothing=0.1)

    def _init_training_state(self):
        """训练状态初始化"""
        self.best_val_loss = float('inf')
        self.best_val_acc = 0.0
        self.train_losses = []
        self.val_losses = []
        self.train_accs = []
        self.val_accs = []
        self.learning_rates = []
        self.no_improve_counter = 0
        self.is_early_stop = False
        # 验证集字符统计
        self.val_char_distribution = defaultdict(lambda: {'total': 0, 'correct': 0})
        # 实验目录
        self.experiment_dir = create_experiment_dir(
            model_name=self.name,
            model_params={
                'batch_size': self.batch_size,
                'lr': self.lr,
            }
        )
        self.visualizer = Visualizer(self.experiment_dir)

    def _load_data(self, num_samples=None):

        from model.char.data.dataset import CaptchaDataset

        # 加载数据集
        self.train_dataset = CaptchaDataset(num_samples, 'train')
        self.val_dataset = CaptchaDataset(num_samples, 'valid')

        # 构建数据信息
        data_info = {
            "训练集样本": len(self.train_dataset),
            "验证集样本": len(self.val_dataset),
            "图像尺寸": BaseConfig.IMAGE_SIZE,
            "字符长度": BaseConfig.CAPTCHA_LENGTH,
            "字符类别数": BaseConfig.NUM_CLASSES
        }

        # 打印美观的日志
        print("\n╭────────────────── Data Loading ───────────────────╮")
        for i, (k, v) in enumerate(data_info.items()):
            prefix = "│ " if i == 0 else "│ "
            print(f"{prefix}{k + ':':<14} {v}")
        print("╰───────────────────────────────────────────────────╯\n")

        # 数据加载器
        self.train_loader = DataLoader(
            self.train_dataset,
            batch_size=self.batch_size,
            shuffle=True,
            num_workers=self.num_workers,
            pin_memory=self.pin_memory,
            persistent_workers=self.persistent_workers if self.num_workers > 0 else False,
        )

        self.valid_loader = DataLoader(
            self.val_dataset,
            batch_size=self.batch_size,
            shuffle=False,
            num_workers=self.num_workers,
            pin_memory=self.pin_memory,
            persistent_workers=self.persistent_workers if self.num_workers > 0 else False,
        )

        # 在加载验证集后统计总字符数（只执行一次）
        for _, labels in tqdm(DataLoader(self.val_dataset, batch_size=self.batch_size), 
                            desc="统计验证集字符", total=len(self.val_dataset)//self.batch_size):
            for i in range(labels.size(0)):
                for j in range(labels.size(1)):
                    char_idx = labels[i][j].item()
                    char = BaseConfig.CHAR_SET[char_idx]
                    self.val_char_distribution[char]['total'] += 1

    def _forward_features(self, x):
        x = self.stem(x)
        x = self.layer1(x)
        x = self.layer2(x)
        x = self.layer3(x)
        x = self.se(x) * x  # SE注意力
        x = self.global_pool(x)
        return x.view(x.size(0), -1)

    def forward(self, x):
        # 特征提取
        x = self._forward_features(x)
        # 展平处理
        x = torch.flatten(x, 1)
        shared = self.shared_fc(x)
        return [head(shared) for head in self.heads]

    def _eval(self, epoch):
        self.eval()
        total_loss = 0
        total_acc = 0
        all_labels = []
        all_preds = []
        # 平均每个位置的正确率
        position_acc = [0.0] * self.captcha_length
        # 字符分布统计（只统计正确数）
        char_distribution = defaultdict(lambda: {'correct': 0, 'total': 0})
        # 初始化时使用预统计的总数
        for char, stats in self.val_char_distribution.items():
            char_distribution[char]['total'] = stats['total']

        with torch.no_grad():
            desc = f'valid Epoch {epoch}/{self.epochs}'
            val_bar = tqdm(
                self.valid_loader,
                desc=desc,
                leave=False
            )
            for images, labels in val_bar:
                images = images.to(self.device)
                labels = labels.to(self.device)
                outputs = self(images)
                loss = sum(self.criterion(output, labels[:, i]) for i, output in enumerate(outputs))

                full_acc, preds = self._calculate_accuracy(outputs, labels)
                total_loss += loss.item()
                total_acc += full_acc

                val_bar.set_postfix({
                    'loss': f'{loss.item():.4f}',
                    'acc': f'{full_acc * 100:.2f}%'
                })

                all_preds.extend(preds.cpu().numpy())
                all_labels.extend(labels.cpu().numpy())

                # 统计字符分布（只更新正确数）
                for i in range(labels.size(0)):
                    for j in range(labels.size(1)):
                        char_idx = labels[i][j].item()
                        char = BaseConfig.CHAR_SET[char_idx]
                        if preds[i][j] == labels[i][j]:
                            char_distribution[char]['correct'] += 1

                # 统计每个位置的准确率
                pos_correct = [0] * self.captcha_length
                for pos in range(self.captcha_length):
                    pos_correct[pos] += (preds[:, pos] == labels[:, pos]).sum().item()
                    position_acc[pos] = pos_correct[pos] / labels.size(0)

            # 记录混淆矩阵
            self.visualizer.log_confusion_matrix(all_labels, all_preds, epoch)

            # 记录位置正确率
            self.visualizer.log_char_pos_acc(position_acc, epoch)

            # 记录字符统计
            self.visualizer.log_char_distribution(char_distribution, epoch)

        return total_loss / len(self.valid_loader), total_acc / len(self.valid_loader)

    def _train(self, epoch):

        if torch.cuda.is_available():
            torch.cuda.reset_peak_memory_stats()

        self.train()
        total_loss = 0
        total_acc = 0
        progress_bar = tqdm(
            self.train_loader,
            desc=f'Train Epoch {epoch}/{self.epochs}',
            leave=False
        )
        for _, (images, labels) in enumerate(progress_bar):
            images = images.to(self.device)
            labels = labels.to(self.device)

            # 前向传播
            outputs = self(images)

            # 计算多任务损失
            loss = sum(self.criterion(output, labels[:, i]) for i, output in enumerate(outputs))

            # 反向传播
            self.optimizer.zero_grad()
            loss.backward()
            torch.nn.utils.clip_grad_norm_(self.parameters(), max_norm=2.0)
            self.optimizer.step()

            # 计算指标
            total_loss += loss.item()
            full_acc, _ = self._calculate_accuracy(outputs, labels)
            total_acc += full_acc

            # 实时更新进度信息
            progress_bar.set_postfix({
                'loss': f'{loss.item():.4f}',
                'acc': f'{full_acc * 100:.2f}%',
                'lr': f'{self.optimizer.param_groups[0]["lr"]:.2e}'
            })

        return total_loss / len(self.train_loader), total_acc / len(self.train_loader)

    @staticmethod
    def _calculate_accuracy(outputs, labels):
        with torch.no_grad():
            # 完全正确率
            preds = torch.stack([output.argmax(1) for output in outputs], dim=1)
            all_correct = (preds == labels).all(dim=1).sum().item()

            return all_correct / labels.size(0), preds

    def _check_early_stop(self, val_loss, epoch):
        # 早停机制
        if val_loss < self.best_val_loss - self.early_stop_delta:
            self.best_val_loss = val_loss
            self.no_improve_counter = 0
        else:
            self.no_improve_counter += 1
            if self.no_improve_counter >= self.early_stop_patience:
                print(f'Early stopping after {epoch} epochs')
                self.is_early_stop = True

    def start(self, num_samples=None):
        """训练入口方法"""
        self._init_training_config()

        self._init_training_state()

        self._load_data(num_samples)

        log_startup_info(self)

        for epoch in range(1, self.epochs + 1):

            # 一次epoch内, 训练集的平均损失和准确率
            train_loss, train_acc = self._train(epoch)

            # 验证阶段，返回一次epoch内, 验证集的平均损失和准确率
            val_loss, val_acc = self._eval(epoch)
            self.scheduler.step(val_acc)
            current_lr = self.optimizer.param_groups[0]['lr']

            self.train_losses.append(train_loss)
            self.train_accs.append(train_acc)
            self.val_losses.append(val_loss)
            self.val_accs.append(val_acc)
            self.learning_rates.append(current_lr)
            self.best_val_acc = max(self.best_val_acc, val_acc)

            # 记录标量数据
            self.visualizer.log_scalars('Loss', {
                'train': train_loss,
                'valid': val_loss
            }, epoch)

            self.visualizer.log_scalars('Accuracy', {
                'train': train_acc,
                'valid': val_acc
            }, epoch)

            self.visualizer.log_learning_rate(current_lr, epoch)

            # 记录权重分布
            for name, param in self.named_parameters():
                self.visualizer.log_histogram(name, param, epoch)

            save_checkpoint(self, epoch)

            self._check_early_stop(val_loss, epoch)

            if self.is_early_stop:
                break

            # 打印训练信息
            print(f'Epoch {epoch:02d} | '
                  f'Train Loss/Acc: {train_loss:.4f} / {train_acc * 100:.2f}% | '
                  f'Valid Loss/Acc: {val_loss:.4f} / {val_acc * 100:.2f}% | '
                  f'LR: {self.optimizer.param_groups[0]["lr"]:.2e} | '
                  f'No Improve: {self.no_improve_counter} | '
                  f'Best Loss: {self.best_val_loss:.2f} | '
                  f'Best Acc: {self.best_val_acc * 100:.2f}%'
                  )
        save_final_model(self)
        
        # 在训练结束后添加
        save_manager.shutdown()  # 确保所有任务完成
        print(f"🏁 训练完成！")
