from pathlib import Path
import sys

import torch
import torch.nn as nn
from PIL import Image
from torchvision import models, transforms

ML_DIR = Path(__file__).resolve().parent

# -----------------------------
# CONFIG
# -----------------------------
DOG_MODEL_PATH = ML_DIR / "models" / "dog_disease_model.pth"
CAT_MODEL_PATH = ML_DIR / "models" / "cat_disease_model.pth"
TEST_IMAGE_DIRS = [ML_DIR / "data" / "testpic", ML_DIR / "data" / "testpics"]
IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp", ".avif"}
LOW_CONFIDENCE_THRESHOLD = 0.60

device = torch.device("mps" if torch.backends.mps.is_available() else "cpu")

# -----------------------------
# TRANSFORM
# -----------------------------
transform = transforms.Compose([
    transforms.Resize((224, 224)),
    transforms.ToTensor(),
    transforms.Normalize(mean=[0.485, 0.456, 0.406],
                         std=[0.229, 0.224, 0.225])
])

# -----------------------------
# MODEL UTILITIES
# -----------------------------
def build_model(num_classes):
    """Build EfficientNet-B0 model for classification."""
    model = models.efficientnet_b0(weights=None)
    model.classifier[1] = nn.Linear(model.classifier[1].in_features, num_classes)
    return model


def load_model(model_path, species):
    """Load model checkpoint for specified species."""
    if not model_path.is_file():
        raise FileNotFoundError(
            f"Could not find trained {species} disease model: {model_path}\n"
            f"Run `python train_{species}_disease.py` first."
        )

    checkpoint = torch.load(model_path, map_location="cpu")
    classes = checkpoint["classes"]

    model = build_model(len(classes))
    model.load_state_dict(checkpoint["model_state_dict"])
    model = model.to(device)
    model.eval()

    return model, classes


# -----------------------------
# LOAD MODELS ONCE (IMPORTANT FOR PERFORMANCE)
# -----------------------------
try:
    dog_model, dog_classes = load_model(DOG_MODEL_PATH, "dog")
    dog_model_loaded = True
except FileNotFoundError as e:
    print(f"Warning: {e}")
    dog_model_loaded = False

try:
    cat_model, cat_classes = load_model(CAT_MODEL_PATH, "cat")
    cat_model_loaded = True
except FileNotFoundError as e:
    print(f"Warning: {e}")
    cat_model_loaded = False


# -----------------------------
# DISEASE KNOWLEDGE BASE
# -----------------------------
disease_info = {
    "healthy": {
        "desc": "No visible signs of disease.",
        "advice": "Maintain regular hygiene and veterinary checkups.",
    },
    "fungal_infection": {
        "desc": (
            "Fungal infections like ringworm can cause circular patches, "
            "redness, scaling, or hair loss."
        ),
        "advice": "Keep the area clean and dry. Consult a vet for antifungal treatment.",
    },
    "parasite_infection": {
        "desc": (
            "Caused by parasites like mites, fleas, or ticks. Symptoms include "
            "itching, hair loss, and skin irritation."
        ),
        "advice": "Use vet-recommended anti-parasitic treatment.",
    },
    "allergy": {
        "desc": (
            "Allergic reaction to food, environment, or fleas causing itching "
            "and redness."
        ),
        "advice": "Identify triggers and consult a veterinarian.",
    },
    "skin_inflammation": {
        "desc": (
            "Skin irritation or dermatitis, often due to infection or allergies."
        ),
        "advice": "Keep skin clean and consult a vet.",
    },
}


# -----------------------------
# IMAGE UTILITIES
# -----------------------------
def find_image(image_path):
    """Find image file, searching test directories if needed."""
    if image_path:
        image_path = Path(image_path)
        if image_path.is_file():
            return image_path
        raise FileNotFoundError(f"Could not find image: {image_path}")

    # Search test directories
    for image_dir in TEST_IMAGE_DIRS:
        if not image_dir.is_dir():
            continue

        for img_path in sorted(image_dir.iterdir()):
            if img_path.suffix.lower() in IMAGE_EXTENSIONS:
                return img_path

    raise FileNotFoundError(
        "Could not find a test image. Provide path or add image to data/testpic/:\n"
        "python predict_disease_unified.py dog path/to/image.jpg"
    )


