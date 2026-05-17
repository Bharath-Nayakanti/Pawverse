"""
Model Evaluation and Visualization Utility
Provides comprehensive evaluation metrics and visualizations for CNN models
Compatible with breed, cat disease, and dog disease models
"""

from pathlib import Path
from typing import Dict, List, Tuple, Optional
import numpy as np
import torch
import torch.nn as nn
from torch.utils.data import DataLoader
from sklearn.metrics import (
    classification_report,
    confusion_matrix,
    log_loss,
    roc_auc_score,
    roc_curve,
    auc
)
from sklearn.preprocessing import label_binarize
from sklearn.calibration import calibration_curve
import matplotlib.pyplot as plt
import seaborn as sns
import warnings
warnings.filterwarnings('ignore')


class ModelEvaluator:
    """
    Comprehensive evaluator for CNN classification models
    Generates metrics and visualizations without modifying existing model behavior
    """
    
    def __init__(self, model: nn.Module, dataloader: DataLoader, 
                 classes: List[str], output_dir: Path, model_name: str):
        """
        Initialize evaluator
        
        Args:
            model: Trained PyTorch model
            dataloader: Validation/test dataloader
            classes: List of class names
            output_dir: Directory to save evaluation outputs
            model_name: Name of the model for file naming
        """
        self.model = model
        self.dataloader = dataloader
        self.classes = classes
        self.output_dir = Path(output_dir)
        self.model_name = model_name
        self.device = next(model.parameters()).device
        
        # Create output directory
        self.metrics_dir = self.output_dir / "metrics"
        self.metrics_dir.mkdir(parents=True, exist_ok=True)
        
        # Storage for predictions and labels
        self.all_predictions = []
        self.all_labels = []
        self.all_probabilities = []
        
    def collect_predictions(self) -> Tuple[np.ndarray, np.ndarray, np.ndarray]:
        """
        Collect all predictions, labels, and probabilities from dataloader
        
        Returns:
            predictions: Predicted class indices
            labels: True class indices
            probabilities: Predicted probabilities for each class
        """
        self.model.eval()
        
        with torch.no_grad():
            for images, labels in self.dataloader:
                images = images.to(self.device)
                labels = labels.to(self.device)
                
                outputs = self.model(images)
                probabilities = torch.softmax(outputs, dim=1)
                _, predicted = torch.max(outputs, 1)
                
                self.all_predictions.extend(predicted.cpu().numpy())
                self.all_labels.extend(labels.cpu().numpy())
                self.all_probabilities.extend(probabilities.cpu().numpy())
        
        return (
            np.array(self.all_predictions),
            np.array(self.all_labels),
            np.array(self.all_probabilities)
        )
    
    def print_classification_report(self, predictions: np.ndarray, labels: np.ndarray):
        """
        Print comprehensive classification report
        
        Args:
            predictions: Predicted class indices
            labels: True class indices
        """
        print("\n" + "="*70)
        print(f"CLASSIFICATION REPORT - {self.model_name}")
        print("="*70)
        
        report = classification_report(
            labels, 
            predictions, 
            target_names=self.classes,
            digits=4
        )
        print(report)
        print("="*70 + "\n")
        
        # Save report to file
        report_path = self.metrics_dir / f"{self.model_name}_classification_report.txt"
        with open(report_path, 'w') as f:
            f.write(f"CLASSIFICATION REPORT - {self.model_name}\n")
            f.write("="*70 + "\n")
            f.write(report)
            f.write("\n" + "="*70 + "\n")
        
        print(f"Classification report saved to: {report_path}")
    
    def calculate_log_loss(self, probabilities: np.ndarray, labels: np.ndarray):
        """
        Calculate and print log loss
        
        Args:
            probabilities: Predicted probabilities
            labels: True labels
        """
        log_loss_value = log_loss(labels, probabilities)
        
        print(f"\nLog Loss: {log_loss_value:.4f}")
        
        # Save to file
        log_loss_path = self.metrics_dir / f"{self.model_name}_log_loss.txt"
        with open(log_loss_path, 'w') as f:
            f.write(f"Log Loss: {log_loss_value:.4f}\n")
        
        print(f"Log loss saved to: {log_loss_path}")
        
        return log_loss_value
    
    def plot_confusion_matrix(self, predictions: np.ndarray, labels: np.ndarray):
        """
        Plot and save confusion matrix
        
        Args:
            predictions: Predicted class indices
            labels: True class indices
        """
        cm = confusion_matrix(labels, predictions)
        
        plt.figure(figsize=(12, 10))
        sns.heatmap(
            cm, 
            annot=True, 
            fmt='d', 
            cmap='Blues',
            xticklabels=self.classes,
            yticklabels=self.classes,
            cbar_kws={'label': 'Count'}
        )
        plt.title(f'Confusion Matrix - {self.model_name}', fontsize=16, fontweight='bold')
        plt.xlabel('Predicted Label', fontsize=12)
        plt.ylabel('True Label', fontsize=12)
        plt.xticks(rotation=45, ha='right')
        plt.yticks(rotation=0)
        plt.tight_layout()
        
        # Save plot
        cm_path = self.metrics_dir / f"{self.model_name}_confusion_matrix.png"
        plt.savefig(cm_path, dpi=300, bbox_inches='tight')
        print(f"Confusion matrix saved to: {cm_path}")
        plt.show()
        plt.close()
    
    def plot_calibration_curve(self, probabilities: np.ndarray, labels: np.ndarray):
        """
        Plot calibration curve for multiclass classification
        
        Args:
            probabilities: Predicted probabilities
            labels: True labels
        """
        n_classes = len(self.classes)
        
        plt.figure(figsize=(12, 8))
        
        # Plot calibration curve for each class
        for i in range(min(n_classes, 10)):  # Limit to 10 classes for readability
            class_prob_true = (labels == i).astype(int)
            class_prob_pred = probabilities[:, i]
            
            prob_true, prob_pred = calibration_curve(
                class_prob_true, 
                class_prob_pred, 
                n_bins=10
            )
            
            plt.plot(prob_pred, prob_true, marker='o', linewidth=2, 
                    label=f'{self.classes[i]}', markersize=4)
        
        # Plot perfect calibration line
        plt.plot([0, 1], [0, 1], 'k--', linewidth=2, label='Perfectly Calibrated')
        
        plt.title(f'Calibration Curve - {self.model_name}', fontsize=16, fontweight='bold')
        plt.xlabel('Mean Predicted Probability', fontsize=12)
        plt.ylabel('Fraction of Positives', fontsize=12)
        plt.legend(loc='best', fontsize=10)
        plt.grid(True, alpha=0.3)
        plt.tight_layout()
        
        # Save plot
        cal_path = self.metrics_dir / f"{self.model_name}_calibration_curve.png"
        plt.savefig(cal_path, dpi=300, bbox_inches='tight')
        print(f"Calibration curve saved to: {cal_path}")
        plt.show()
        plt.close()
    
    def plot_roc_curve(self, probabilities: np.ndarray, labels: np.ndarray):
        """
        Plot ROC curve for multiclass classification (one-vs-rest)
        
        Args:
            probabilities: Predicted probabilities
            labels: True labels
        """
        n_classes = len(self.classes)
        
        # Binarize labels for multiclass ROC
        labels_bin = label_binarize(labels, classes=range(n_classes))
        
        plt.figure(figsize=(12, 8))
        
        # Calculate ROC curve for each class
        for i in range(min(n_classes, 10)):  # Limit to 10 classes for readability
            fpr, tpr, _ = roc_curve(labels_bin[:, i], probabilities[:, i])
            roc_auc = auc(fpr, tpr)
            
            plt.plot(fpr, tpr, linewidth=2, 
                    label=f'{self.classes[i]} (AUC = {roc_auc:.3f})')
        
        # Plot diagonal line
        plt.plot([0, 1], [0, 1], 'k--', linewidth=2, label='Random Classifier')
        
        plt.title(f'ROC Curve (One-vs-Rest) - {self.model_name}', fontsize=16, fontweight='bold')
        plt.xlabel('False Positive Rate', fontsize=12)
        plt.ylabel('True Positive Rate', fontsize=12)
        plt.legend(loc='lower right', fontsize=9)
        plt.grid(True, alpha=0.3)
        plt.tight_layout()
        
        # Save plot
        roc_path = self.metrics_dir / f"{self.model_name}_roc_curve.png"
        plt.savefig(roc_path, dpi=300, bbox_inches='tight')
        print(f"ROC curve saved to: {roc_path}")
        plt.show()
        plt.close()
    
    def plot_prediction_confidence(self, probabilities: np.ndarray, labels: np.ndarray, 
                                   predictions: np.ndarray):
        """
        Plot prediction confidence distribution
        
        Args:
            probabilities: Predicted probabilities
            labels: True labels
            predictions: Predicted class indices
        """
        # Get confidence for predicted class
        predicted_confidences = np.max(probabilities, axis=1)
        
        # Separate correct and incorrect predictions
        correct_mask = predictions == labels
        correct_confidences = predicted_confidences[correct_mask]
        incorrect_confidences = predicted_confidences[~correct_mask]
        
        plt.figure(figsize=(12, 6))
        
        # Plot histogram
        plt.hist(correct_confidences, bins=50, alpha=0.7, label='Correct Predictions', 
                color='green', edgecolor='black')
        plt.hist(incorrect_confidences, bins=50, alpha=0.7, label='Incorrect Predictions', 
                color='red', edgecolor='black')
        
        plt.title(f'Prediction Confidence Distribution - {self.model_name}', 
                 fontsize=16, fontweight='bold')
        plt.xlabel('Confidence Score', fontsize=12)
        plt.ylabel('Frequency', fontsize=12)
        plt.legend(fontsize=12)
        plt.grid(True, alpha=0.3)
        plt.tight_layout()
        
        # Save plot
        conf_path = self.metrics_dir / f"{self.model_name}_confidence_distribution.png"
        plt.savefig(conf_path, dpi=300, bbox_inches='tight')
        print(f"Confidence distribution saved to: {conf_path}")
        plt.show()
        plt.close()
        
        # Print statistics
        print(f"\nConfidence Statistics:")
        print(f"  Mean confidence (correct): {np.mean(correct_confidences):.4f}")
        print(f"  Mean confidence (incorrect): {np.mean(incorrect_confidences):.4f}")
        print(f"  Correct predictions: {len(correct_confidences)}")
        print(f"  Incorrect predictions: {len(incorrect_confidences)}")
    
    def plot_per_class_accuracy(self, predictions: np.ndarray, labels: np.ndarray):
        """
        Plot accuracy per class
        
        Args:
            predictions: Predicted class indices
            labels: True class indices
        """
        per_class_acc = []
        for i, class_name in enumerate(self.classes):
            class_mask = labels == i
            if class_mask.sum() > 0:
                class_acc = (predictions[class_mask] == labels[class_mask]).mean()
                per_class_acc.append(class_acc)
            else:
                per_class_acc.append(0.0)
        
        plt.figure(figsize=(14, 6))
        
        bars = plt.bar(range(len(self.classes)), per_class_acc, color='steelblue', edgecolor='black')
        plt.axhline(y=np.mean(per_class_acc), color='red', linestyle='--', 
                   label=f'Mean Accuracy: {np.mean(per_class_acc):.3f}')
        
        plt.title(f'Per-Class Accuracy - {self.model_name}', fontsize=16, fontweight='bold')
        plt.xlabel('Class', fontsize=12)
        plt.ylabel('Accuracy', fontsize=12)
        plt.xticks(range(len(self.classes)), self.classes, rotation=45, ha='right')
        plt.legend(fontsize=12)
        plt.grid(True, alpha=0.3, axis='y')
        plt.ylim(0, 1.1)
        plt.tight_layout()
        
        # Save plot
        acc_path = self.metrics_dir / f"{self.model_name}_per_class_accuracy.png"
        plt.savefig(acc_path, dpi=300, bbox_inches='tight')
        print(f"Per-class accuracy saved to: {acc_path}")
        plt.show()
        plt.close()
    
    def evaluate(self, train_history: Optional[Dict] = None):
        """
        Run complete evaluation pipeline
        
        Args:
            train_history: Optional dictionary containing training history 
                         (train_losses, val_losses, train_accs, val_accs)
        """
        print(f"\n{'='*70}")
        print(f"STARTING EVALUATION FOR: {self.model_name}")
        print(f"{'='*70}\n")
        
        # Collect predictions
        predictions, labels, probabilities = self.collect_predictions()
        
        # 1. Classification Report
        self.print_classification_report(predictions, labels)
        
        # 2. Log Loss
        self.calculate_log_loss(probabilities, labels)
        
        # 3. Confusion Matrix
        self.plot_confusion_matrix(predictions, labels)
        
        # 4. Calibration Curve
        self.plot_calibration_curve(probabilities, labels)
        
        # 5. ROC Curve
        self.plot_roc_curve(probabilities, labels)
        
        # 6. Prediction Confidence
        self.plot_prediction_confidence(probabilities, labels, predictions)
        
        # 7. Per-Class Accuracy
        self.plot_per_class_accuracy(predictions, labels)
        
        # 8. Training History (if provided)
        if train_history:
            self.plot_training_history(train_history)
        
        print(f"\n{'='*70}")
        print(f"EVALUATION COMPLETE FOR: {self.model_name}")
        print(f"All metrics and plots saved to: {self.metrics_dir}")
        print(f"{'='*70}\n")
    
    def plot_training_history(self, history: Dict):
        """
        Plot training and validation accuracy/loss curves
        
        Args:
            history: Dictionary with keys 'train_losses', 'val_losses', 
                    'train_accs', 'val_accs'
        """
        fig, axes = plt.subplots(1, 2, figsize=(16, 6))
        
        # Plot loss curves
        if 'train_losses' in history and 'val_losses' in history:
            axes[0].plot(history['train_losses'], label='Training Loss', linewidth=2)
            axes[0].plot(history['val_losses'], label='Validation Loss', linewidth=2)
            axes[0].set_title(f'Training & Validation Loss - {self.model_name}', 
                            fontsize=14, fontweight='bold')
            axes[0].set_xlabel('Epoch', fontsize=12)
            axes[0].set_ylabel('Loss', fontsize=12)
            axes[0].legend(fontsize=12)
            axes[0].grid(True, alpha=0.3)
        
        # Plot accuracy curves
        if 'train_accs' in history and 'val_accs' in history:
            axes[1].plot(history['train_accs'], label='Training Accuracy', linewidth=2)
            axes[1].plot(history['val_accs'], label='Validation Accuracy', linewidth=2)
            axes[1].set_title(f'Training & Validation Accuracy - {self.model_name}', 
                            fontsize=14, fontweight='bold')
            axes[1].set_xlabel('Epoch', fontsize=12)
            axes[1].set_ylabel('Accuracy', fontsize=12)
            axes[1].legend(fontsize=12)
            axes[1].grid(True, alpha=0.3)
        
        plt.tight_layout()
        
        # Save plot
        history_path = self.metrics_dir / f"{self.model_name}_training_history.png"
        plt.savefig(history_path, dpi=300, bbox_inches='tight')
        print(f"Training history saved to: {history_path}")
        plt.show()
        plt.close()


def evaluate_cnn_model(model: nn.Module, val_loader: DataLoader, 
                      classes: List[str], output_dir: Path, 
                      model_name: str, train_history: Optional[Dict] = None):
    """
    Convenience function to evaluate a CNN model
    
    Args:
        model: Trained PyTorch model
        val_loader: Validation dataloader
        classes: List of class names
        output_dir: Directory to save outputs
        model_name: Name for file naming
        train_history: Optional training history dictionary
    """
    evaluator = ModelEvaluator(model, val_loader, classes, output_dir, model_name)
    evaluator.evaluate(train_history)
