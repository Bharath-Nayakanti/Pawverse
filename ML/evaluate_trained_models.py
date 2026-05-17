"""
Standalone Evaluation Script for Trained Models
Loads trained models and runs comprehensive evaluation without retraining
"""

from pathlib import Path
from urllib.error import URLError
import torch
import torch.nn as nn
from torch.utils.data import DataLoader
from torchvision import datasets, models, transforms
from evaluate_model import evaluate_cnn_model

# Configuration
MODELS_TO_EVALUATE = [
    {
        'name': 'breed_classifier',
        'model_path': Path('models/breed_classifier.pth'),
        'data_dir': Path('data/breed'),
        'transform': transforms.Compose([
            transforms.Resize((224, 224)),
            transforms.ToTensor(),
            transforms.Normalize(mean=[0.485, 0.456, 0.406],
                                 std=[0.229, 0.224, 0.225])
        ])
    },
    {
        'name': 'cat_disease_classifier',
        'model_path': Path('models/cat_disease_model.pth'),
        'data_dir': Path('data/disease_cat'),
        'transform': transforms.Compose([
            transforms.Resize((224, 224)),
            transforms.ToTensor(),
            transforms.Normalize(mean=[0.485, 0.456, 0.406],
                                 std=[0.229, 0.224, 0.225])
        ])
    },
    {
        'name': 'dog_disease_classifier',
        'model_path': Path('models/dog_disease_model.pth'),
        'data_dir': Path('data/disease_dog'),
        'transform': transforms.Compose([
            transforms.Resize((224, 224)),
            transforms.ToTensor(),
            transforms.Normalize(mean=[0.485, 0.456, 0.406],
                                 std=[0.229, 0.224, 0.225])
        ])
    }
]

device = torch.device("mps" if torch.backends.mps.is_available() else "cpu")
print(f"Using device: {device}\n")


def build_model():
    """Build EfficientNet-B0 model"""
    try:
        weights = models.EfficientNet_B0_Weights.DEFAULT
        return models.efficientnet_b0(weights=weights)
    except URLError as error:
        print(f"Could not download pretrained weights: {error}")
        print("Training EfficientNet-B0 from scratch instead.")
        return models.efficientnet_b0(weights=None)


def load_trained_model(model_path: Path, num_classes: int):
    """
    Load a trained model from checkpoint
    
    Args:
        model_path: Path to model checkpoint
        num_classes: Number of output classes
    
    Returns:
        Loaded model
    """
    model = build_model()
    model.classifier[1] = nn.Linear(model.classifier[1].in_features, num_classes)
    
    # Load checkpoint
    checkpoint = torch.load(model_path, map_location=device)
    model.load_state_dict(checkpoint['model_state_dict'])
    model = model.to(device)
    model.eval()
    
    return model, checkpoint.get('classes', [])


def evaluate_single_model(config):
    """
    Evaluate a single trained model
    
    Args:
        config: Dictionary with model configuration
    """
    print("="*70)
    print(f"EVALUATING: {config['name']}")
    print("="*70)
    
    # Check if model exists
    if not config['model_path'].exists():
        print(f"Model file not found: {config['model_path']}")
        print("Skipping this model.\n")
        return
    
    # Check if data exists
    val_dir = config['data_dir'] / "val"
    if not val_dir.is_dir():
        print(f"Validation data not found: {val_dir}")
        print("Skipping this model.\n")
        return
    
    # Load validation data
    val_data = datasets.ImageFolder(val_dir, transform=config['transform'])
    val_loader = DataLoader(val_data, batch_size=32)
    
    print(f"Classes: {val_data.classes}")
    print(f"Number of validation samples: {len(val_data)}")
    
    # Load trained model
    model, classes = load_trained_model(config['model_path'], len(val_data.classes))
    print(f"Model loaded from: {config['model_path']}")
    
    # Run evaluation
    evaluate_cnn_model(
        model=model,
        val_loader=val_loader,
        classes=classes,
        output_dir=Path("."),
        model_name=config['name'],
        train_history=None  # No training history for pre-trained models
    )
    
    print(f"\nEvaluation complete for {config['name']}\n")


def main():
    """Main evaluation function"""
    print("\n" + "="*70)
    print("STANDALONE MODEL EVALUATION")
    print("="*70 + "\n")
    
    for config in MODELS_TO_EVALUATE:
        try:
            evaluate_single_model(config)
        except Exception as e:
            print(f"Error evaluating {config['name']}: {e}")
            print("Skipping this model.\n")
            continue
    
    print("\n" + "="*70)
    print("ALL EVALUATIONS COMPLETE")
    print("="*70 + "\n")


if __name__ == "__main__":
    main()
