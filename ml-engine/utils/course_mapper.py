# Course feature extraction and mapping
# Extracts and normalizes course features for the recommendation system

class CourseMapper:
    """
    Extracts and normalizes features from course data
    """
    
    def __init__(self):
        self.skill_categories = {
            'programming': ['python', 'javascript', 'java', 'node.js', 'react'],
            'data': ['sql', 'data_analysis', 'machine_learning', 'database_design'],
            'infrastructure': ['devops', 'cloud_computing', 'cybersecurity', 'network_security'],
            'management': ['project_management', 'agile'],
            'development': ['web_development']
        }
    
    def extract_course_features(self, course):
        """
        Extract standardized features from a course
        
        Args:
            course: Dictionary containing course information
        
        Returns:
            Dictionary of course features
        """
        return {
            'course_id': str(course.get('_id', course.get('id', ''))),
            'title': course.get('title', ''),
            'required_skills': course.get('required_skills', []),
            'target_experience_level': course.get('target_experience_level', 'Intermediate'),
            'department': course.get('department', ''),
            'duration': course.get('duration', 30),
            'difficulty_score': self._calc_difficulty(course),
            'skill_categories': self._categorize_skills(course.get('required_skills', []))
        }
    
    def _calc_difficulty(self, course):
        """
        Calculate difficulty score based on target level and duration
        
        Returns:
            Float between 0 and 1
        """
        target_level = course.get('target_experience_level', 'Intermediate')
        duration = course.get('duration', 30)
        
        # Level difficulty
        level_scores = {
            'Beginner': 0.25,
            'Intermediate': 0.50,
            'Advanced': 0.75,
            'Expert': 1.0
        }
        level_difficulty = level_scores.get(target_level, 0.5)
        
        # Duration factor (longer = more difficult)
        duration_factor = min(duration / 90.0, 1.0)
        
        # Combined difficulty
        difficulty = level_difficulty * 0.7 + duration_factor * 0.3
        
        return difficulty
    
    def _categorize_skills(self, required_skills):
        """
        Categorize skills into main categories
        
        Returns:
            List of category names
        """
        if not required_skills:
            return []
        
        categories = set()
        
        for skill in required_skills:
            skill_normalized = skill.lower().replace(' ', '_')
            
            for category, skills_in_cat in self.skill_categories.items():
                if skill_normalized in skills_in_cat:
                    categories.add(category)
                    break
        
        return list(categories)
    
    def batch_extract(self, courses):
        """
        Extract features from multiple courses
        
        Args:
            courses: List of course dictionaries
        
        Returns:
            List of course feature dictionaries
        """
        return [self.extract_course_features(course) for course in courses]

