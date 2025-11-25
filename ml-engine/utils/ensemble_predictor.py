# Ensemble predictor combining Random Forest and XGBoost
# Uses weighted voting to combine predictions from multiple models

import numpy as np
import os
import joblib
from utils.predictor import RecommendationPredictor
from utils.xgboost_trainer import XGBoostTrainer, XGBOOST_AVAILABLE


class EnsemblePredictor:
    """
    Ensemble predictor that combines Random Forest and XGBoost models
    Uses weighted average of probability predictions
    """
    
    def __init__(self, rf_model_path=None, xgb_model_path=None):
        self.rf_model_path = rf_model_path or './models/recommendation_model.joblib'
        self.xgb_model_path = xgb_model_path or './models/xgboost_model.joblib'
        
        # Model weights (can be tuned based on validation performance)
        self.weights = {
            'rf': 0.6,   # Random Forest slightly preferred (more stable)
            'xgb': 0.4   # XGBoost provides additional insights
        }
        
        # Initialize individual predictors
        self.rf_predictor = RecommendationPredictor(self.rf_model_path)
        
        # Try to load XGBoost model
        self.xgb_predictor = None
        self.xgb_available = False
        
        if XGBOOST_AVAILABLE and os.path.exists(self.xgb_model_path):
            try:
                self.xgb_predictor = XGBoostTrainer(self.xgb_model_path)
                self.xgb_predictor.load_model()
                self.xgb_available = True
                print("Ensemble: Both RF and XGBoost models loaded")
            except Exception as e:
                print(f"Could not load XGBoost model: {e}")
                print("Ensemble: Using RF model only")
        else:
            print("Ensemble: Using RF model only (XGBoost not available)")
    
    def is_model_loaded(self):
        """Check if at least one model is loaded"""
        return self.rf_predictor.is_model_loaded()
    
    def predict_proba(self, features):
        """
        Get ensemble probability predictions
        
        Args:
            features: Feature vector (numpy array)
        
        Returns:
            Probability array for each class
        """
        if not self.is_model_loaded():
            # Return uniform probabilities
            return np.ones(10) / 10.0
        
        # Ensure features is 2D
        if features.ndim == 1:
            features = features.reshape(1, -1)
        
        # Get RF predictions
        rf_proba = self.rf_predictor.model.predict_proba(features)[0]
        
        # If XGBoost is available, combine predictions
        if self.xgb_available and self.xgb_predictor is not None:
            try:
                xgb_proba = self.xgb_predictor.predict_proba(features)[0]
                
                # Weighted average
                ensemble_proba = (
                    rf_proba * self.weights['rf'] + 
                    xgb_proba * self.weights['xgb']
                )
                
                return ensemble_proba
            except Exception as e:
                print(f"Error getting XGBoost predictions: {e}")
                return rf_proba
        else:
            # Use RF only
            return rf_proba
    
    def predict(self, features, top_k=3, confidence_threshold=0.7):
        """
        Generate course recommendations using ensemble
        
        Args:
            features: Feature vector
            top_k: Number of recommendations
            confidence_threshold: Minimum confidence
        
        Returns:
            List of recommendations with scores
        """
        # Get ensemble probabilities
        probabilities = self.predict_proba(features)
        
        # Get top k predictions
        top_indices = np.argsort(probabilities)[::-1][:top_k * 2]
        
        recommendations = []
        for idx, course_idx in enumerate(top_indices):
            confidence = float(probabilities[course_idx])
            
            if confidence >= confidence_threshold and len(recommendations) < top_k:
                recommendations.append({
                    'course_id': str(course_idx),
                    'confidence_score': round(confidence, 4),
                    'rank': len(recommendations) + 1
                })
        
        # Fill up to top_k if needed
        if len(recommendations) < top_k:
            for idx, course_idx in enumerate(top_indices[:top_k]):
                if idx >= len(recommendations):
                    recommendations.append({
                        'course_id': str(course_idx),
                        'confidence_score': round(float(probabilities[course_idx]), 4),
                        'rank': len(recommendations) + 1
                    })
        
        return recommendations[:top_k]
    
    def get_model_info(self):
        """Get information about loaded models"""
        info = {
            'rf_loaded': self.rf_predictor.is_model_loaded(),
            'xgb_loaded': self.xgb_available,
            'weights': self.weights,
            'ensemble_active': self.xgb_available
        }
        return info

