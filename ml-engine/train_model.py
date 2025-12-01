"""
MEV Detection Model Training

Trains ensemble of ML models for MEV attack detection:
- Random Forest (speed)
- Gradient Boosting (accuracy)
- Ensemble voting classifier
"""

import pandas as pd
import numpy as np
import joblib
from pathlib import Path
import time

from sklearn.ensemble import RandomForestClassifier, GradientBoostingClassifier, VotingClassifier
from sklearn.metrics import (
    accuracy_score, precision_score, recall_score, f1_score,
    confusion_matrix, classification_report, roc_auc_score
)
import lightgbm as lgb

from feature_engineering import MEVFeatureEngineer


class MEVModelTrainer:
    """Train and evaluate MEV detection models"""
    
    def __init__(self):
        self.models = {}
        self.ensemble = None
        self.feature_engineer = None
        self.training_time = {}
        
    def train_random_forest(self, X_train, y_train):
        """
        Train Random Forest classifier (optimized for speed)
        
        Fast inference (<50ms) for real-time detection
        """
        print("\n" + "="*60)
        print("Training Random Forest...")
        print("="*60)
        
        start_time = time.time()
        
        rf_model = RandomForestClassifier(
            n_estimators=100,  # Good balance of accuracy/speed
            max_depth=15,  # Prevent overfitting
            min_samples_split=20,
            min_samples_leaf=10,
            max_features='sqrt',
            n_jobs=-1,  # Use all cores
            random_state=42,
            class_weight='balanced'  # Handle class imbalance
        )
        
        rf_model.fit(X_train, y_train)
        
        training_time = time.time() - start_time
        self.training_time['random_forest'] = training_time
        
        print(f"✓ Training completed in {training_time:.2f}s")
        
        # Feature importance
        feature_importance = pd.DataFrame({
            'feature': X_train.columns,
            'importance': rf_model.feature_importances_
        }).sort_values('importance', ascending=False)
        
        print("\nTop 10 Most Important Features:")
        print(feature_importance.head(10))
        
        self.models['random_forest'] = rf_model
        return rf_model
    
    def train_gradient_boosting(self, X_train, y_train):
        """
        Train LightGBM Gradient Boosting (higher accuracy)
        
        Slower but more accurate for batch processing
        """
        print("\n" + "="*60)
        print("Training LightGBM Gradient Boosting...")
        print("="*60)
        
        start_time = time.time()
        
        lgb_model = lgb.LGBMClassifier(
            n_estimators=200,
            max_depth=12,
            learning_rate=0.05,
            num_leaves=31,
            min_child_samples=20,
            subsample=0.8,
            colsample_bytree=0.8,
            n_jobs=-1,
            random_state=42,
            class_weight='balanced'
        )
        
        lgb_model.fit(X_train, y_train)
        
        training_time = time.time() - start_time
        self.training_time['gradient_boosting'] = training_time
        
        print(f"✓ Training completed in {training_time:.2f}s")
        
        self.models['gradient_boosting'] = lgb_model
        return lgb_model
    
    def train_ensemble(self, X_train, y_train):
        """
        Train ensemble voting classifier
        
        Combines RF (speed) + GBM (accuracy)
        """
        print("\n" + "="*60)
        print("Training Ensemble Model...")
        print("="*60)
        
        # Get individual models
        rf_model = self.models.get('random_forest')
        gb_model = self.models.get('gradient_boosting')
        
        if rf_model is None or gb_model is None:
            raise ValueError("Train individual models first")
        
        start_time = time.time()
        
        # Ensemble with soft voting (probability averaging)
        self.ensemble = VotingClassifier(
            estimators=[
                ('rf', rf_model),
                ('gb', gb_model)
            ],
            voting='soft',  # Average probabilities
            weights=[1, 1.5]  # Give more weight to gradient boosting
        )
        
        # Note: Voting classifier doesn't need retraining if base models are fitted
        # But we'll fit it anyway for consistency
        self.ensemble.fit(X_train, y_train)
        
        training_time = time.time() - start_time
        self.training_time['ensemble'] = training_time
        
        print(f"✓ Ensemble training completed in {training_time:.2f}s")
        
        return self.ensemble
    
    def evaluate_model(self, model, X_test, y_test, model_name='Model'):
        """Comprehensive model evaluation"""
        print("\n" + "="*60)
        print(f"{model_name} Evaluation")
        print("="*60)
        
        # Predictions
        start_time = time.time()
        y_pred = model.predict(X_test)
        inference_time = (time.time() - start_time) / len(X_test) * 1000  # ms per sample
        
        # Probability predictions for AUC
        if hasattr(model, 'predict_proba'):
            y_pred_proba = model.predict_proba(X_test)[:, 1]
            auc_score = roc_auc_score(y_test, y_pred_proba)
        else:
            auc_score = None
        
        # Metrics
        accuracy = accuracy_score(y_test, y_pred)
        precision = precision_score(y_test, y_pred)
        recall = recall_score(y_test, y_pred)
        f1 = f1_score(y_test, y_pred)
        
        # Print results
        print(f"\nAccuracy:  {accuracy:.4f} ({accuracy*100:.2f}%)")
        print(f"Precision: {precision:.4f} ({precision*100:.2f}%)")
        print(f"Recall:    {recall:.4f} ({recall*100:.2f}%)")
        print(f"F1 Score:  {f1:.4f}")
        if auc_score:
            print(f"AUC-ROC:   {auc_score:.4f}")
        print(f"\nInference Time: {inference_time:.2f}ms per transaction")
        
        # Confusion matrix
        cm = confusion_matrix(y_test, y_pred)
        print("\nConfusion Matrix:")
        print(f"                 Predicted")
        print(f"                 Normal  Attack")
        print(f"Actual Normal    {cm[0,0]:6d}  {cm[0,1]:6d}")
        print(f"Actual Attack    {cm[1,0]:6d}  {cm[1,1]:6d}")
        
        # Classification report
        print("\nDetailed Classification Report:")
        print(classification_report(y_test, y_pred, target_names=['Normal', 'Attack']))
        
        return {
            'accuracy': accuracy,
            'precision': precision,
            'recall': recall,
            'f1': f1,
            'auc': auc_score,
            'inference_time_ms': inference_time,
            'confusion_matrix': cm
        }
    
    def evaluate_all_models(self, X_test, y_test):
        """Evaluate all trained models"""
        results = {}
        
        for model_name, model in self.models.items():
            results[model_name] = self.evaluate_model(
                model, X_test, y_test, 
                model_name=model_name.replace('_', ' ').title()
            )
        
        # Evaluate ensemble if trained
        if self.ensemble is not None:
            results['ensemble'] = self.evaluate_model(
                self.ensemble, X_test, y_test,
                model_name='Ensemble'
            )
        
        # Summary comparison
        print("\n" + "="*60)
        print("Model Comparison Summary")
        print("="*60)
        
        comparison_df = pd.DataFrame(results).T
        comparison_df = comparison_df[['accuracy', 'precision', 'recall', 'f1', 'inference_time_ms']]
        print(comparison_df)
        
        return results
    
    def save_models(self, output_dir='models'):
        """Save all trained models"""
        output_path = Path(output_dir)
        output_path.mkdir(parents=True, exist_ok=True)
        
        # Save each model
        for model_name, model in self.models.items():
            model_file = output_path / f'{model_name}.joblib'
            joblib.dump(model, model_file)
            print(f"✓ Saved {model_name} to {model_file}")
        
        # Save ensemble
        if self.ensemble is not None:
            ensemble_file = output_path / 'ensemble.joblib'
            joblib.dump(self.ensemble, ensemble_file)
            print(f"✓ Saved ensemble to {ensemble_file}")
        
        # Save training metadata
        metadata = {
            'training_time': self.training_time,
            'model_names': list(self.models.keys())
        }
        metadata_file = output_path / 'model_metadata.joblib'
        joblib.dump(metadata, metadata_file)
        
        print(f"\n✓ All models saved to {output_path}")
    
    @classmethod
    def load_models(cls, model_dir='models'):
        """Load pre-trained models"""
        model_path = Path(model_dir)
        
        trainer = cls()
        
        # Load individual models
        for model_file in model_path.glob('*.joblib'):
            if model_file.stem in ['random_forest', 'gradient_boosting']:
                model = joblib.load(model_file)
                trainer.models[model_file.stem] = model
                print(f"✓ Loaded {model_file.stem}")
        
        # Load ensemble
        ensemble_file = model_path / 'ensemble.joblib'
        if ensemble_file.exists():
            trainer.ensemble = joblib.load(ensemble_file)
            print(f"✓ Loaded ensemble")
        
        # Load metadata
        metadata_file = model_path / 'model_metadata.joblib'
        if metadata_file.exists():
            metadata = joblib.load(metadata_file)
            trainer.training_time = metadata.get('training_time', {})
        
        return trainer