def format_class_name(class_name):
    """Format class name for display."""
    return class_name.replace("_", " ").title()


# -----------------------------
# CORE PREDICTION FUNCTION
# -----------------------------
def predict_disease(species, image_path):
    """
    Predict disease for given species and image.
    
    Args:
        species: "dog" or "cat"
        image_path: Path to image file
        
    Returns:
        Dictionary with prediction results
    """
    species = species.lower()

    if species == "dog":
        if not dog_model_loaded:
            raise RuntimeError(f"Dog disease model not loaded. {DOG_MODEL_PATH} missing.")
        model = dog_model
        classes = dog_classes
    elif species == "cat":
        if not cat_model_loaded:
            raise RuntimeError(f"Cat disease model not loaded. {CAT_MODEL_PATH} missing.")
        model = cat_model
        classes = cat_classes
    else:
        raise ValueError("Species must be 'dog' or 'cat'")

    # Load and process image
    image_path = Path(image_path).resolve()  # Convert to absolute path
    
    if not image_path.is_file():
        raise FileNotFoundError(f"Image not found: {image_path}")

    image = Image.open(image_path).convert("RGB")
    image = transform(image).unsqueeze(0).to(device)

    # Get predictions
    with torch.no_grad():
        outputs = model(image)
        probs = torch.softmax(outputs, dim=1)
        top_confidences, top_indices = torch.topk(probs, min(3, len(classes)))

    # Main prediction
    main_idx = top_indices[0][0].item()
    main_class = classes[main_idx]
    main_confidence = top_confidences[0][0].item()

    # Alternative predictions
    alternatives = []
    for i in range(1, min(3, len(classes))):
        alt_idx = top_indices[0][i].item()
        alt_class = classes[alt_idx]
        alt_confidence = top_confidences[0][i].item()
        alternatives.append({
            "class": alt_class,
            "confidence": alt_confidence,
        })

    # Get disease info
    info = disease_info.get(main_class, {})

    return {
        "species": species,
        "image": str(image_path),
        "condition": main_class,
        "confidence": main_confidence,
        "description": info.get("desc", "No description available."),
        "advice": info.get("advice", "Consult a veterinarian."),
        "alternatives": alternatives,
        "low_confidence": main_confidence < LOW_CONFIDENCE_THRESHOLD,
    }


# -----------------------------
# DISPLAY UTILITIES
# -----------------------------
def display_result(result):
    """Display prediction result in formatted output."""
    print("\n" + "=" * 50)
    print("      DISEASE PREDICTION RESULT")
    print("=" * 50 + "\n")

    print(f"Species: {result['species'].title()}")
    print(f"Image: {result['image']}")
    print(f"Condition: {format_class_name(result['condition'])} ({result['confidence']:.2%})\n")

    print("What it means:")
    print(result["description"], "\n")

    print("Advice:")
    print(result["advice"], "\n")

    if result["alternatives"]:
        print("Other possibilities:")
        for alt in result["alternatives"]:
            alt_name = format_class_name(alt["class"])
            alt_conf = alt["confidence"]
            print(f"  • {alt_name} ({alt_conf:.2%})")
        print()

    if result["low_confidence"]:
        print("⚠️  Low confidence prediction. Please consult a veterinarian.")

    print("\n" + "=" * 50 + "\n")


def print_usage():
    """Print usage information."""
    print("""
Usage:
  python predict_disease_unified.py <species> [image_path]

Arguments:
  species      'dog' or 'cat'
  image_path   Optional path to image file
               If omitted, searches data/testpic/

Examples:
  python predict_disease_unified.py dog
  python predict_disease_unified.py dog path/to/dog_image.jpg
  python predict_disease_unified.py cat data/testpic/cat.png
""")


# -----------------------------
# MAIN
# -----------------------------
def main():
    if len(sys.argv) < 2:
        print_usage()
        sys.exit(1)

    species = sys.argv[1]
    image_path = sys.argv[2] if len(sys.argv) > 2 else None

    try:
        image_path = find_image(image_path)
        result = predict_disease(species, image_path)
        display_result(result)
    except (FileNotFoundError, ValueError, RuntimeError) as error:
        print(f"❌ Error: {error}")
        sys.exit(1)


if __name__ == "__main__":
    main()
