# Course scoring system with multi-criteria evaluation
# Evaluates courses based on: Skills Match, Skill Gap Fill, Department Needs, Career Path

import numpy as np


class CourseScorer:
    """
    Scores courses for employees using 4 balanced criteria:
    - Skill Match (30%): How well course matches current skills
    - Skill Gap Fill (30%): How well course fills missing skills
    - Department Needs (20%): How well course aligns with department
    - Career Path (20%): How well course supports career progression
    """
    
    def __init__(self):
        # Weights for each criterion
        self.weights = {
            'skill_match': 0.30,
            'skill_gap': 0.30,
            'dept_needs': 0.20,
            'career_path': 0.20
        }
    
    def calculate_composite_score(self, employee_data, course_data):
        """
        Calculate composite score for a course given employee data
        
        Args:
            employee_data: Dictionary with employee information
                - skills: List of {name, level} dicts
                - experience: Years of experience
                - department: Department name
                - dept_critical_skills: List of critical skills for dept
            course_data: Dictionary with course information
                - required_skills: List of skill names
                - target_experience_level: Beginner/Intermediate/Advanced/Expert
                - department: Course department
                - duration: Course duration in days
        
        Returns:
            Tuple of (composite_score, breakdown_dict)
        """
        # Calculate individual scores
        scores = {
            'skill_match_score': self._skill_match(employee_data, course_data),
            'skill_gap_score': self._skill_gap_fill(employee_data, course_data),
            'dept_needs_score': self._dept_alignment(employee_data, course_data),
            'career_path_score': self._career_progression(employee_data, course_data)
        }
        
        # Calculate weighted composite score
        composite_score = sum(
            scores[f'{criterion}_score'] * weight 
            for criterion, weight in self.weights.items()
        )
        
        return composite_score, scores
    
    def _skill_match(self, employee_data, course_data):
        """
        Score based on how well employee's current skills match course requirements
        
        Returns:
            Float between 0 and 1
        """
        employee_skills = employee_data.get('skills', [])
        course_required = course_data.get('required_skills', [])
        target_level = course_data.get('target_experience_level', 'Intermediate')
        employee_exp = employee_data.get('experience', 0)
        
        if not course_required:
            return 0.5  # Neutral if no requirements specified
        
        # Build employee skill dictionary
        emp_skill_dict = {}
        for skill in employee_skills:
            skill_name = skill.get('name', '').lower().replace(' ', '_')
            emp_skill_dict[skill_name] = skill.get('level', 0)
        
        # Check how many required skills the employee has
        matched_skills = 0
        total_skill_level = 0
        
        for req_skill in course_required:
            req_skill_normalized = req_skill.lower().replace(' ', '_')
            if req_skill_normalized in emp_skill_dict:
                matched_skills += 1
                total_skill_level += emp_skill_dict[req_skill_normalized]
        
        # Calculate match ratio
        skill_coverage = matched_skills / len(course_required) if course_required else 0
        
        # Calculate average skill level for matched skills
        avg_skill_level = (total_skill_level / matched_skills) if matched_skills > 0 else 0
        skill_proficiency = avg_skill_level / 5.0  # Normalize to 0-1
        
        # Check experience level match
        exp_match = self._experience_level_match(employee_exp, target_level)
        
        # Weighted combination
        match_score = (
            skill_coverage * 0.5 +      # 50% weight on having the skills
            skill_proficiency * 0.3 +    # 30% weight on skill level
            exp_match * 0.2              # 20% weight on experience match
        )
        
        return min(match_score, 1.0)
    
    def _skill_gap_fill(self, employee_data, course_data):
        """
        Score based on how well the course fills skill gaps
        Higher score if course teaches missing critical skills
        
        Returns:
            Float between 0 and 1
        """
        employee_skills = employee_data.get('skills', [])
        dept_critical = employee_data.get('dept_critical_skills', [])
        course_required = course_data.get('required_skills', [])
        
        if not course_required:
            return 0.3  # Low score if course doesn't specify what it teaches
        
        # Employee's current skill names
        emp_skill_names = set([
            s.get('name', '').lower().replace(' ', '_') 
            for s in employee_skills
        ])
        
        # Critical skills employee is missing
        critical_missing = set([
            s.lower().replace(' ', '_') 
            for s in dept_critical
        ]) - emp_skill_names
        
        # Skills employee doesn't have at all
        all_missing = set([
            s.lower().replace(' ', '_') 
            for s in course_required
        ]) - emp_skill_names
        
        # Skills employee has but at low level (≤2)
        weak_skills = set([
            s.get('name', '').lower().replace(' ', '_')
            for s in employee_skills
            if s.get('level', 0) <= 2
        ])
        
        # Course skills that are missing or weak
        course_skills_normalized = set([
            s.lower().replace(' ', '_') 
            for s in course_required
        ])
        
        # Score components
        fills_critical = len(course_skills_normalized & critical_missing)
        fills_missing = len(course_skills_normalized & all_missing)
        improves_weak = len(course_skills_normalized & weak_skills)
        
        # Calculate gap fill score
        gap_score = 0.0
        
        if dept_critical:
            # Critical skills are most important
            gap_score += (fills_critical / len(dept_critical)) * 0.5
        
        if course_required:
            # Teaching new skills
            gap_score += (fills_missing / len(course_required)) * 0.3
            # Improving weak skills
            gap_score += (improves_weak / len(course_required)) * 0.2
        
        return min(gap_score, 1.0)
    
    def _dept_alignment(self, employee_data, course_data):
        """
        Score based on department alignment
        
        Returns:
            Float between 0 and 1
        """
        employee_dept = employee_data.get('department', '').lower().replace(' ', '_')
        course_dept = course_data.get('department', '').lower().replace(' ', '_')
        
        if not employee_dept or not course_dept:
            return 0.5  # Neutral if department info missing
        
        # Exact match
        if employee_dept == course_dept:
            return 1.0
        
        # Related departments (partial match)
        related_depts = {
            'information_technology': ['engineering', 'operations'],
            'engineering': ['information_technology', 'operations'],
            'operations': ['engineering', 'information_technology'],
            'finance': ['operations'],
            'human_resources': ['operations']
        }
        
        if employee_dept in related_depts:
            if course_dept in related_depts[employee_dept]:
                return 0.7  # Related department
        
        # No match
        return 0.3
    
    def _career_progression(self, employee_data, course_data):
        """
        Score based on career progression support
        Higher score if course helps employee advance to next level
        
        Returns:
            Float between 0 and 1
        """
        employee_exp = employee_data.get('experience', 0)
        employee_skills = employee_data.get('skills', [])
        target_level = course_data.get('target_experience_level', 'Intermediate')
        course_duration = course_data.get('duration', 30)
        
        # Determine employee's current level
        avg_skill = np.mean([s.get('level', 0) for s in employee_skills]) if employee_skills else 0
        
        if employee_exp < 2:
            current_level = 'Beginner'
            next_level = 'Intermediate'
        elif employee_exp < 5:
            current_level = 'Intermediate'
            next_level = 'Advanced'
        elif employee_exp < 10:
            current_level = 'Advanced'
            next_level = 'Expert'
        else:
            current_level = 'Expert'
            next_level = 'Expert'
        
        # Score based on target level appropriateness
        level_scores = {
            'Beginner': 1,
            'Intermediate': 2,
            'Advanced': 3,
            'Expert': 4
        }
        
        current_score = level_scores.get(current_level, 2)
        next_score = level_scores.get(next_level, 3)
        target_score = level_scores.get(target_level, 2)
        
        # Best if course targets next level
        if target_score == next_score:
            progression_fit = 1.0
        # Good if course targets current level (reinforcement)
        elif target_score == current_score:
            progression_fit = 0.7
        # OK if one level above next
        elif target_score == next_score + 1:
            progression_fit = 0.6
        # Lower if too basic
        elif target_score < current_score:
            progression_fit = 0.3
        # Lower if too advanced
        elif target_score > next_score + 1:
            progression_fit = 0.4
        else:
            progression_fit = 0.5
        
        # Consider skill level alignment
        skill_readiness = avg_skill / 5.0
        
        # Factor in course duration (longer courses for career advancement)
        duration_factor = min(course_duration / 60.0, 1.0)  # Normalize to 60 days
        
        # Combined career progression score
        career_score = (
            progression_fit * 0.6 +      # 60% on level appropriateness
            skill_readiness * 0.25 +     # 25% on skill readiness
            duration_factor * 0.15       # 15% on course depth
        )
        
        return min(career_score, 1.0)
    
    def _experience_level_match(self, years, target_level):
        """
        Helper to match employee experience with course target level
        
        Returns:
            Float between 0 and 1
        """
        level_mapping = {
            'Beginner': (0, 2),
            'Intermediate': (2, 5),
            'Advanced': (5, 10),
            'Expert': (10, 50)
        }
        
        if target_level not in level_mapping:
            return 0.5  # Neutral if unknown level
        
        min_exp, max_exp = level_mapping[target_level]
        
        # Perfect match
        if min_exp <= years <= max_exp:
            return 1.0
        # Close match (one level off)
        elif (min_exp - 3) <= years <= (max_exp + 3):
            return 0.7
        # Far off
        else:
            return 0.3

