# XGBoost model trainer for course recommendations
# Provides gradient boosting model as alternative/complement to Random Forest

import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score, f1_score
import joblib
import os

try:
    import xgboost as xgb
    XGBOOST_AVAILABLE = True
except ImportError:
    XGBOOST_AVAILABLE = False
    print("Warning: XGBoost not available. Install with: pip install xgboost")


class XGBoostTrainer:
    """
    Trains XGBoost classifier for course recommendations
    Provides faster training and often better accuracy than Random Forest
    """
    
    def __init__(self, model_path='./models/xgboost_model.joblib'):
        self.model_path = model_path
        self.model = None
        self.feature_names = []
        
        if not XGBOOST_AVAILABLE:
            print("XGBoost not available - will use fallback")
            return
        
        # Initialize XGBoost with optimized parameters
        self.model = xgb.XGBClassifier(
            n_estimators=200,        # Same as RF for fair comparison
            max_depth=8,             # Slightly shallower than RF
            learning_rate=0.1,       # Standard learning rate
            objective='multi:softprob',  # Multi-class probability
            eval_metric='mlogloss',  # Log loss for multi-class
            random_state=42,
            n_jobs=-1,
            use_label_encoder=False,
            subsample=0.8,           # Row sampling
            colsample_bytree=0.8     # Column sampling
        )
    
    def train(self, X, y, feature_names=None):
        """
        Train XGBoost classifier
        
        Args:
            X: Feature matrix
            y: Target labels
            feature_names: Optional feature names
        
        Returns:
            Trained model
        """
        if not XGBOOST_AVAILABLE or self.model is None:
            print("Cannot train: XGBoost not available")
            return None
        
        # Store feature names
        if feature_names is not None:
            self.feature_names = feature_names
        
        # Split data with validation set for early stopping
        X_train, X_val, y_train, y_val = train_test_split(
            X, y, test_size=0.2, random_state=42
        )
        
        print("Training XGBoost model...")
        
        # Train with early stopping
        self.model.fit(
            X_train, y_train,
            eval_set=[(X_val, y_val)],
            early_stopping_rounds=20,
            verbose=False
        )
        
        # Evaluate
        y_pred = self.model.predict(X_val)
        accuracy = accuracy_score(y_val, y_pred)
        f1 = f1_score(y_val, y_pred, average='weighted')
        
        print(f"XGBoost Validation Results:")
        print(f"  Accuracy: {accuracy:.4f}")
        print(f"  F1-Score: {f1:.4f}")
        
        return self.model
    
    def predict_proba(self, X):
        """
        Predict class probabilities
        
        Args:
            X: Feature matrix
        
        Returns:
            Probability matrix
        """
        if not XGBOOST_AVAILABLE or self.model is None:
            # Return uniform probabilities if model not available
            n_samples = X.shape[0]
            n_classes = 10  # Default number of classes
            return np.ones((n_samples, n_classes)) / n_classes
        
        return self.model.predict_proba(X)
    
    def save_model(self):
        """Save trained model to disk"""
        if self.model is None:
            raise ValueError("No model to save")
        
        os.makedirs(os.path.dirname(self.model_path), exist_ok=True)
        
        model_data = {
            'model': self.model,
            'feature_names': self.feature_names
        }
        joblib.dump(model_data, self.model_path)
        print(f"XGBoost model saved to {self.model_path}")
    
    def load_model(self):
        """Load model from disk"""
        if not os.path.exists(self.model_path):
            raise FileNotFoundError(f"Model file not found: {self.model_path}")
        
        model_data = joblib.load(self.model_path)
        self.model = model_data['model']
        self.feature_names = model_data.get('feature_names', [])
        print(f"XGBoost model loaded from {self.model_path}")
        
        return self.model

