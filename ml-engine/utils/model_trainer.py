# Model training and persistence
# Trains Random Forest classifier and saves model for production use

import pandas as pd
import numpy as np
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split, cross_val_score
from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score, confusion_matrix
import joblib
import os
import json
from datetime import datetime, timedelta

class ModelTrainer:
    """
    Trains Random Forest classifier for course recommendations
    Model parameters: n_estimators=200, max_depth=12, class_weight='balanced'
    Feature weighting: Technical Skills (40%), Experience (30%), Department (20%), Location (10%)
    """
    
    def __init__(self, model_path='./models/recommendation_model.joblib'):
        self.model_path = model_path
        self.metrics_path = './models/model_metrics.json'
        self.model = None
        self.feature_names = []
        self.metrics = {}
        self.feature_importances = {}
        
        # Ensure models directory exists
        os.makedirs(os.path.dirname(model_path), exist_ok=True)
    
    def train(self, X, y, feature_names=None):
        """
        Train Random Forest classifier
        
        Args:
            X: Feature matrix (numpy array or pandas DataFrame)
            y: Target labels (course IDs or course indices)
            feature_names: Optional list of feature names
        
        Returns:
            Trained model
        """
        # Convert to numpy if needed and store feature names
        if isinstance(X, pd.DataFrame):
            self.feature_names = X.columns.tolist()
            X = X.values
        elif feature_names is not None:
            self.feature_names = feature_names
        else:
            # Generate default feature names if not provided
            self.feature_names = [f'feature_{i}' for i in range(X.shape[1])]
        
        # Split data for validation
        # Use stratify only if all classes have at least 2 samples
        unique_classes, class_counts = np.unique(y, return_counts=True)
        min_samples_per_class = np.min(class_counts)
        
        if min_samples_per_class >= 2:
            try:
                X_train, X_test, y_train, y_test = train_test_split(
                    X, y, test_size=0.2, random_state=42, stratify=y
                )
            except ValueError:
                # Fallback if stratify fails
                X_train, X_test, y_train, y_test = train_test_split(
                    X, y, test_size=0.2, random_state=42
                )
        else:
            # Don't use stratify if classes have insufficient samples
            X_train, X_test, y_train, y_test = train_test_split(
                X, y, test_size=0.2, random_state=42
            )
        
        # Initialize Random Forest with academic report specifications
        # n_estimators=200: Optimal balance between accuracy and computation
        # max_depth=12: Prevents overfitting while capturing complex patterns
        # class_weight='balanced': Handles imbalanced course distribution
        self.model = RandomForestClassifier(
            n_estimators=200,          # Academic report specification
            max_depth=12,              # Academic report specification
            min_samples_split=5,       # Prevent overfitting
            min_samples_leaf=2,        # Smoother predictions
            class_weight='balanced',   # Academic report specification - handle imbalanced data
            random_state=42,
            n_jobs=-1,
            max_features='sqrt',       # Feature sampling for diversity
            bootstrap=True,            # Enable bagging
            oob_score=True            # Out-of-bag validation
        )
        
        # Perform 5-fold cross-validation before final training
        # This provides robust performance estimation across different data splits
        print("Performing 5-fold cross-validation...")
        cv_scores = cross_val_score(self.model, X, y, cv=5, scoring='f1_weighted', n_jobs=-1)
        cv_mean = cv_scores.mean()
        cv_std = cv_scores.std()
        
        print(f"Cross-Validation Results:")
        print(f"  F1-Score (5-fold): {cv_mean:.4f} (+/- {cv_std:.4f})")
        print(f"  Individual folds: {[f'{score:.4f}' for score in cv_scores]}")
        
        # Train final model on training data
        print("\nTraining Random Forest classifier on training set...")
        self.model.fit(X_train, y_train)
        
        # Evaluate model on test set
        y_pred = self.model.predict(X_test)
        y_pred_proba = self.model.predict_proba(X_test)
        
        # Calculate comprehensive evaluation metrics
        accuracy = accuracy_score(y_test, y_pred)
        precision = precision_score(y_test, y_pred, average='weighted', zero_division=0)
        recall = recall_score(y_test, y_pred, average='weighted', zero_division=0)
        f1 = f1_score(y_test, y_pred, average='weighted', zero_division=0)
        
        # Calculate average confidence (max probability)
        avg_confidence = np.mean(np.max(y_pred_proba, axis=1))
        
        # Generate confusion matrix
        conf_matrix = confusion_matrix(y_test, y_pred)
        
        # Calculate feature importance with category weighting
        # Feature weighting: Technical Skills (40%), Experience (30%), Department (20%), Location (10%)
        feature_importance = self.model.feature_importances_
        self.feature_importances = self._apply_feature_weighting(feature_importance)
        
        # Store metrics for API access
        self.metrics = {
            'accuracy': float(accuracy),
            'precision': float(precision),
            'recall': float(recall),
            'f1_score': float(f1),
            'cv_mean': float(cv_mean),
            'cv_std': float(cv_std),
            'cv_scores': [float(score) for score in cv_scores],
            'avg_confidence': float(avg_confidence),
            'oob_score': float(self.model.oob_score_) if hasattr(self.model, 'oob_score_') else None,
            'confusion_matrix': conf_matrix.tolist(),
            'feature_importances': self.feature_importances,
            'model_version': datetime.now().strftime('%Y%m%d_%H%M%S'),
            'training_date': datetime.now().isoformat(),
            'n_samples': len(X),
            'n_features': X.shape[1],
            'model_params': {
                'n_estimators': self.model.n_estimators,
                'max_depth': self.model.max_depth,
                'class_weight': str(self.model.class_weight)
            }
        }
        
        # Display performance metrics
        print(f"\nModel Performance (Test Set):")
        print(f"  Accuracy: {accuracy:.4f} ({accuracy*100:.2f}%)")
        print(f"  Precision: {precision:.4f} ({precision*100:.2f}%)")
        print(f"  Recall: {recall:.4f} ({recall*100:.2f}%)")
        print(f"  F1-Score: {f1:.4f} ({f1*100:.2f}%)")
        print(f"  Average Confidence: {avg_confidence:.4f} ({avg_confidence*100:.2f}%)")
        if hasattr(self.model, 'oob_score_'):
            print(f"  Out-of-Bag Score: {self.model.oob_score_:.4f}")
        
        # Check if metrics meet target threshold (>=85%)
        if f1 >= 0.85:
            print(f"  [OK] Model meets target F1-Score threshold (>=85%)")
        else:
            print(f"  [WARNING] Model below target F1-Score threshold (>=85%)")
        
        return self.model
    
    def _apply_feature_weighting(self, feature_importance):
        """
        Apply academic feature weighting scheme to raw feature importances
        Weighting: Technical Skills (40%), Experience (30%), Department (20%), Location (10%)
        
        Args:
            feature_importance: Raw feature importances from Random Forest
            
        Returns:
            Dictionary with weighted feature importances by category
        """
        if len(self.feature_names) == 0:
            return {}
        
        # Initialize category weights
        category_weights = {
            'technical_skills': 0.40,  # 40% weight
            'experience': 0.30,        # 30% weight
            'department': 0.20,        # 20% weight
            'location': 0.10           # 10% weight
        }
        
        # Map features to categories
        weighted_importances = {}
        for idx, feature_name in enumerate(self.feature_names):
            importance = float(feature_importance[idx])
            
            # Determine feature category
            if 'skill_' in feature_name.lower():
                category = 'technical_skills'
            elif 'experience' in feature_name.lower():
                category = 'experience'
            elif 'dept_' in feature_name.lower() or 'department' in feature_name.lower():
                category = 'department'
            elif 'location_' in feature_name.lower():
                category = 'location'
            else:
                category = 'technical_skills'  # Default to skills
            
            # Apply category weight
            weighted_importance = importance * category_weights[category]
            weighted_importances[feature_name] = {
                'raw_importance': importance,
                'weighted_importance': weighted_importance,
                'category': category,
                'category_weight': category_weights[category]
            }
        
        return weighted_importances
    
    def save_model(self):
        """Save trained model and metrics to disk"""
        if self.model is None:
            raise ValueError("No model to save. Train the model first.")
        
        # Save model
        model_data = {
            'model': self.model,
            'feature_names': self.feature_names
        }
        joblib.dump(model_data, self.model_path)
        print(f"Model saved to {self.model_path}")
        
        # Save metrics separately as JSON for easy API access
        if self.metrics:
            with open(self.metrics_path, 'w') as f:
                json.dump(self.metrics, f, indent=2)
            print(f"Metrics saved to {self.metrics_path}")
    
    def load_model(self):
        """Load model from disk"""
        if not os.path.exists(self.model_path):
            raise FileNotFoundError(f"Model file not found: {self.model_path}")
        
        model_data = joblib.load(self.model_path)
        self.model = model_data['model']
        self.feature_names = model_data.get('feature_names', [])
        print(f"Model loaded from {self.model_path}")
        
        return self.model
    
    def load_metrics(self):
        """
        Load saved metrics from JSON file
        
        Returns:
            Dictionary containing model performance metrics
        """
        if not os.path.exists(self.metrics_path):
            print(f"Warning: Metrics file not found at {self.metrics_path}")
            return {}
        
        try:
            with open(self.metrics_path, 'r') as f:
                self.metrics = json.load(f)
            print(f"Metrics loaded from {self.metrics_path}")
            return self.metrics
        except Exception as e:
            print(f"Error loading metrics: {str(e)}")
            return {}
    
    def get_metrics(self):
        """
        Get current metrics, loading from file if not in memory
        
        Returns:
            Dictionary containing model performance metrics
        """
        if not self.metrics and os.path.exists(self.metrics_path):
            return self.load_metrics()
        return self.metrics
    
    def generate_sample_data(self, n_samples=12000, n_courses=30):
        """
        Generate high-quality realistic sample training data with strong logical patterns
        Enhanced with Career Path logic and more realistic skill distributions
        More samples = better confidence. In production, replace with real employee data
        """
        from utils.data_processor import DataProcessor
        from datetime import datetime, timedelta, timedelta
        
        np.random.seed(42)
        data_processor = DataProcessor()
        
        # Get expected feature count from DataProcessor
        expected_features = data_processor._get_expected_features()
        n_features = len(expected_features)
        
        # Define comprehensive course profiles with career path information
        course_profiles = {
            'python_beginner': {
                'required_skills': {'python': [1,2]},
                'fills_gaps': ['python'],
                'target_level': 'Beginner',
                'dept_fit': ['information_technology', 'engineering'],
                'career_levels': ['Junior'],
                'critical_for_dept': True
            },
            'python_advanced': {
                'required_skills': {'python': [3,5], 'sql': [2,4]},
                'fills_gaps': ['machine_learning', 'data_analysis'],
                'target_level': 'Advanced',
                'dept_fit': ['information_technology', 'engineering'],
                'career_levels': ['Mid', 'Senior'],
                'critical_for_dept': True
            },
            'data_science': {
                'required_skills': {'python': [3,5], 'sql': [3,5], 'machine_learning': [2,4]},
                'fills_gaps': ['data_analysis', 'machine_learning'],
                'target_level': 'Advanced',
                'dept_fit': ['information_technology'],
                'career_levels': ['Senior', 'Lead'],
                'critical_for_dept': True
            },
            'web_dev_fullstack': {
                'required_skills': {'javascript': [3,5], 'python': [2,4], 'react': [2,4], 'node.js': [2,4]},
                'fills_gaps': ['web_development', 'react', 'node.js'],
                'target_level': 'Intermediate',
                'dept_fit': ['information_technology'],
                'career_levels': ['Mid', 'Senior'],
                'critical_for_dept': True
            },
            'frontend_react': {
                'required_skills': {'javascript': [3,5], 'react': [2,4]},
                'fills_gaps': ['react', 'web_development'],
                'target_level': 'Intermediate',
                'dept_fit': ['information_technology'],
                'career_levels': ['Junior', 'Mid'],
                'critical_for_dept': False
            },
            'backend_nodejs': {
                'required_skills': {'javascript': [2,4], 'node.js': [2,5], 'sql': [2,4]},
                'fills_gaps': ['node.js', 'database_design'],
                'target_level': 'Intermediate',
                'dept_fit': ['information_technology'],
                'career_levels': ['Mid'],
                'critical_for_dept': False
            },
            'devops_fundamentals': {
                'required_skills': {'devops': [1,3], 'cloud_computing': [1,3]},
                'fills_gaps': ['devops', 'cloud_computing'],
                'target_level': 'Intermediate',
                'dept_fit': ['engineering', 'operations'],
                'career_levels': ['Mid', 'Senior'],
                'critical_for_dept': True
            },
            'cloud_advanced': {
                'required_skills': {'cloud_computing': [3,5], 'devops': [3,5]},
                'fills_gaps': ['cloud_computing'],
                'target_level': 'Advanced',
                'dept_fit': ['engineering'],
                'career_levels': ['Senior', 'Lead'],
                'critical_for_dept': True
            },
            'cybersecurity_basics': {
                'required_skills': {'cybersecurity': [1,3], 'network_security': [1,2]},
                'fills_gaps': ['cybersecurity', 'network_security'],
                'target_level': 'Beginner',
                'dept_fit': ['information_technology'],
                'career_levels': ['Junior', 'Mid'],
                'critical_for_dept': True
            },
            'security_advanced': {
                'required_skills': {'cybersecurity': [4,5], 'network_security': [3,5]},
                'fills_gaps': ['cybersecurity'],
                'target_level': 'Expert',
                'dept_fit': ['information_technology'],
                'career_levels': ['Senior', 'Lead'],
                'critical_for_dept': True
            },
            'database_admin': {
                'required_skills': {'sql': [3,5], 'database_design': [2,5]},
                'fills_gaps': ['database_design', 'sql'],
                'target_level': 'Advanced',
                'dept_fit': ['information_technology'],
                'career_levels': ['Mid', 'Senior'],
                'critical_for_dept': True
            },
            'project_management': {
                'required_skills': {'project_management': [2,4], 'agile': [2,4]},
                'fills_gaps': ['project_management', 'agile'],
                'target_level': 'Intermediate',
                'dept_fit': ['operations', 'human_resources'],
                'career_levels': ['Mid', 'Senior', 'Lead'],
                'critical_for_dept': False
            },
            'agile_scrum': {
                'required_skills': {'agile': [2,4], 'project_management': [1,3]},
                'fills_gaps': ['agile'],
                'target_level': 'Intermediate',
                'dept_fit': ['operations', 'information_technology'],
                'career_levels': ['Mid'],
                'critical_for_dept': False
            },
            'machine_learning_intro': {
                'required_skills': {'python': [3,5], 'machine_learning': [1,3]},
                'fills_gaps': ['machine_learning', 'data_analysis'],
                'target_level': 'Intermediate',
                'dept_fit': ['information_technology'],
                'career_levels': ['Mid', 'Senior'],
                'critical_for_dept': False
            },
            'java_programming': {
                'required_skills': {'java': [2,4]},
                'fills_gaps': ['java'],
                'target_level': 'Intermediate',
                'dept_fit': ['information_technology', 'engineering'],
                'career_levels': ['Junior', 'Mid'],
                'critical_for_dept': False
            }
        }
        
        # Ensure we have exactly n_courses profiles
        profile_names = list(course_profiles.keys())[:n_courses]
        
        X_list = []
        y_list = []
        
        # Generate samples with realistic patterns (70% match, 20% gap-fill, 10% noise)
        samples_per_course = n_samples // n_courses
        
        for course_idx, profile_name in enumerate(profile_names):
            profile = course_profiles.get(profile_name, course_profiles['python_beginner'])
            
            # 70% - Employees who MATCH course requirements (have the skills)
            for _ in range(int(samples_per_course * 0.70)):
                employee = self._generate_matching_employee(profile, data_processor)
                X_list.append(employee)
                y_list.append(course_idx)
            
            # 20% - Employees with GAPS that course fills
            for _ in range(int(samples_per_course * 0.20)):
                employee = self._generate_gap_filling_employee(profile, data_processor)
                X_list.append(employee)
                y_list.append(course_idx)
            
            # 10% - Random noise (different profile)
            for _ in range(int(samples_per_course * 0.10)):
                employee = self._generate_random_employee(data_processor)
                X_list.append(employee)
                # Small chance of wrong label (noise)
                if np.random.random() > 0.7:
                    y_list.append(course_idx)
                else:
                    y_list.append(np.random.randint(0, n_courses))
        
        X = np.array(X_list)
        y = np.array(y_list)
        
        print(f"Generated {len(X)} samples with {X.shape[1]} features for {n_courses} courses")
        
        return X, y
    
    def _generate_matching_employee(self, course_profile, data_processor):
        """Generate employee who matches course requirements"""
        # Determine experience based on target level
        target_level = course_profile.get('target_level', 'Intermediate')
        if target_level == 'Beginner':
            experience = np.random.randint(0, 3)
        elif target_level == 'Intermediate':
            experience = np.random.randint(2, 7)
        elif target_level == 'Advanced':
            experience = np.random.randint(5, 12)
        else:  # Expert
            experience = np.random.randint(8, 20)
        
        # Select department
        dept_options = course_profile.get('dept_fit', ['information_technology'])
        department = np.random.choice(dept_options)
        
        # Generate skills matching requirements
        required_skills = course_profile.get('required_skills', {})
        skills = []
        
        for skill_name, level_range in required_skills.items():
            # High probability of having required skills at appropriate level
            if np.random.random() > 0.1:  # 90% have the skill
                level = np.random.randint(level_range[0], level_range[1] + 1)
                skills.append({'name': skill_name, 'level': level})
        
        # Add some additional random skills
        all_skills = ['python', 'javascript', 'java', 'sql', 'react', 'node.js',
                     'machine_learning', 'data_analysis', 'project_management',
                     'agile', 'devops', 'cloud_computing', 'cybersecurity',
                     'network_security', 'database_design', 'web_development']
        
        for skill_name in all_skills:
            if skill_name not in [s['name'] for s in skills] and np.random.random() > 0.75:
                level = np.random.randint(1, 4)
                skills.append({'name': skill_name, 'level': level})
        
        # Critical skills for department
        dept_critical = []
        if course_profile.get('critical_for_dept', False):
            dept_critical = list(required_skills.keys())
        
        # Generate training history (experienced employees have more)
        training_history = []
        if experience > 2:
            num_past_trainings = min(int(experience / 2), 5)
            for i in range(num_past_trainings):
                days_ago = np.random.randint(30, 365 * 2)
                training_history.append({
                    'course_id': f'past_course_{i}',
                    'completion_date': datetime.now() - timedelta(days=days_ago),
                    'assessment_score': np.random.randint(70, 100)
                })
        
        location = np.random.choice(['jeddah', 'riyadh', 'dammam', 'unknown'])
        
        return data_processor.process_employee_data(
            skills=skills,
            experience=experience,
            department=department,
            location=location,
            training_history=training_history,
            dept_critical_skills=dept_critical
        )
    
    def _generate_gap_filling_employee(self, course_profile, data_processor):
        """Generate employee who has gaps that course fills"""
        target_level = course_profile.get('target_level', 'Intermediate')
        
        # Experience appropriate for level but skills are missing
        if target_level == 'Beginner':
            experience = np.random.randint(0, 2)
        elif target_level == 'Intermediate':
            experience = np.random.randint(2, 5)
        elif target_level == 'Advanced':
            experience = np.random.randint(4, 8)
        else:
            experience = np.random.randint(6, 12)
        
        dept_options = course_profile.get('dept_fit', ['information_technology'])
        department = np.random.choice(dept_options)
        
        # Have some skills but MISSING key skills that course teaches
        fills_gaps = course_profile.get('fills_gaps', [])
        required_skills = course_profile.get('required_skills', {})
        
        skills = []
        
        # Add only SOME of the required skills (creating a gap)
        for skill_name, level_range in required_skills.items():
            if np.random.random() > 0.6:  # 40% have it
                # At lower level
                level = max(1, level_range[0] - 1)
                skills.append({'name': skill_name, 'level': level})
        
        # Add other random skills
        all_skills = ['python', 'javascript', 'java', 'sql', 'react', 'node.js',
                     'machine_learning', 'data_analysis', 'project_management',
                     'agile', 'devops', 'cloud_computing', 'cybersecurity',
                     'network_security', 'database_design', 'web_development']
        
        for skill_name in all_skills:
            if skill_name not in [s['name'] for s in skills] and skill_name not in fills_gaps:
                if np.random.random() > 0.7:
                    level = np.random.randint(2, 4)
                    skills.append({'name': skill_name, 'level': level})
        
        # Critical skills include the gaps
        dept_critical = fills_gaps if course_profile.get('critical_for_dept', False) else []
        
        location = np.random.choice(['jeddah', 'riyadh', 'dammam', 'unknown'])
        
        return data_processor.process_employee_data(
            skills=skills,
            experience=experience,
            department=department,
            location=location,
            training_history=[],
            dept_critical_skills=dept_critical
        )
    
    def _generate_random_employee(self, data_processor):
        """Generate random employee (noise)"""
        experience = np.random.randint(0, 20)
        department = np.random.choice([
            'information_technology', 'human_resources', 'finance',
            'marketing', 'operations', 'sales', 'engineering'
        ])
        
        # Random skills
        all_skills = ['python', 'javascript', 'java', 'sql', 'react', 'node.js',
                     'machine_learning', 'data_analysis', 'project_management',
                     'agile', 'devops', 'cloud_computing', 'cybersecurity',
                     'network_security', 'database_design', 'web_development']
        
        num_skills = np.random.randint(1, 8)
        selected_skills = np.random.choice(all_skills, num_skills, replace=False)
        
        skills = [{'name': s, 'level': np.random.randint(1, 5)} for s in selected_skills]
        
        location = np.random.choice(['jeddah', 'riyadh', 'dammam', 'unknown'])
        
        return data_processor.process_employee_data(
            skills=skills,
            experience=experience,
            department=department,
            location=location,
            training_history=[],
            dept_critical_skills=[]
        )

