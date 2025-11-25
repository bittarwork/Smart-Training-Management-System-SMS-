# Flask API server for ML recommendation engine
# Provides endpoints for generating training course recommendations using Random Forest classifier

from flask import Flask, request, jsonify
from flask_cors import CORS
import os
from dotenv import load_dotenv
from utils.predictor import RecommendationPredictor
from utils.data_processor import DataProcessor
from utils.model_trainer import ModelTrainer
from utils.smart_ranker import SmartRanker
from utils.explanation_generator import ExplanationGenerator

# Load environment variables
load_dotenv()

app = Flask(__name__)
CORS(app)

# Initialize components
data_processor = DataProcessor()
predictor = RecommendationPredictor()
model_trainer = ModelTrainer()

# Initialize new hybrid system components
smart_ranker = SmartRanker(alpha=0.5)  # Equal weight between ML and rules
explanation_generator = ExplanationGenerator()

@app.route('/api/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        'status': 'OK',
        'message': 'ML Engine is running',
        'model_loaded': predictor.is_model_loaded()
    })

@app.route('/api/model/status', methods=['GET'])
def model_status():
    """Get model status and information"""
    return jsonify({
        'model_loaded': predictor.is_model_loaded(),
        'model_path': predictor.model_path if hasattr(predictor, 'model_path') else None
    })

@app.route('/api/model/reload', methods=['POST'])
def reload_model():
    """Reload the ML model from disk (useful after retraining)"""
    try:
        global predictor
        predictor = RecommendationPredictor()
        return jsonify({
            'success': True,
            'message': 'Model reloaded successfully',
            'model_loaded': predictor.is_model_loaded()
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/api/ml/metrics', methods=['GET'])
def get_ml_metrics():
    """
    Get ML model performance metrics
    Returns comprehensive evaluation metrics including:
    - F1-Score, Accuracy, Precision, Recall
    - Cross-validation results (5-fold)
    - Feature importance with weighting
    - Confusion matrix
    - Training metadata
    """
    try:
        # Load metrics from saved file
        metrics = model_trainer.get_metrics()
        
        if not metrics:
            return jsonify({
                'success': False,
                'error': 'No metrics available. Train the model first.',
                'message': 'Run train_model.py to generate metrics'
            }), 404
        
        # Format response with key metrics highlighted
        response = {
            'success': True,
            'metrics': {
                'performance': {
                    'f1_score': metrics.get('f1_score', 0),
                    'accuracy': metrics.get('accuracy', 0),
                    'precision': metrics.get('precision', 0),
                    'recall': metrics.get('recall', 0),
                    'avg_confidence': metrics.get('avg_confidence', 0)
                },
                'cross_validation': {
                    'cv_mean': metrics.get('cv_mean', 0),
                    'cv_std': metrics.get('cv_std', 0),
                    'cv_scores': metrics.get('cv_scores', [])
                },
                'feature_importance': metrics.get('feature_importances', {}),
                'confusion_matrix': metrics.get('confusion_matrix', []),
                'model_info': {
                    'model_version': metrics.get('model_version', 'unknown'),
                    'training_date': metrics.get('training_date', 'unknown'),
                    'n_samples': metrics.get('n_samples', 0),
                    'n_features': metrics.get('n_features', 0),
                    'parameters': metrics.get('model_params', {})
                },
                'target_threshold': {
                    'required_f1': 0.85,
                    'meets_threshold': metrics.get('f1_score', 0) >= 0.85
                }
            }
        }
        
        return jsonify(response)
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e),
            'message': 'Error retrieving ML metrics'
        }), 500

@app.route('/api/recommend', methods=['POST'])
def recommend():
    """
    Generate training course recommendations for an employee
    Expected input:
    {
        "skills": [{"name": "Python", "level": 4}, ...],
        "experience": 5,
        "department": "Information Technology",
        "location": "Jeddah"
    }
    """
    try:
        data = request.get_json()
        
        # Validate input
        if not data:
            return jsonify({'error': 'No data provided'}), 400
        
        required_fields = ['skills', 'experience', 'department']
        for field in required_fields:
            if field not in data:
                return jsonify({'error': f'Missing required field: {field}'}), 400
        
        # Process employee data
        employee_features = data_processor.process_employee_data(
            skills=data['skills'],
            experience=data.get('experience', 0),
            department=data.get('department', ''),
            location=data.get('location', 'Unknown')
        )
        
        # Generate recommendations
        recommendations = predictor.predict(employee_features)
        
        return jsonify({
            'success': True,
            'recommendations': recommendations,
            'employee_features': employee_features.tolist() if hasattr(employee_features, 'tolist') else employee_features
        })
        
    except Exception as e:
        return jsonify({
            'error': str(e),
            'message': 'Error generating recommendations'
        }), 500

