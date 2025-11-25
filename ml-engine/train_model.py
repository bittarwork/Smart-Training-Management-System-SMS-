# Script to train/retrain the ML recommendation model
# Run this script to generate a new model with correct number of features

from utils.model_trainer import ModelTrainer
from utils.data_processor import DataProcessor

def train_new_model():
    """Train a new recommendation model"""
    print("="*60)
    print("Training New Recommendation Model")
    print("="*60)
    
    # Initialize components
    data_processor = DataProcessor()
    trainer = ModelTrainer('./models/recommendation_model.joblib')
    
    # Check feature count
    expected_features = data_processor._get_expected_features()
    print(f"\nExpected features: {len(expected_features)}")
    print(f"Feature list: {expected_features[:10]}... (showing first 10)")
    
    # Generate training data
    print("\nGenerating training data...")
    # Increased samples for higher confidence with better patterns
    n_samples = 12000  # More samples = better patterns = higher confidence
    n_courses = 30     # More courses for better generalization
    
    X, y = trainer.generate_sample_data(n_samples=n_samples, n_courses=n_courses)
    print(f"Generated {X.shape[0]} samples with {X.shape[1]} features")
    print(f"Training for {len(set(y))} different courses")
    
    # Get feature names from data processor
    feature_names = data_processor._get_expected_features()
    
    # Train model
    print("\nTraining model...")
    trainer.train(X, y, feature_names=feature_names)
    
    # Save model
    print("\nSaving model...")
    trainer.save_model()
    
    print("\n" + "="*60)
    print("[SUCCESS] Model trained and saved successfully!")
    print("="*60)
    print("\nYou can now start the ML engine with: python app.py")

if __name__ == '__main__':
    train_new_model()

