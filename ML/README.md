# 🐾 PawVerse ML Pipeline

Machine learning models and prediction scripts for pet disease classification and analysis.

## Directory Structure

```
ML/
├── data/                          # Dataset directory
│   ├── breed/                     # Pet breed classification data
│   ├── disease_dog/               # Dog disease dataset
│   ├── disease_cat/               # Cat disease dataset
│   ├── oxford-iiit-pet/           # Source dataset
│   └── testpic/                   # Test images
├── models/                        # Trained model checkpoints
│   ├── pawverse_pet_classifier.pth          # Species classifier
│   ├── breed_classifier.pth                 # Breed classifier
│   ├── dog_disease_model.pth                # Dog disease model
│   └── cat_disease_model.pth                # Cat disease model
├── notebooks/                     # Jupyter notebooks
├── src/                           # Source utilities
├── requirements.txt               # Python dependencies
└── main_pipeline.py              # Main unified AI assistant
```

## Setup

1. **Navigate to ML directory:**
   ```bash
   cd ML
   ```

2. **Install dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

## Usage

### Main AI Pet Health Assistant
The unified pipeline combining image analysis and symptom checking:
```bash
python main_pipeline.py
```

### Individual Disease Prediction

**Dog Disease Prediction:**
```bash
python predict_dog_disease.py [image_path]
python predict_dog_disease.py data/testpic/dog_image.jpg
```

**Cat Disease Prediction:**
```bash
python predict_cat_disease.py [image_path]
python predict_cat_disease.py data/testpic/cat_image.jpg
```

**Unified Species Disease Prediction:**
```bash
python predict_disease_unified.py <species> [image_path]
python predict_disease_unified.py dog data/testpic/dog_image.jpg
python predict_disease_unified.py cat data/testpic/cat_image.jpg
```

### Species Detection
```bash
python predict_species.py [image_path]
```

### Symptom-Based Diagnosis
```bash
python hybrid_symptom_chatbot.py [species]
python hybrid_symptom_chatbot.py dog
python hybrid_symptom_chatbot.py cat
```

## Data Preparation

### Prepare Dog Disease Dataset
```bash
python prepare_dog_disease_data.py
# Organizes: data/Skin_Disease/Dog_Skin_Disease → data/disease_dog/
```

### Prepare Cat Disease Dataset
```bash
python prepare_cat_disease_data.py
# Organizes: data/Skin_Disease/CAT_SKIN_DISEASE → data/disease_cat/
```

### Prepare Breed Data
```bash
python prepare_breed_data.py
# Organizes oxford-iiit-pet dataset for breed classification
```

## Model Training

### Train Dog Disease Model
```bash
python train_dog_disease.py
# Trains on data/disease_dog/ → saves to models/dog_disease_model.pth
```

### Train Cat Disease Model
```bash
python train_cat_disease.py
# Trains on data/disease_cat/ → saves to models/cat_disease_model.pth
```

### Train Breed Classification
```bash
python train_breed.py          # Standard breed classifier
python train_breed_v2.py       # Improved breed classifier v2
```

### Train Pet Species Classifier
```bash
python train.py
# Trains species classifier → saves to models/pawverse_pet_classifier.pth
```

## File Descriptions

| File | Purpose |
|------|---------|
| `main_pipeline.py` | Main unified AI health assistant combining all models |
| `hybrid_symptom_chatbot.py` | Symptom-based disease diagnosis engine |
| `predict_disease_unified.py` | Unified disease prediction for dog/cat |
| `predict_dog_disease.py` | Dog-specific disease prediction |
| `predict_cat_disease.py` | Cat-specific disease prediction |
| `predict_species.py` | Species classification (dog/cat) |
| `train_dog_disease.py` | Train dog disease model |
| `train_cat_disease.py` | Train cat disease model |
| `prepare_dog_disease_data.py` | Organize dog disease dataset |
| `prepare_cat_disease_data.py` | Organize cat disease dataset |

## Model Details

All models use **EfficientNet-B0** backbone with:
- Input size: 224×224 pixels
- Pretrained weights: ImageNet (when available)
- Device: Metal Performance Shaders (MPS) on Mac / CUDA on GPU / CPU fallback

## Important Notes

- ⚠️ **Medical Disclaimer**: This tool is for informational purposes only. Always consult a licensed veterinarian for medical decisions.
- 🐾 Run all scripts from within the `ML/` directory
- 📁 Data files should be in `data/` subdirectory
- 💾 Models are saved to `models/` subdirectory
- 🔗 All paths are relative to the ML directory

## Troubleshooting

**Models not found:** Run data preparation and training scripts first
**Import errors:** Install requirements with `pip install -r requirements.txt`
**Image not found:** Provide full path or place image in `data/testpic/`

## Running from Parent Directory

If you need to run ML scripts from the parent directory:
```bash
cd ..
python ML/main_pipeline.py
# or with explicit path
python ML/predict_disease_unified.py dog /path/to/image.jpg
```

## Next Steps

- See `../WEB/` for web application and API
- Check `../README.md` for overall project documentation
