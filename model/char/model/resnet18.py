import torch
import torchvision
from torch import nn
from torch.utils.data import DataLoader
from tqdm import tqdm

from model.char.config import BaseConfig
from model.char.data.dataset import CaptchaDataset
from model.char.utils import create_experiment_dir, save_checkpoint


class ResNet18MultiHead(nn.Module):
    name = 'resnet18_multi_head'
    batch_size = 64
    epochs = 50
    lr = 1e-3
    num_workers = 4
    pin_memory = True
    persistent_workers = True
    early_stop_patience = 10
    early_stop_delta = 0.001
    dropout = 0.5
    save_interval = 5  # 每5个epoch保存一次

    def __init__(self):
        super().__init__()
        self.num_classes = BaseConfig.NUM_CLASSES
        self.captcha_length = BaseConfig.CAPTCHA_LENGTH

        # 使用配置初始化网络
        self.backbone = torchvision.models.resnet18(weights='DEFAULT')
        in_features = self.backbone.fc.in_features
        self.backbone.fc = nn.Identity()

        self.heads = nn.ModuleList([
            nn.Sequential(
                nn.Dropout(self.dropout),
                nn.Linear(in_features, self.num_classes)
            ) for _ in range(self.captcha_length)
        ])

        # 优化器和学习率调度器
        self.optimizer = torch.optim.AdamW(self.parameters(), lr=self.lr)
        self.scheduler = torch.optim.lr_scheduler.ReduceLROnPlateau(
            self.optimizer, mode='min', factor=0.1, patience=5
        )
        self.criterion = nn.CrossEntropyLoss()

        # 训练设备配置
        self.device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        self.to(self.device)

        self.learning_rates = []
        self.confusion_matrix = None
        self.best_val_loss = float('inf')
        self.train_losses = []
        self.train_accs = []
        self.val_losses = []
        self.val_accs = []
        self.is_early_stop = False
        self.no_improve_counter = 0


    def forward(self, x):
        features = self.backbone(x)
        return [head(features) for head in self.heads]

    @staticmethod
    def _calculate_accuracy(outputs, labels):
        with torch.no_grad():
            total_correct = 0
            # outputs[i]:表示一个批次中所有图片在第i个位置上的概率分布
            # 例如一个批次中训练32张4位字符的图片，那么outputs共4个output,第1个output
            # 存储了模型对每张图片在第1个字符上的预测，比如对第一张图片预测：[0.8,0.2,...,0.4]共62个概率值
            # 对应了'012...Z'62个字符，假设概率最大的值为0.8，那么模型对这张图片第一个字符的预测为0
            for i, output in enumerate(outputs):
                # i代表字符位置，第i次循环，predicted保存了每张图片在第i个位置上的预测结果，用索引值表示
                # 比如第一次循环，predicted=[0,60,...,30]共32个索引值，对应每张图片在第1个位置上的字符的索引
                _, predicted = output.max(1)
                # labels[:,i]表示取每张图片在第i个位置上的真实字符索引，
                # labels = [
                #   [0,62,1,61],
                #   ...
                #   [30,15,22,10]
                # ]共32个元素
                total_correct += (predicted == labels[:, i]).sum().item()
            return total_correct / (labels.size(0) * labels.size(1))

    def start_train(self):
        # 创建实验目录（仅在训练时执行）
        self.experiment_dir = create_experiment_dir(
            model_name=self.name,
            model_params={
                'batch_size': self.batch_size,
                'lr': self.lr
            }
        )

        # 准备数据集
        train_dataset = CaptchaDataset('train')
        val_dataset = CaptchaDataset('val')

        train_loader = DataLoader(
            train_dataset,
            batch_size=self.batch_size,
            shuffle=True,
            num_workers=self.num_workers,
            pin_memory=self.pin_memory,  # 启用内存锁页
            persistent_workers=self.persistent_workers if self.num_workers > 0 else False
        )

        val_loader = DataLoader(
            val_dataset,
            batch_size=self.batch_size,
            shuffle=False,
            num_workers=self.num_workers
        )

        for epoch in range(self.epochs):
            self.train()
            epoch_train_loss = 0
            epoch_train_acc = 0
            progress_bar = tqdm(
                train_loader,
                desc=f'Train Epoch {epoch+1}/{self.epochs}',
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
                self.optimizer.step()

                # 计算指标
                epoch_train_loss += loss.item()
                batch_acc = self._calculate_accuracy(outputs, labels)
                epoch_train_acc += batch_acc

                # 实时更新进度信息
                progress_bar.set_postfix({
                    'loss': f'{loss.item():.4f}',
                    'acc': f'{batch_acc*100:.2f}%',
                    'lr': f'{self.optimizer.param_groups[0]["lr"]:.2e}'
                })

            # 验证阶段，返回一次epoch内, 验证集的平均损失和准确率
            val_loss, val_acc = self._evaluate(val_loader, epoch + 1)

            # 一次epoch内, 训练集的平均损失和准确率
            train_loss = epoch_train_loss / len(train_loader)
            train_acc = epoch_train_acc / len(train_loader)
            self.train_losses.append(train_loss)
            self.train_accs.append(train_acc)
            self.val_losses.append(val_loss)
            self.val_accs.append(val_acc)

            # 更新学习率
            self.scheduler.step(val_loss)

            current_lr = self.optimizer.param_groups[0]['lr']
            # 在训练循环中添加学习率记录
            self.learning_rates.append(current_lr)

            # 早停机制
            if val_loss < self.best_val_loss - self.early_stop_delta:
                self.best_val_loss = val_loss
                self.no_improve_counter = 0
            else:
                self.no_improve_counter += 1
                if self.no_improve_counter >= self.early_stop_patience:
                    # 跳出循环后不会+1，所以需要手动+1
                    epoch += 1
                    print(f'Early stopping after {epoch} epochs')
                    self.is_early_stop = True
                    break

            # 打印训练信息
            print(f'Epoch {epoch+1:02d} | '
                  f'Train Loss: {train_loss:.4f} | '
                  f'Train Acc: {train_acc*100:.2f}% | '
                  f'Val Loss: {val_loss:.4f} | '
                  f'Val Acc: {val_acc*100:.2f}% | '
                  f'LR: {self.optimizer.param_groups[0]["lr"]:.2e} | '
                  f'No Improve: {self.no_improve_counter} | '
                  f'Best Val Loss: {self.best_val_loss:.2f} | '
                  )
            self._save_checkpoint(epoch+1)
        print(f"🏁 训练完成！模型保存在: {self.experiment_dir}")

    def _evaluate(self, data_loader, epoch_num=None):
        self.eval()
        total_loss = 0
        total_acc = 0

        with torch.no_grad():
            desc = f'Valid Epoch {epoch_num}/{self.epochs}'
            val_bar = tqdm(
                data_loader,
                desc=desc,
                leave=False
            )
            for images, labels in val_bar:
                images = images.to(self.device)
                labels = labels.to(self.device)
                outputs = self(images)
                loss = sum(self.criterion(output, labels[:, i]) for i, output in enumerate(outputs))

                # 实时指标计算
                batch_acc = self._calculate_accuracy(outputs, labels)
                total_loss += loss.item()
                total_acc += batch_acc

                # 统一指标显示格式
                val_bar.set_postfix({
                    'loss': f'{loss.item():.4f}',
                    'acc': f'{batch_acc*100:.2f}%'
                })

        return total_loss / len(data_loader), total_acc / len(data_loader)


    def _save_checkpoint(self,epoch):
        # 如果模型早停，则不保存最后一次检查点
        if self.is_early_stop:
            return
        # 如果达到保存间隔，或者达到总轮次，则保存检查点
        if epoch % self.save_interval == 0 or epoch == self.epochs:
            save_checkpoint(self, epoch)

