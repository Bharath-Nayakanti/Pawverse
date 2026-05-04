# 🚀 Quick Setup Guide

## New Project Structure

Your project has been reorganized into two main folders:

```
pawverse-pet-classifier/
├── ML/        ← All machine learning code
└── WEB/       ← Web application (placeholder)
```

## Running the Main Pipeline

```bash
# Navigate to ML directory
cd ML

# Install dependencies
pip install -r requirements.txt

# Run the unified AI Pet Health Assistant
python main_pipeline.py
```

## What Each Folder Contains

### 📂 ML/ - Machine Learning
- **Training scripts:** `train_*.py`
- **Data preparation:** `prepare_*.py`
- **Prediction scripts:** `predict_*.py`
- **Main pipeline:** `main_pipeline.py`
- **Chatbot:** `hybrid_symptom_chatbot.py`
- **Data folders:** `data/`, `models/`

### 📂 WEB/ - Web Application
- Currently a placeholder for future web interface
- Coming soon: Flask/FastAPI web server

## File Locations

All Python scripts now have:
- ✅ Relative paths to `data/` and `models/` (automatically resolved)
- ✅ All imports working from within ML/ directory
- ✅ No changes needed to file contents

## Important Notes

- ⚠️ Always run scripts from **within the ML/ directory**
- 🐾 See [ML/README.md](ML/README.md) for detailed ML documentation
- 🌐 See [WEB/README.md](WEB/README.md) for web documentation
- 📖 See [README.md](README.md) for project overview

## Troubleshooting

**"Module not found" errors:**
- Make sure you're in the ML/ directory: `cd ML`
- Install requirements: `pip install -r requirements.txt`

**"Path not found" errors:**
- Check that data/ and models/ folders exist in ML/
- Paths are relative to ML/ directory

**Models not found:**
- Run data preparation: `python prepare_dog_disease_data.py`
- Then train: `python train_dog_disease.py`

## Commands

```bash
# From project root
cd ML

# Main assistant
python main_pipeline.py

# Individual predictions
python predict_disease_unified.py dog path/to/image.jpg
python hybrid_symptom_chatbot.py cat

# Data preparation
python prepare_dog_disease_data.py
python prepare_cat_disease_data.py

# Model training
python train_dog_disease.py
python train_cat_disease.py
```

## Next Steps

1. ✅ Project reorganized into ML/ and WEB/
2. ✅ All paths updated (relative, working automatically)
3. ⏭️ Ready to run ML pipeline!
4. 📋 Ready to develop web application in WEB/

---

**Start using the AI assistant now:**
```bash
cd ML && python main_pipeline.py
```
