# Data preprocessing and feature engineering
# Converts employee data into feature vectors for ML model

import pandas as pd
import numpy as np
from sklearn.preprocessing import StandardScaler, LabelEncoder
import joblib
import os

class DataProcessor:
    """
    Processes employee data for ML model input
    Handles feature engineering: One-Hot Encoding, Standard Scaling
    """
    
    def __init__(self):
        self.scaler = StandardScaler()
        self.label_encoders = {}
        self.feature_names = []
        self.is_fitted = False
        
    def process_employee_data(self, skills, experience, department, location, 
                             training_history=None, dept_critical_skills=None):
        """
        Process single employee data into feature vector
        
        Args:
            skills: List of dicts with 'name' and 'level' keys
            experience: Years of experience (int)
            department: Department name (string)
            location: Location name (string)
            training_history: Optional list of training records
            dept_critical_skills: Optional list of critical skills for department
        
        Returns:
            numpy array of features
        """
        # Set defaults for optional parameters
        if training_history is None:
            training_history = []
        if dept_critical_skills is None:
            dept_critical_skills = []
        # Initialize feature dictionary
        features = {}
        
        # Technical Skills (40% weight)
        # Extract skill levels and create feature vector
        skill_levels = {}
        for skill in skills:
            skill_name = skill.get('name', '').lower().replace(' ', '_')
            skill_level = skill.get('level', 3)
            skill_levels[skill_name] = skill_level
        
        # Common technical skills (expandable list)
        common_skills = [
            'python', 'javascript', 'java', 'sql', 'react', 'node.js',
            'machine_learning', 'data_analysis', 'project_management',
            'agile', 'devops', 'cloud_computing', 'cybersecurity',
            'network_security', 'database_design', 'web_development'
        ]
        
        # Add skill features
        for skill in common_skills:
            features[f'skill_{skill}'] = skill_levels.get(skill, 0)
        
        # Average skill level
        if skills:
            avg_skill_level = np.mean([s.get('level', 0) for s in skills])
            features['avg_skill_level'] = avg_skill_level
            features['num_skills'] = len(skills)
        else:
            features['avg_skill_level'] = 0
            features['num_skills'] = 0
        
        # Experience Level (30% weight)
        features['experience_years'] = float(experience)
        features['experience_level'] = self._categorize_experience(experience)
        
        # Department (20% weight) - One-Hot Encoding
        departments = [
            'information_technology', 'human_resources', 'finance',
            'marketing', 'operations', 'sales', 'engineering'
        ]
        department_normalized = department.lower().replace(' ', '_')
        for dept in departments:
            features[f'dept_{dept}'] = 1 if dept in department_normalized else 0
        
        # Location (10% weight)
        locations = ['jeddah', 'riyadh', 'dammam', 'unknown']
        location_normalized = location.lower().replace(' ', '_')
        for loc in locations:
            features[f'location_{loc}'] = 1 if loc in location_normalized else 0
        
        # NEW: Skill Gap Analysis Features
        skill_metrics = self._calculate_skill_metrics(skills, dept_critical_skills)
        features.update(skill_metrics)
        
        # NEW: Career Progression Features
        career_features = self._calculate_career_features(skills, experience)
        features.update(career_features)
        
        # NEW: Training History Features
        training_features = self._calculate_training_features(training_history)
        features.update(training_features)
        
        # Convert to DataFrame for consistency
        feature_df = pd.DataFrame([features])
        
        # Ensure all expected columns exist
        expected_features = self._get_expected_features()
        for feat in expected_features:
            if feat not in feature_df.columns:
                feature_df[feat] = 0
        
        # Reorder columns to match training data
        feature_df = feature_df.reindex(columns=expected_features, fill_value=0)
        
        return feature_df.values[0]
    
    def _categorize_experience(self, years):
        """Categorize experience into levels"""
        if years < 2:
            return 1  # Beginner
        elif years < 5:
            return 2  # Intermediate
        elif years < 10:
            return 3  # Advanced
        else:
            return 4  # Expert
    
    def _calculate_skill_metrics(self, skills, dept_critical_skills):
        """
        Calculate skill gap and strength metrics
        
        Args:
            skills: List of employee skills with name and level
            dept_critical_skills: List of critical skills for the department
        
        Returns:
            Dictionary of skill metrics
        """
        metrics = {}
        
        if not skills:
            return {
                'weak_skills_count': 0,
                'strong_skills_count': 0,
                'skill_gap_score': 1.0,  # Maximum gap if no skills
                'skill_progression_potential': 0.0
            }
        
        # Count weak and strong skills
        weak_skills = [s for s in skills if s.get('level', 0) <= 2]
        strong_skills = [s for s in skills if s.get('level', 0) >= 4]
        
        metrics['weak_skills_count'] = len(weak_skills)
        metrics['strong_skills_count'] = len(strong_skills)
        
        # Calculate skill gap score (missing critical skills)
        if dept_critical_skills:
            employee_skill_names = set([s.get('name', '').lower().replace(' ', '_') 
                                       for s in skills])
            critical_skill_names = set([s.lower().replace(' ', '_') 
                                       for s in dept_critical_skills])
            missing_critical = critical_skill_names - employee_skill_names
            metrics['skill_gap_score'] = len(missing_critical) / len(critical_skill_names)
        else:
            metrics['skill_gap_score'] = 0.0
        
        # Calculate progression potential (skills that can be improved)
        metrics['skill_progression_potential'] = self._calc_progression_potential(skills)
        
        return metrics
    
    def _calc_progression_potential(self, skills):
        """Calculate how much room for skill progression exists"""
        if not skills:
            return 0.0
        
        # Skills at level 1-3 have high progression potential
        # Skills at level 4-5 have low progression potential
        progression_scores = []
        for skill in skills:
            level = skill.get('level', 0)
            if level <= 3:
                progression_scores.append((5 - level) / 5.0)  # High potential
            else:
                progression_scores.append((5 - level) / 10.0)  # Low potential
        
        return np.mean(progression_scores) if progression_scores else 0.0
    
    def _calculate_career_features(self, skills, experience):
        """
        Calculate career progression features
        
        Args:
            skills: List of employee skills
            experience: Years of experience
        
        Returns:
            Dictionary of career features
        """
        features = {}
        
        # Determine career level based on experience and skills
        avg_skill_level = np.mean([s.get('level', 0) for s in skills]) if skills else 0
        
        if experience < 2:
            features['career_level'] = 1  # Junior
        elif experience < 5:
            features['career_level'] = 2  # Mid
        elif experience < 10:
            features['career_level'] = 3  # Senior
        else:
            features['career_level'] = 4  # Lead
        
        # Calculate readiness for next level
        # Based on experience + average skill level
        experience_readiness = min(experience / 10.0, 1.0)
        skill_readiness = avg_skill_level / 5.0
        features['next_level_readiness'] = (experience_readiness + skill_readiness) / 2.0
        
        # Calculate specialization score (depth vs breadth)
        if skills:
            high_level_skills = len([s for s in skills if s.get('level', 0) >= 4])
            features['specialization_score'] = high_level_skills / len(skills)
        else:
            features['specialization_score'] = 0.0
        
        # Check for leadership/management skills
        leadership_keywords = ['project_management', 'agile', 'leadership', 'management']
        skill_names = [s.get('name', '').lower().replace(' ', '_') for s in skills]
        has_leadership = any(keyword in skill_names for keyword in leadership_keywords)
        features['leadership_skills'] = 1 if has_leadership else 0
        
        return features
    
    def _calculate_training_features(self, training_history):
        """
        Calculate training history features
        
        Args:
            training_history: List of training records
        
        Returns:
            Dictionary of training features
        """
        features = {}
        
        if not training_history:
            return {
                'training_frequency': 0,
                'completion_rate': 0.0,
                'avg_assessment_score': 0.0,
                'days_since_last_training': 999  # Large number if no training
            }
        
        # Training frequency (count)
        features['training_frequency'] = len(training_history)
        
        # Completion rate (assume all in history are completed)
        features['completion_rate'] = 1.0
        
        # Average assessment score
        scores = [t.get('assessment_score', 0) for t in training_history 
                 if t.get('assessment_score')]
        features['avg_assessment_score'] = np.mean(scores) / 100.0 if scores else 0.0
        
        # Days since last training
        if training_history:
            from datetime import datetime
            last_dates = [t.get('completion_date') for t in training_history 
                         if t.get('completion_date')]
            if last_dates:
                # Convert to datetime if string
                last_date = max(last_dates)
                if isinstance(last_date, str):
                    try:
                        last_date = datetime.fromisoformat(last_date.replace('Z', '+00:00'))
                    except:
                        last_date = datetime.now()
                
                days_diff = (datetime.now() - last_date).days
                features['days_since_last_training'] = min(days_diff, 999)
            else:
                features['days_since_last_training'] = 999
        else:
            features['days_since_last_training'] = 999
        
        return features
    
    def _get_expected_features(self):
        """Get list of expected feature names"""
        features = []
        
        # Skill features
        common_skills = [
            'python', 'javascript', 'java', 'sql', 'react', 'node.js',
            'machine_learning', 'data_analysis', 'project_management',
            'agile', 'devops', 'cloud_computing', 'cybersecurity',
            'network_security', 'database_design', 'web_development'
        ]
        for skill in common_skills:
            features.append(f'skill_{skill}')
        
        features.extend(['avg_skill_level', 'num_skills'])
        features.extend(['experience_years', 'experience_level'])
        
        # Department features
        departments = [
            'information_technology', 'human_resources', 'finance',
            'marketing', 'operations', 'sales', 'engineering'
        ]
        for dept in departments:
            features.append(f'dept_{dept}')
        
        # Location features
        locations = ['jeddah', 'riyadh', 'dammam', 'unknown']
        for loc in locations:
            features.append(f'location_{loc}')
        
        # NEW: Skill Gap Analysis features
        features.extend([
            'weak_skills_count',
            'strong_skills_count',
            'skill_gap_score',
            'skill_progression_potential'
        ])
        
        # NEW: Career Progression features
        features.extend([
            'career_level',
            'next_level_readiness',
            'specialization_score',
            'leadership_skills'
        ])
        
        # NEW: Training History features
        features.extend([
            'training_frequency',
            'completion_rate',
            'avg_assessment_score',
            'days_since_last_training'
        ])
        
        return features
    
    def fit(self, X):
        """Fit the scaler on training data"""
        self.scaler.fit(X)
        self.is_fitted = True
        return self
    
    def transform(self, X):
        """Transform features using fitted scaler"""
        if not self.is_fitted:
            return X
        return self.scaler.transform(X)

