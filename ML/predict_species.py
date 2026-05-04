import torch
import torch.nn as nn
from torchvision import models, transforms
from PIL import Image
from pathlib import Path

MODEL_PATH = Path("models/pawverse_pet_classifier.pth")

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

def load_model():
    checkpoint = torch.load(MODEL_PATH, map_location="cpu")
    classes = checkpoint["classes"]

    model = build_model(len(classes))
    model.load_state_dict(checkpoint["model_state_dict"])
    model = model.to(device)
    model.eval()

    return model, classes

model, classes = load_model()

def predict_species(image_path):
    image_path = Path(image_path).resolve()  # Convert to absolute path
    
    image = Image.open(image_path).convert("RGB")
    image = transform(image).unsqueeze(0).to(device)

    with torch.no_grad():
        outputs = model(image)
        probs = torch.softmax(outputs, dim=1)
        confidence, predicted = torch.max(probs, 1)

    predicted_class = classes[predicted.item()]
    return predicted_class, confidence.item()