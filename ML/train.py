import torch
import torch.nn as nn
from torchvision import datasets, transforms, models
from torch.utils.data import DataLoader
from urllib.error import URLError
from pathlib import Path

DATA_DIR = Path("data")
MODEL_PATH = Path("models/pawverse_pet_classifier.pth")
EPOCHS = 5
BATCH_SIZE = 32

# Device (M1/M2 Mac support)
device = torch.device("mps" if torch.backends.mps.is_available() else "cpu")

# EfficientNet requires specific normalization
transform = transforms.Compose([
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


def main():
    # Load datasets
    train_data = datasets.ImageFolder(DATA_DIR / "train", transform=transform)
    val_data = datasets.ImageFolder(DATA_DIR / "val", transform=transform)

    train_loader = DataLoader(train_data, batch_size=BATCH_SIZE, shuffle=True)
    val_loader = DataLoader(val_data, batch_size=BATCH_SIZE)

    # Load EfficientNet
    model, using_pretrained_weights = build_model()

    # Freeze base layers only when they already have pretrained ImageNet features.
    if using_pretrained_weights:
        for param in model.parameters():
            param.requires_grad = False

    # Replace classifier (VERY IMPORTANT)
    model.classifier[1] = nn.Linear(model.classifier[1].in_features, len(train_data.classes))

    model = model.to(device)

    # Loss + optimizer
    criterion = nn.CrossEntropyLoss()
    trainable_params = filter(lambda param: param.requires_grad, model.parameters())
    optimizer = torch.optim.Adam(trainable_params, lr=0.001)

    # Training loop (basic)
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

    print("Training complete")

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
    print(f"Saved model to {MODEL_PATH}")


if __name__ == "__main__":
    main()
