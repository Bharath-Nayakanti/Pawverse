from pathlib import Path
import sys

import torch
import torch.nn as nn
from PIL import Image
from torchvision import models, transforms

MODEL_PATH = Path("models/cat_disease_model.pth")
DEFAULT_IMAGE = Path("data/testpic/cat.jpg")
TEST_IMAGE_DIRS = [Path("data/testpic"), Path("data/testpics")]
IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp", ".avif"}
LOW_CONFIDENCE_THRESHOLD = 0.60

device = torch.device("mps" if torch.backends.mps.is_available() else "cpu")

transform = transforms.Compose([
    transforms.Resize((224, 224)),
    transforms.ToTensor(),
    transforms.Normalize(mean=[0.485, 0.456, 0.406],
                         std=[0.229, 0.224, 0.225])
])

disease_info = {
    "healthy": {
        "desc": "No visible signs of disease. Your cat's skin appears normal.",
        "advice": "Maintain regular grooming, hygiene, and veterinary checkups.",
    },
    "fungal_infection": {
        "desc": (
            "Fungal infections, such as ringworm, can cause circular patches, "
            "redness, scaling, hair loss, or scabs on the skin."
        ),
        "advice": "Keep the area clean and dry. Consult a vet for antifungal treatment immediately, as ringworm is contagious.",
    },
    "parasite_infection": {
        "desc": (
            "Caused by parasites like mites or fleas. Symptoms can include "
            "itching, hair loss, scabs, and skin irritation."
        ),
        "advice": "Check for fleas or mites. Use vet-recommended anti-parasitic treatment promptly.",
    },
    "allergy": {
        "desc": (
            "Allergic reactions to food, environmental triggers, or fleas can "
            "cause itching, redness, swelling, or hair loss."
        ),
        "advice": "Identify possible triggers and consult a vet for proper diagnosis and medication.",
    },
}


def build_model(num_classes):
    model = models.efficientnet_b0(weights=None)
    model.classifier[1] = nn.Linear(model.classifier[1].in_features, num_classes)
    return model


def load_model():
    if not MODEL_PATH.is_file():
        raise FileNotFoundError(
            f"Could not find trained model: {MODEL_PATH}\n"
            "Run `python train_cat_disease.py` first."
        )

    checkpoint = torch.load(MODEL_PATH, map_location="cpu")
    classes = checkpoint["classes"]

    model = build_model(num_classes=len(classes))
    model.load_state_dict(checkpoint["model_state_dict"])
    model = model.to(device)
    model.eval()

    return model, classes


def find_default_image():
    if DEFAULT_IMAGE.is_file():
        return DEFAULT_IMAGE

    for image_dir in TEST_IMAGE_DIRS:
        if not image_dir.is_dir():
            continue

        for image_path in sorted(image_dir.iterdir()):
            if image_path.suffix.lower() in IMAGE_EXTENSIONS:
                return image_path

    raise FileNotFoundError(
        "Could not find a test image. Add one to data/testpic, or pass a path:\n"
        "python predict_cat_disease.py path/to/image.jpg"
    )


def format_class_name(class_name):
    return class_name.replace("_", " ").title()


def get_top_predictions(classes, top_indices, top_confidences):
    return [
        {
            "class_name": classes[top_indices[0][index].item()],
            "confidence": top_confidences[0][index].item(),
        }
        for index in range(min(3, len(classes)))
    ]


def predict(image_path):
    image_path = Path(image_path).resolve()  # Convert to absolute path

    if not image_path.is_file():
        raise FileNotFoundError(f"Could not find test image: {image_path}")

    model, classes = load_model()

    image = Image.open(image_path).convert("RGB")
    image = transform(image).unsqueeze(0).to(device)

    with torch.no_grad():
        outputs = model(image)
        probabilities = torch.softmax(outputs, dim=1)
        top_confidences, top_indices = torch.topk(probabilities, 3)

    top_predictions = get_top_predictions(classes, top_indices, top_confidences)
    main_class = top_predictions[0]["class_name"]
    main_confidence = top_predictions[0]["confidence"]
    info = disease_info.get(main_class, {})

    print("\n=== Cat Disease Prediction ===\n")
    print(f"Image: {image_path}")
    print(f"Condition: {format_class_name(main_class)} ({main_confidence:.2%})\n")

    print("What it means:")
    print(info.get("desc", "No description available."), "\n")

    print("Advice:")
    print(info.get("advice", "Consult a veterinarian."), "\n")

    print("Other possibilities:")
    for prediction in top_predictions[1:]:
        class_name = prediction["class_name"]
        confidence = prediction["confidence"]
        print(f"- {format_class_name(class_name)} ({confidence:.2%})")

    if main_confidence < LOW_CONFIDENCE_THRESHOLD:
        print("\n⚠️ Low confidence: results may not be accurate. Consult a veterinarian.")


if __name__ == "__main__":
    test_image = Path(sys.argv[1]) if len(sys.argv) > 1 else find_default_image()
    predict(test_image)
