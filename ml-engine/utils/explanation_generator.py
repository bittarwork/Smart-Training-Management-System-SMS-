# Explanation Generator for Course Recommendations
# Provides human-readable explanations for why courses were recommended

class ExplanationGenerator:
    """
    Generates explanations for course recommendations
    Helps users understand why specific courses were suggested
    """
    
    def __init__(self):
        self.criterion_names = {
            'skill_match_score': 'تطابق المهارات',
            'skill_gap_score': 'سد فجوات المهارات',
            'dept_needs_score': 'احتياجات القسم',
            'career_path_score': 'المسار الوظيفي'
        }
        
        self.criterion_weights = {
            'skill_match_score': 0.30,
            'skill_gap_score': 0.30,
            'dept_needs_score': 0.20,
            'career_path_score': 0.20
        }
    
    def generate_explanation(self, course_recommendation, employee_data):
        """
        Generate human-readable explanation for a course recommendation
        
        Args:
            course_recommendation: Dictionary with recommendation details
                - breakdown: Dict of criterion scores
                - final_score: Overall score
                - ml_confidence: ML model confidence
                - rule_score: Rule-based score
            employee_data: Dictionary with employee information
        
        Returns:
            Dictionary with explanation components
        """
        breakdown = course_recommendation.get('breakdown', {})
        
        # Find top contributing factors
        top_reasons = self._identify_top_reasons(breakdown, employee_data)
        
        # Generate summary
        overall_fit = course_recommendation.get('final_score', 0.5)
        fit_category = self._categorize_fit(overall_fit)
        
        # Build explanation
        explanation = {
            'top_reasons': top_reasons,
            'overall_fit': round(overall_fit, 3),
            'fit_category': fit_category,
            'detailed_scores': {
                self.criterion_names.get(k, k): {
                    'score': round(v, 3),
                    'weight': self.criterion_weights.get(k, 0),
                    'contribution': round(v * self.criterion_weights.get(k, 0), 3)
                }
                for k, v in breakdown.items()
            },
            'confidence_metrics': {
                'ml_confidence': round(course_recommendation.get('ml_confidence', 0), 3),
                'rule_score': round(course_recommendation.get('rule_score', 0), 3)
            }
        }
        
        return explanation
    
    def _identify_top_reasons(self, breakdown, employee_data):
        """
        Identify top 3 reasons for the recommendation
        
        Returns:
            List of reason dictionaries
        """
        reasons = []
        
        # Sort criteria by score
        sorted_criteria = sorted(breakdown.items(), key=lambda x: x[1], reverse=True)
        
        for criterion, score in sorted_criteria[:3]:
            if score >= 0.5:  # Only include significant factors
                reason = self._generate_reason_text(criterion, score, employee_data)
                if reason:
                    impact = score * self.criterion_weights.get(criterion, 0)
                    reasons.append({
                        'criterion': self.criterion_names.get(criterion, criterion),
                        'reason': reason,
                        'score': round(score, 2),
                        'impact_percentage': round(impact * 100, 1)
                    })
        
        return reasons
    
    def _generate_reason_text(self, criterion, score, employee_data):
        """
        Generate human-readable reason text for a criterion
        
        Returns:
            String explanation
        """
        # Get employee info
        skills = employee_data.get('skills', [])
        experience = employee_data.get('experience', 0)
        dept = employee_data.get('department', '')
        
        if criterion == 'skill_match_score':
            if score >= 0.8:
                return "يطابق مهاراتك الحالية بشكل ممتاز"
            elif score >= 0.6:
                return "يتناسب جيداً مع مستوى مهاراتك"
            else:
                return "مناسب لتطوير مهاراتك الحالية"
        
        elif criterion == 'skill_gap_score':
            if score >= 0.7:
                return "يسد فجوات مهمة في مهاراتك الأساسية"
            elif score >= 0.5:
                return "يضيف مهارات جديدة مفيدة لدورك"
            else:
                return "يوسع قاعدة مهاراتك"
        
        elif criterion == 'dept_needs_score':
            if score >= 0.8:
                return f"مثالي لمتطلبات قسم {dept}"
            elif score >= 0.6:
                return f"يخدم أهداف قسم {dept}"
            else:
                return "يوفر مهارات متعددة التخصصات"
        
        elif criterion == 'career_path_score':
            if experience < 2:
                return "يساعدك على الانتقال للمستوى المتوسط"
            elif experience < 5:
                return "يدعم تقدمك نحو المستوى المتقدم"
            elif experience < 10:
                return "يعزز خبرتك للوصول لمستوى الخبير"
            else:
                return "يعمق تخصصك في مجالك"
        
        return "مناسب لملفك الوظيفي"
    
    def _categorize_fit(self, score):
        """
        Categorize overall fit score
        
        Returns:
            String category
        """
        if score >= 0.8:
            return "ممتاز"
        elif score >= 0.7:
            return "جيد جداً"
        elif score >= 0.6:
            return "جيد"
        elif score >= 0.5:
            return "مقبول"
        else:
            return "ضعيف"
    
    def generate_batch_explanations(self, recommendations, employee_data):
        """
        Generate explanations for multiple recommendations
        
        Args:
            recommendations: List of recommendation dictionaries
            employee_data: Employee information
        
        Returns:
            List of recommendations with explanations added
        """
        for rec in recommendations:
            rec['explanation'] = self.generate_explanation(rec, employee_data)
        
        return recommendations