def main():
    """Complete model training pipeline"""
    print("="*60)
    print("MEV SHIELD - MODEL TRAINING")
    print("="*60)
    
    # Load data
    print("\n1. Loading data...")
    df = pd.read_csv('data/mev_transactions.csv')
    print(f"Loaded {len(df):,} transactions")
    
    # Feature engineering
    print("\n2. Engineering features...")
    engineer = MEVFeatureEngineer()
    X_train, X_test, y_train, y_test = engineer.prepare_data(df)
    engineer.save()
    
    # Train models
    print("\n3. Training models...")
    trainer = MEVModelTrainer()
    trainer.feature_engineer = engineer
    
    # Train individual models
    trainer.train_random_forest(X_train, y_train)
    trainer.train_gradient_boosting(X_train, y_train)
    
    # Train ensemble
    trainer.train_ensemble(X_train, y_train)
    
    # Evaluate
    print("\n4. Evaluating models...")
    results = trainer.evaluate_all_models(X_test, y_test)
    
    # Save models
    print("\n5. Saving models...")
    trainer.save_models()
    
    # Final summary
    print("\n" + "="*60)
    print("TRAINING COMPLETE!")
    print("="*60)
    print(f"\nTotal training time:")
    for model_name, train_time in trainer.training_time.items():
        print(f"  {model_name}: {train_time:.2f}s")
    
    print("\n✓ Models ready for deployment!")
    print("✓ Use inference_api.py to serve predictions")


if __name__ == '__main__':
    main()
