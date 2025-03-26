if __name__ == '__main__':
    from model.char.executors.trainer import Trainer
    from model.char.models.resnet import ResNet

    Trainer(ResNet()).train()
    # F1, MAC, Gmean, AUC,