from pathlib import Path
import sys

import torch
import torch.nn as nn
from PIL import Image
from torchvision import models, transforms

ML_DIR = Path(__file__).resolve().parent

CATDOG_MODEL_PATH = ML_DIR / "models" / "pawverse_pet_classifier.pth"
BREED_MODEL_PATH = ML_DIR / "models" / "breed_classifier_v2.pth"
DEFAULT_IMAGE_PATH = ML_DIR / "data" / "testpic" / "Pitbull.jpg.webp"
TEST_IMAGE_DIRS = [ML_DIR / "data" / "testpic", ML_DIR / "data" / "testpics"]
IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".avif", ".webp"}
LOW_CONFIDENCE_THRESHOLD = 0.60

similar_breeds = {
    "havanese": ["shih tzu", "coton de tulear"],
    "pomeranian": ["shih tzu", "toy poodle"],
    "yorkshire_terrier": ["silky terrier", "shih tzu"],
    "pug": ["french bulldog", "boston terrier"],
    "beagle": ["foxhound", "basset hound"],
    "basset_hound": ["beagle", "bloodhound"],
    "samoyed": ["american eskimo dog", "japanese spitz"],
    "shiba_inu": ["akita", "japanese spitz"],
    "chihuahua": ["toy terrier", "mini pinscher"],
    "persian": ["himalayan cat"],
    "maine_coon": ["norwegian forest cat"],
    "ragdoll": ["birman"],
}

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
            "Run the matching training script first."
        )

    checkpoint = torch.load(model_path, map_location="cpu")
    classes = checkpoint["classes"]

    model = build_model(num_classes=len(classes))
    model.load_state_dict(checkpoint["model_state_dict"])
    model = model.to(device)
    model.eval()

    return model, classes


def predict(model, image_tensor):
    with torch.no_grad():
        outputs = model(image_tensor)
        probabilities = torch.softmax(outputs, dim=1)
        confidence, predicted = torch.max(probabilities, 1)

    return predicted.item(), confidence.item()


def predict_topk(model, image_tensor, k=3):
    with torch.no_grad():
        outputs = model(image_tensor)
        probabilities = torch.softmax(outputs, dim=1)
        top_confidences, top_indices = torch.topk(probabilities, k)

    return [
        (top_indices[0][index].item(), top_confidences[0][index].item())
        for index in range(k)
    ]


def format_animal_label(label):
    return {"cats": "Cat", "dogs": "Dog"}.get(label, label.title())


def format_breed_label(label):
    return label.replace("_", " ").title()


def find_default_image():
    if DEFAULT_IMAGE_PATH.is_file():
        return DEFAULT_IMAGE_PATH

    for image_dir in TEST_IMAGE_DIRS:
        if not image_dir.is_dir():
            continue

        for image_path in sorted(image_dir.iterdir()):
            if image_path.suffix.lower() in IMAGE_EXTENSIONS:
                return image_path

    raise FileNotFoundError(
        "Could not find a test image. Add one to data/testpic, or pass a path:\n"
        "python predict_full.py path/to/image.jpg"
    )


def predict_full(image_path):
    image_path = Path(image_path).resolve()  # Convert to absolute path

    if not image_path.is_file():
        raise FileNotFoundError(f"Could not find test image: {image_path}")

    image = Image.open(image_path).convert("RGB")
    image_tensor = transform(image).unsqueeze(0).to(device)

    catdog_model, catdog_classes = load_model(CATDOG_MODEL_PATH)
    breed_model, breed_classes = load_model(BREED_MODEL_PATH)

    catdog_idx, catdog_confidence = predict(catdog_model, image_tensor)
    top_breeds = predict_topk(breed_model, image_tensor, k=3)

    animal_label = catdog_classes[catdog_idx]
    top_predictions = [
        {
            "breed": format_breed_label(breed_classes[breed_idx]),
            "breed_key": breed_classes[breed_idx],
            "confidence": confidence,
        }
        for breed_idx, confidence in top_breeds
    ]

    best_breed = top_predictions[0]

    return {
        "animal": format_animal_label(animal_label),
        "animal_confidence": catdog_confidence,
        "breed": best_breed["breed"],
        "breed_confidence": best_breed["confidence"],
        "top_breeds": top_predictions,
        "similar_breeds": similar_breeds.get(best_breed["breed_key"], []),
    }


if __name__ == "__main__":
    test_image = Path(sys.argv[1]) if len(sys.argv) > 1 else find_default_image()
    result = predict_full(test_image)

    print("\n=== Prediction Result ===")
    print(f"Image: {test_image}")
    print(f"Animal: {result['animal']} ({result['animal_confidence']:.2%})\n")

    print("Top breed predictions:")
    for index, prediction in enumerate(result["top_breeds"], 1):
        print(f"{index}. {prediction['breed']} ({prediction['confidence']:.2%})")

    show_similar = (
        result["breed_confidence"] < LOW_CONFIDENCE_THRESHOLD
        or result["animal_confidence"] < LOW_CONFIDENCE_THRESHOLD
    )

    if show_similar:
        print("\nLow confidence: prediction may be unreliable.")

    if result["similar_breeds"] and show_similar:
        print("\nSimilar breeds:")
        for breed in result["similar_breeds"]:
            print(f"- {breed.title()}")
