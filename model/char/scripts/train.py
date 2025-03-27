from model.char.models import EfficientNetB0, ResNet34, ResNet50, DenseNet121
from model.char.executors.trainer import Trainer

if __name__ == '__main__':
    Trainer(DenseNet121()).train()
    # F1, MAC, Gmean, AUC,