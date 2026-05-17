# Model Evaluation and Visualization Guide

This guide explains the comprehensive evaluation and visualization functionality added to the ML models.

## Overview

All three main models now include automatic evaluation and visualization after training:
- **Breed Classification Model** (`train_breed.py`)
- **Cat Disease Prediction Model** (`train_cat_disease.py`)
- **Dog Disease Prediction Model** (`train_dog_disease.py`)

## How to Use

Simply run the training script as usual. Evaluation runs automatically after training completes:

```bash
# Breed classification
python train_breed.py

# Cat disease prediction
python train_cat_disease.py

# Dog disease prediction
python train_dog_disease.py
```

## What Happens During Evaluation

After training completes, the following occurs automatically:

1. **Metrics are printed to terminal**
2. **Graph windows appear** (one at a time, close each to see the next)
3. **All graphs are saved** to `metrics/` folder
4. **Model is saved** as before (no changes to existing functionality)

## Evaluation Metrics and Visualizations

### 1. Classification Report
- **Accuracy**: Overall correctness of predictions
- **Precision**: Correct positive predictions / Total positive predictions
- **Recall**: Correct positive predictions / Total actual positives
- **F1-score**: Harmonic mean of precision and recall
- **Support**: Number of samples for each class

**Output**: Printed to terminal and saved to `metrics/{model_name}_classification_report.txt`

### 2. Log Loss
- Measures the uncertainty of predictions
- Lower values indicate better calibrated probabilities
- Useful for comparing model confidence

**Output**: Printed to terminal and saved to `metrics/{model_name}_log_loss.txt`

### 3. Confusion Matrix
- Visual representation of prediction errors
- Shows which classes are confused with each other
- Helps identify weak spots in the model

**Output**: Saved to `metrics/{model_name}_confusion_matrix.png`

### 4. Calibration Curve
- Compares predicted probabilities vs actual probabilities
- Shows how well the model's confidence matches reality
- Perfect calibration follows the diagonal line

**Output**: Saved to `metrics/{model_name}_calibration_curve.png`

### 5. ROC-AUC Curve (One-vs-Rest)
- Receiver Operating Characteristic curve
- Area Under Curve (AUC) measures classifier quality
- Higher AUC indicates better discrimination ability

**Output**: Saved to `metrics/{model_name}_roc_curve.png`

### 6. Prediction Confidence Distribution
- Histogram of confidence scores for predictions
- Separates correct vs incorrect predictions
- Helps understand model confidence patterns

**Output**: Saved to `metrics/{model_name}_confidence_distribution.png`

### 7. Per-Class Accuracy
- Bar chart showing accuracy for each class
- Identifies which classes the model struggles with
- Includes mean accuracy line for comparison

**Output**: Saved to `metrics/{model_name}_per_class_accuracy.png`

### 8. Training History Curves
- Training vs Validation Loss over epochs
- Training vs Validation Accuracy over epochs
- Helps identify overfitting or underfitting

**Output**: Saved to `metrics/{model_name}_training_history.png`

## Output Directory Structure

After running any training script, you'll find:

```
ML/
├── metrics/
│   ├── breed_classifier_classification_report.txt
│   ├── breed_classifier_log_loss.txt
│   ├── breed_classifier_confusion_matrix.png
│   ├── breed_classifier_calibration_curve.png
│   ├── breed_classifier_roc_curve.png
│   ├── breed_classifier_confidence_distribution.png
│   ├── breed_classifier_per_class_accuracy.png
│   ├── breed_classifier_training_history.png
│   ├── cat_disease_classifier_classification_report.txt
│   ├── cat_disease_classifier_log_loss.txt
│   ├── cat_disease_classifier_confusion_matrix.png
│   ├── cat_disease_classifier_calibration_curve.png
│   ├── cat_disease_classifier_roc_curve.png
│   ├── cat_disease_classifier_confidence_distribution.png
│   ├── cat_disease_classifier_per_class_accuracy.png
│   ├── cat_disease_classifier_training_history.png
│   ├── dog_disease_classifier_classification_report.txt
│   ├── dog_disease_classifier_log_loss.txt
│   ├── dog_disease_classifier_confusion_matrix.png
│   ├── dog_disease_classifier_calibration_curve.png
│   ├── dog_disease_classifier_roc_curve.png
│   ├── dog_disease_classifier_confidence_distribution.png
│   ├── dog_disease_classifier_per_class_accuracy.png
│   └── dog_disease_classifier_training_history.png
```

## Important Notes

### No Changes to Existing Functionality
- All existing model training logic remains unchanged
- Model saving format is identical
- Prediction APIs work exactly as before
- No restructure of project structure
- No changes to preprocessing or inference code

### Training Output Enhancement
The training loop now prints more detailed information per epoch:
```
Epoch 1/15, Train Loss: 0.5234, Train Acc: 85.23%, Val Loss: 0.4876, Val Acc: 87.45%
```

This provides better insight into training progress without changing the underlying logic.

### Evaluation Runs Automatically
- Evaluation runs after model is saved
- No additional commands needed
- Can be skipped by commenting out the evaluation call if desired

### Plot Display
- Plots appear one at a time
- Close each plot window to see the next
- All plots are saved regardless of whether you close them

## Technical Details

### Evaluation Utility
The evaluation logic is in `evaluate_model.py`:
- **ModelEvaluator class**: Handles all evaluation logic
- **evaluate_cnn_model function**: Convenience function for easy integration
- **Modular design**: Can be reused for other CNN models

### Dependencies
The evaluation uses standard ML libraries:
- `sklearn.metrics`: For classification metrics
- `matplotlib`: For plotting
- `seaborn`: For enhanced visualizations
- `torch`: For model inference

All dependencies are already in your `requirements.txt`.

## Customization

If you want to customize the evaluation:

1. **Modify evaluation utility**: Edit `evaluate_model.py`
2. **Adjust training history tracking**: Edit the training scripts
3. **Change output directory**: Modify the `output_dir` parameter in the evaluation call
4. **Skip evaluation**: Comment out the `evaluate_cnn_model()` call in training scripts

## Troubleshooting

### Plots don't appear
- Ensure matplotlib backend is configured correctly
- Try running in an environment with display support
- Plots are still saved to disk even if not displayed

### Evaluation takes too long
- Evaluation runs on validation set only
- Time depends on validation set size
- Can be skipped if not needed

### Out of memory during evaluation
- Reduce batch size in training script
- Evaluation uses the same dataloader as training
- Consider using a smaller validation set

## Summary

The evaluation functionality provides comprehensive insights into model performance without changing any existing behavior. Simply run your training scripts as usual, and you'll get detailed metrics and visualizations automatically.
