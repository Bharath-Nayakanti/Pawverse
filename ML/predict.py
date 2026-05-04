from pathlib import Path
import sys

import torch
import torch.nn as nn
from PIL import Image
from torchvision import models, transforms

MODEL_PATH = Path("models/pawverse_pet_classifier.pth")
DEFAULT_IMAGE_PATH = Path("data/testpic/testpics.avif")

device = torch.device("mps" if torch.backends.mps.is_available() else "cpu")

transform = transforms.Compose([
    transforms.Resize((224, 224)),
    transforms.ToTensor(),
    transforms.Normalize(mean=[0.485, 0.456, 0.406],
                         std=[0.229, 0.224, 0.225])
])


def build_model(num_classes):
    model = models.efficientnet_b0(weights=None)
    model.classifier[1] = nn.Linear(model.classifier[1].in_features, num_classes)
    return model


def load_model(model_path):
    if not model_path.is_file():
        raise FileNotFoundError(
            f"Could not find trained model: {model_path}\n"
            "Run `python train.py` first so the checkpoint is saved."
        )

    checkpoint = torch.load(model_path, map_location="cpu")
    classes = checkpoint["classes"]

    model = build_model(num_classes=len(classes))
    model.load_state_dict(checkpoint["model_state_dict"])
    model = model.to(device)
    model.eval()

    return model, classes


def predict_image(image_path, model, classes):
    image_path = Path(image_path).resolve()  # Convert to absolute path

    if not image_path.is_file():
        raise FileNotFoundError(f"Could not find test image: {image_path}")

    image = Image.open(image_path).convert("RGB")
    image = transform(image).unsqueeze(0).to(device)

    with torch.no_grad():
        outputs = model(image)
        probabilities = torch.softmax(outputs, dim=1)
        confidence, predicted = torch.max(probabilities, 1)

    class_name = classes[predicted.item()]
    display_name = {"cats": "cat", "dogs": "dog"}.get(class_name, class_name)

    return display_name, confidence.item()


if __name__ == "__main__":
    image_path = Path(sys.argv[1]) if len(sys.argv) > 1 else DEFAULT_IMAGE_PATH

    model, classes = load_model(MODEL_PATH)
    prediction, confidence = predict_image(image_path, model, classes)

    print(f"Image: {image_path}")
    print(f"Prediction: {prediction}")
    print(f"Confidence: {confidence:.2%}")
