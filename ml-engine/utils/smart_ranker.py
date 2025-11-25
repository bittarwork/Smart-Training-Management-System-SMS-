# Smart Ranking Engine - Hybrid Recommendation System
# Combines ML predictions with rule-based scoring for optimal course recommendations

import numpy as np
from utils.ensemble_predictor import EnsemblePredictor
from utils.course_scorer import CourseScorer
from utils.course_mapper import CourseMapper
from utils.data_processor import DataProcessor


class SmartRanker:
    """
    Hybrid ranking system that combines:
    1. ML Model predictions (Ensemble of RF + XGBoost)
    2. Rule-based scoring (4 criteria: Skills, Gap, Dept, Career)
    3. Diversity-aware selection to avoid redundant recommendations
    """
    
    def __init__(self, alpha=0.5):
        """
        Initialize SmartRanker
        
        Args:
            alpha: Weight for ML vs Rule-based (0.5 = equal weight)
                   Higher alpha = more ML influence
                   Lower alpha = more rule-based influence
        """
        self.alpha = alpha
        self.ensemble_predictor = EnsemblePredictor()
        self.course_scorer = CourseScorer()
        self.course_mapper = CourseMapper()
        self.data_processor = DataProcessor()
    
    def rank_courses(self, employee_data, all_courses, top_k=3):
        """
        Rank courses for an employee using hybrid approach
        
        Args:
            employee_data: Dictionary with employee information
                - skills: List of {name, level}
                - experience: Years
                - department: Department name
                - location: Location
                - training_history: Optional training history
                - dept_critical_skills: Optional critical skills
            all_courses: List of course dictionaries
            top_k: Number of recommendations to return
        
        Returns:
            List of top_k course recommendations with scores and explanations
        """
        if not all_courses:
            return []
        
        # Step 1: Process employee features for ML model
        employee_features = self.data_processor.process_employee_data(
            skills=employee_data.get('skills', []),
            experience=employee_data.get('experience', 0),
            department=employee_data.get('department', ''),
            location=employee_data.get('location', 'Unknown'),
            training_history=employee_data.get('training_history', []),
            dept_critical_skills=employee_data.get('dept_critical_skills', [])
        )
        
        # Step 2: Get ML model probabilities
        ml_probabilities = self.ensemble_predictor.predict_proba(employee_features)
        
        # Step 3: Extract course features
        course_features_list = self.course_mapper.batch_extract(all_courses)
        
        # Step 4: Calculate rule-based scores for each course
        rule_scores = []
        for course_features in course_features_list:
            composite_score, breakdown = self.course_scorer.calculate_composite_score(
                employee_data, course_features
            )
            rule_scores.append({
                'course_id': course_features['course_id'],
                'course_title': course_features.get('title', ''),
                'composite_score': composite_score,
                'breakdown': breakdown,
                'skill_categories': course_features.get('skill_categories', [])
            })
        
        # Step 5: Fuse ML and rule-based scores
        final_scores = self._fuse_scores(ml_probabilities, rule_scores, all_courses)
        
        # Step 6: Select diverse top courses
        top_courses = self._select_diverse_courses(final_scores, top_k)
        
        return top_courses
    
    def _fuse_scores(self, ml_probabilities, rule_scores, all_courses):
        """
        Combine ML probabilities with rule-based scores
        
        Args:
            ml_probabilities: Array of ML probabilities
            rule_scores: List of rule-based score dictionaries
            all_courses: Original course list
        
        Returns:
            Sorted list of fused scores
        """
        fused = []
        
        for idx, rule_score_obj in enumerate(rule_scores):
            # Get ML confidence for this course index
            # ML model outputs probabilities for course indices
            ml_conf = float(ml_probabilities[idx % len(ml_probabilities)])
            
            rule_score = rule_score_obj['composite_score']
            
            # Hybrid fusion: weighted combination
            final_score = self.alpha * ml_conf + (1 - self.alpha) * rule_score
            
            # Create fused result
            fused.append({
                'course_id': rule_score_obj['course_id'],
                'course_title': rule_score_obj['course_title'],
                'final_score': final_score,
                'ml_confidence': ml_conf,
                'rule_score': rule_score,
                'breakdown': rule_score_obj['breakdown'],
                'skill_categories': rule_score_obj['skill_categories']
            })
        
        # Sort by final score (descending)
        return sorted(fused, key=lambda x: x['final_score'], reverse=True)
    
    def _select_diverse_courses(self, scored_courses, top_k):
        """
        Select top_k courses while promoting diversity
        Avoids recommending multiple courses from same category
        
        Args:
            scored_courses: List of scored course dictionaries
            top_k: Number of courses to select
        
        Returns:
            List of selected courses
        """
        if not scored_courses:
            return []
        
        selected = []
        covered_categories = set()
        
        # First pass: Select highest scoring course (no restrictions)
        if scored_courses:
            top_course = scored_courses[0]
            selected.append(top_course)
            
            # Mark categories as covered
            for category in top_course.get('skill_categories', []):
                covered_categories.add(category)
        
        # Second pass: Select remaining courses with diversity preference
        for course_obj in scored_courses[1:]:
            if len(selected) >= top_k:
                break
            
            course_categories = set(course_obj.get('skill_categories', []))
            
            # Check category overlap
            has_overlap = bool(course_categories & covered_categories)
            
            # Prefer courses with less overlap, but don't strictly enforce
            if not has_overlap:
                # High priority: Different category
                selected.append(course_obj)
                covered_categories.update(course_categories)
            elif len(selected) < top_k:
                # Lower priority: Some overlap allowed if needed
                # Only add if we're running out of options
                remaining_candidates = len([c for c in scored_courses 
                                           if c not in selected])
                slots_remaining = top_k - len(selected)
                
                # Add if not enough diverse options available
                if remaining_candidates <= slots_remaining * 1.5:
                    selected.append(course_obj)
                    covered_categories.update(course_categories)
        
        # Fill remaining slots if we couldn't find enough diverse courses
        for course_obj in scored_courses:
            if len(selected) >= top_k:
                break
            if course_obj not in selected:
                selected.append(course_obj)
        
        # Add rank to final selection
        for rank, course in enumerate(selected, start=1):
            course['rank'] = rank
        
        return selected[:top_k]
    
    def get_configuration(self):
        """Get ranker configuration"""
        return {
            'alpha': self.alpha,
            'ml_weight': self.alpha,
            'rule_weight': 1 - self.alpha,
            'ensemble_info': self.ensemble_predictor.get_model_info(),
            'scoring_weights': self.course_scorer.weights
        }

