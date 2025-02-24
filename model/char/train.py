from model.char.model.resnet import ResNetMultiHead


def main():
    ResNetMultiHead().start()


if __name__ == '__main__':
    main()
    # model = ResNetMultiHead()
    # print(model.__class__.__name__, model.__class__.__module__)