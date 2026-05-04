# 🐾 PawVerse: AI Pet Health Assistant

An intelligent system combining computer vision and symptom analysis to help diagnose pet health issues.

## 🎯 Project Overview

**PawVerse** is a comprehensive pet health assistant that uses:
- 🖼️ **Image-based disease detection** - Analyzes pet skin conditions from photos
- 🩺 **Symptom-based diagnosis** - Interactive questionnaire for disease prediction
- 🐾 **Species classification** - Automatically detects dog or cat
- 📊 **Intelligent combining** - Fuses both analysis methods for accurate diagnosis

## 📁 Project Structure

```
pawverse-pet-classifier/
├── ML/                    ← Machine Learning pipeline (Python scripts)
│   ├── data/             ← Datasets
│   ├── models/           ← Trained model checkpoints
│   ├── main_pipeline.py  ← Main unified AI assistant
│   ├── README.md         ← ML documentation
│   └── [training & prediction scripts]
│
├── WEB/                   ← Web application (coming soon)
│   ├── app.py            ← Flask/FastAPI web server
│   ├── templates/        ← HTML templates
│   ├── static/           ← CSS, JS, images
│   ├── README.md         ← WEB documentation
│   └── [API endpoints]
│
└── README.md             ← This file
```

## 🚀 Quick Start

### Using the AI Pet Health Assistant

```bash
cd ML
python main_pipeline.py
```

This launches the unified pipeline that will:
1. Ask if you have a dog or cat
2. Optionally analyze a photo of your pet
3. Run an interactive symptom questionnaire
4. Provide ranked diagnosis with recommendations

### Setup

1. **Clone/Open the project:**
   ```bash
   cd /Users/barry/Desktop/pawverse-pet-classifier
   ```

2. **For ML pipeline:**
   ```bash
   cd ML
   pip install -r requirements.txt
   python main_pipeline.py
   ```

3. **For Web application (WEB folder coming soon):**
   ```bash
   cd WEB
   pip install -r requirements.txt
   python app.py
   ```

## 📚 Documentation

- **[ML Pipeline Documentation](ML/README.md)** - Training, prediction, and data preparation
- **[WEB Application Documentation](WEB/README.md)** - Web interface and API endpoints

## 🧬 Models Included

| Model | Purpose | Input |
|-------|---------|-------|
| `pawverse_pet_classifier.pth` | Species detection (dog/cat) | Pet image |
| `dog_disease_model.pth` | Dog disease classification | Dog image |
| `cat_disease_model.pth` | Cat disease classification | Cat image |
| `breed_classifier.pth` | Pet breed identification | Pet image |

## 🎓 Key Features

✅ **Image-based analysis** - Uses EfficientNet-B0 for disease detection  
✅ **Symptom-based analysis** - Smart questionnaire with weighted scoring  
✅ **Species auto-detection** - Detects mismatches and re-analyzes  
✅ **Combined diagnosis** - Intelligently fuses image + symptom predictions  
✅ **Professional output** - Ranked results with confidence levels  
✅ **Safety disclaimers** - Always recommends veterinary consultation  

## 💻 Tech Stack

- **Deep Learning:** PyTorch, torchvision
- **Models:** EfficientNet-B0
- **Image Processing:** PIL, transforms
- **Web (future):** Flask or FastAPI
- **Device Support:** Apple Silicon (MPS), CUDA, CPU

## ⚠️ Important Disclaimer

This tool is **FOR INFORMATIONAL PURPOSES ONLY** and should **NOT** be used as a substitute for professional veterinary care.

Always consult a licensed veterinarian for:
- Medical diagnosis
- Treatment recommendations  
- Emergency situations
- Any health concerns

## 🔄 Workflow

### Option 1: ML Pipeline Only
```
cd ML → main_pipeline.py
  ↓
User provides species
  ↓
(Optional) Upload pet image → predict_disease_unified.py
  ↓
(Optional) Answer symptom questions → hybrid_symptom_chatbot.py
  ↓
Combined diagnosis with recommendations
```

### Option 2: Web Application (Coming Soon)
```
cd WEB → app.py
  ↓
Upload pet image + select species
  ↓
API processes both disease and symptom analysis
  ↓
Web interface displays interactive results
```

## 📋 Example Usage

**Command Line:**
```bash
cd ML
python main_pipeline.py
# Select species → dog/cat
# Upload image? → yes/no
# Answer symptoms? → yes/no
# Get combined diagnosis
```

**Individual Scripts:**
```bash
cd ML

# Just analyze an image
python predict_disease_unified.py dog data/testpic/dog_image.jpg

# Just run symptom checker
python hybrid_symptom_chatbot.py cat

# Get species only
python predict_species.py data/testpic/any_pet.jpg
```

## 🎯 Next Steps

- [ ] Deploy web application
- [ ] Add mobile app support
- [ ] Integrate veterinary database
- [ ] Add real-time video analysis
- [ ] Expand to more pet species

## 📧 Support

See individual folder READMEs for detailed documentation:
- [ML Documentation](ML/README.md)
- [WEB Documentation](WEB/README.md)

---

**Made with ❤️ for pet lovers** 🐕🐈