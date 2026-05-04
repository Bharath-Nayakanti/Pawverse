from pathlib import Path
from urllib.error import URLError

import torch
import torch.nn as nn
from torch.utils.data import DataLoader
from torchvision import datasets, models, transforms

DATA_DIR = Path("data/breed_v2")
MODEL_PATH = Path("models/breed_classifier_v2.pth")
EPOCHS = 8
BATCH_SIZE = 32

device = torch.device("mps" if torch.backends.mps.is_available() else "cpu")

train_transform = transforms.Compose([
    transforms.Resize((224, 224)),
    transforms.RandomHorizontalFlip(),
    transforms.ToTensor(),
    transforms.Normalize(mean=[0.485, 0.456, 0.406],
                         std=[0.229, 0.224, 0.225])
])

val_transform = transforms.Compose([
    transforms.Resize((224, 224)),
    transforms.ToTensor(),
    transforms.Normalize(mean=[0.485, 0.456, 0.406],
                         std=[0.229, 0.224, 0.225])
])


def build_model():
    try:
        weights = models.EfficientNet_B0_Weights.DEFAULT
        return models.efficientnet_b0(weights=weights), True
    except URLError as error:
        print(f"Could not download pretrained weights: {error}")
        print("Training EfficientNet-B0 from scratch instead.")
        return models.efficientnet_b0(weights=None), False


def check_data_ready():
    train_dir = DATA_DIR / "train"
    val_dir = DATA_DIR / "val"

    if not train_dir.is_dir() or not val_dir.is_dir():
        raise FileNotFoundError(
            f"Could not find breed v2 dataset folders under {DATA_DIR}.\n"
            "Run `python prepare_breed_data_v2.py` first."
        )


def main():
    check_data_ready()

    train_data = datasets.ImageFolder(DATA_DIR / "train", transform=train_transform)
    val_data = datasets.ImageFolder(DATA_DIR / "val", transform=val_transform)

    train_loader = DataLoader(train_data, batch_size=BATCH_SIZE, shuffle=True)
    val_loader = DataLoader(val_data, batch_size=BATCH_SIZE)

    model, using_pretrained_weights = build_model()

    if using_pretrained_weights:
        for param in model.features[:-2].parameters():
            param.requires_grad = False

        for param in model.features[-2:].parameters():
            param.requires_grad = True

    num_classes = len(train_data.classes)
    model.classifier[1] = nn.Linear(model.classifier[1].in_features, num_classes)
    model = model.to(device)

    trainable_param_count = sum(
        param.numel() for param in model.parameters() if param.requires_grad
    )
    print(f"Trainable parameters: {trainable_param_count}")

    criterion = nn.CrossEntropyLoss()
    trainable_params = filter(lambda param: param.requires_grad, model.parameters())
    optimizer = torch.optim.Adam(trainable_params, lr=0.0003)

    print(f"Training breed v2 classifier on {num_classes} breeds using {device}.")

    for epoch in range(EPOCHS):
        model.train()
        total_loss = 0

        for images, labels in train_loader:
            images, labels = images.to(device), labels.to(device)

            optimizer.zero_grad()
            outputs = model(images)
            loss = criterion(outputs, labels)

            loss.backward()
            optimizer.step()

            total_loss += loss.item()

        print(f"Epoch {epoch + 1}/{EPOCHS}, Loss: {total_loss:.4f}")

    model.eval()
    correct = 0
    total = 0

    with torch.no_grad():
        for images, labels in val_loader:
            images, labels = images.to(device), labels.to(device)

            outputs = model(images)
            _, predicted = torch.max(outputs, 1)

            total += labels.size(0)
            correct += (predicted == labels).sum().item()

    accuracy = 100 * correct / total
    print(f"Validation Accuracy: {accuracy:.2f}%")

    MODEL_PATH.parent.mkdir(parents=True, exist_ok=True)
    torch.save(
        {
            "model_state_dict": model.state_dict(),
            "classes": train_data.classes,
            "class_to_idx": train_data.class_to_idx,
        },
        MODEL_PATH,
    )
    print(f"Model saved to {MODEL_PATH}")


if __name__ == "__main__":
    main()