@app.route('/api/batch-recommend', methods=['POST'])
def batch_recommend():
    """
    Generate recommendations for multiple employees
    Expected input:
    {
        "employees": [
            {
                "employee_id": "EMP001",
                "skills": [...],
                "experience": 5,
                "department": "...",
                "location": "..."
            },
            ...
        ]
    }
    """
    try:
        data = request.get_json()
        
        if not data or 'employees' not in data:
            return jsonify({'error': 'No employees data provided'}), 400
        
        results = []
        for employee in data['employees']:
            try:
                employee_features = data_processor.process_employee_data(
                    skills=employee.get('skills', []),
                    experience=employee.get('experience', 0),
                    department=employee.get('department', ''),
                    location=employee.get('location', 'Unknown')
                )
                
                recommendations = predictor.predict(employee_features)
                
                results.append({
                    'employee_id': employee.get('employee_id'),
                    'success': True,
                    'recommendations': recommendations
                })
            except Exception as e:
                results.append({
                    'employee_id': employee.get('employee_id'),
                    'success': False,
                    'error': str(e)
                })
        
        return jsonify({
            'success': True,
            'count': len(results),
            'results': results
        })
        
    except Exception as e:
        return jsonify({
            'error': str(e),
            'message': 'Error in batch recommendation'
        }), 500

@app.route('/api/recommend-v2', methods=['POST'])
def recommend_v2():
    """
    NEW: Enhanced hybrid recommendation system (ML + Rule-Based)
    Uses SmartRanker to combine ML predictions with multi-criteria scoring
    
    Expected input:
    {
        "skills": [{"name": "Python", "level": 4}, ...],
        "experience": 5,
        "department": "Information Technology",
        "location": "Jeddah",
        "training_history": [  // Optional
            {
                "course_id": "...",
                "completion_date": "2024-01-15",
                "assessment_score": 85
            }
        ],
        "dept_critical_skills": ["python", "sql"],  // Optional
        "courses": [  // Required: List of available courses
            {
                "_id": "course123",
                "title": "Advanced Python",
                "required_skills": ["python", "sql"],
                "target_experience_level": "Advanced",
                "department": "Information Technology",
                "duration": 30
            },
            ...
        ]
    }
    
    Returns:
    {
        "success": true,
        "recommendations": [
            {
                "course_id": "course123",
                "course_title": "Advanced Python",
                "final_score": 0.87,
                "rank": 1,
                "ml_confidence": 0.82,
                "rule_score": 0.91,
                "breakdown": {
                    "skill_match_score": 0.85,
                    "skill_gap_score": 0.92,
                    "dept_needs_score": 1.0,
                    "career_path_score": 0.88
                },
                "explanation": {
                    "top_reasons": [...],
                    "overall_fit": 0.87,
                    "fit_category": "ممتاز"
                }
            },
            ...
        ],
        "method": "hybrid_system",
        "configuration": {...}
    }
    """
    try:
        data = request.get_json()
        
        # Validate input
        if not data:
            return jsonify({'error': 'No data provided'}), 400
        
        required_fields = ['skills', 'experience', 'department', 'courses']
        for field in required_fields:
            if field not in data:
                return jsonify({'error': f'Missing required field: {field}'}), 400
        
        # Extract employee data
        employee_data = {
            'skills': data['skills'],
            'experience': data.get('experience', 0),
            'department': data.get('department', ''),
            'location': data.get('location', 'Unknown'),
            'training_history': data.get('training_history', []),
            'dept_critical_skills': data.get('dept_critical_skills', [])
        }
        
        # Get available courses
        all_courses = data.get('courses', [])
        
        if not all_courses:
            return jsonify({
                'success': False,
                'error': 'No courses provided for recommendation'
            }), 400
        
        # Use SmartRanker to get recommendations
        try:
            recommendations = smart_ranker.rank_courses(
                employee_data=employee_data,
                all_courses=all_courses,
                top_k=3
            )
        except Exception as e:
            print(f"SmartRanker error: {e}")
            import traceback
            traceback.print_exc()
            return jsonify({
                'success': False,
                'error': f'SmartRanker error: {str(e)}'
            }), 500
        
        # Add explanations to recommendations
        try:
            recommendations = explanation_generator.generate_batch_explanations(
                recommendations, employee_data
            )
        except Exception as e:
            print(f"Explanation error: {e}")
            # Continue without explanations if generator fails
        
        return jsonify({
            'success': True,
            'recommendations': recommendations,
            'method': 'hybrid_system',
            'configuration': smart_ranker.get_configuration()
        })
        
    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({
            'success': False,
            'error': str(e),
            'message': 'Error generating recommendations with hybrid system'
        }), 500

@app.route('/api/ranker/config', methods=['GET'])
def get_ranker_config():
    """Get current SmartRanker configuration"""
    try:
        return jsonify({
            'success': True,
            'configuration': smart_ranker.get_configuration()
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

if __name__ == '__main__':
    port = int(os.getenv('FLASK_PORT', 5001))
    debug = os.getenv('FLASK_ENV') == 'development'
    app.run(host='0.0.0.0', port=port, debug=debug)

