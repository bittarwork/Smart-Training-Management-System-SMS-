# دليل اختبار والتحقق من النظام المحسّن

## نظرة عامة

هذا الدليل يوضح كيفية اختبار والتحقق من تحسينات نظام التوصيات الهجين.

## قبل البدء

### 1. التأكد من تثبيت المكتبات

```bash
cd ml-engine
pip install -r requirements.txt
```

### 2. تدريب النماذج

```bash
python train_model.py
```

### 3. تشغيل ML Engine

```bash
python app.py
# سيعمل على http://localhost:5001
```

## الاختبارات الوظيفية

### اختبار 1: Feature Engineering الجديد

```python
from utils.data_processor import DataProcessor

# إنشاء معالج البيانات
processor = DataProcessor()

# بيانات موظف تجريبي
employee_data = {
    'skills': [
        {'name': 'Python', 'level': 4},
        {'name': 'SQL', 'level': 3}
    ],
    'experience': 5,
    'department': 'Information Technology',
    'location': 'Jeddah',
    'training_history': [
        {
            'course_id': 'past1',
            'completion_date': '2024-01-15',
            'assessment_score': 85
        }
    ],
    'dept_critical_skills': ['python', 'sql', 'machine_learning']
}

# معالجة البيانات
features = processor.process_employee_data(
    skills=employee_data['skills'],
    experience=employee_data['experience'],
    department=employee_data['department'],
    location=employee_data['location'],
    training_history=employee_data['training_history'],
    dept_critical_skills=employee_data['dept_critical_skills']
)

print(f"عدد الميزات: {len(features)}")
print(f"الميزات المتوقعة: {len(processor._get_expected_features())}")
assert len(features) == 43, "يجب أن يكون عدد الميزات 43"
print("✅ اختبار Feature Engineering ناجح!")
```

**النتيجة المتوقعة**: 43 ميزة (31 قديمة + 12 جديدة)

### اختبار 2: Course Scorer

```python
from utils.course_scorer import CourseScorer

scorer = CourseScorer()

employee_data = {
    'skills': [{'name': 'Python', 'level': 3}],
    'experience': 5,
    'department': 'Information Technology',
    'dept_critical_skills': ['python', 'machine_learning']
}

course_data = {
    'required_skills': ['python', 'machine_learning'],
    'target_experience_level': 'Advanced',
    'department': 'Information Technology',
    'duration': 30
}

composite_score, breakdown = scorer.calculate_composite_score(
    employee_data, 
    course_data
)

print(f"النتيجة الإجمالية: {composite_score:.3f}")
print("التفصيل:")
for criterion, score in breakdown.items():
    print(f"  {criterion}: {score:.3f}")

assert 0 <= composite_score <= 1, "النتيجة يجب أن تكون بين 0 و 1"
assert len(breakdown) == 4, "يجب أن يكون هناك 4 معايير"
print("✅ اختبار Course Scorer ناجح!")
```

**النتيجة المتوقعة**: نتيجة بين 0-1 مع تفصيل للمعايير الأربعة

### اختبار 3: Ensemble Predictor

```python
from utils.ensemble_predictor import EnsemblePredictor
from utils.data_processor import DataProcessor

predictor = EnsemblePredictor()
processor = DataProcessor()

# التحقق من تحميل النماذج
info = predictor.get_model_info()
print("معلومات النماذج:")
print(f"  RF محمّل: {info['rf_loaded']}")
print(f"  XGBoost محمّل: {info['xgb_loaded']}")
print(f"  Ensemble نشط: {info['ensemble_active']}")
print(f"  الأوزان: RF={info['weights']['rf']}, XGB={info['weights']['xgb']}")

# اختبار التوقع
features = processor.process_employee_data(
    skills=[{'name': 'Python', 'level': 4}],
    experience=5,
    department='Information Technology',
    location='Jeddah'
)

recommendations = predictor.predict(features, top_k=3)
print(f"\nعدد التوصيات: {len(recommendations)}")
for rec in recommendations:
    print(f"  الكورس {rec['course_id']}: ثقة {rec['confidence_score']:.3f}")

assert len(recommendations) == 3, "يجب الحصول على 3 توصيات"
print("✅ اختبار Ensemble Predictor ناجح!")
```

### اختبار 4: Smart Ranker (النظام الهجين)

```python
from utils.smart_ranker import SmartRanker

ranker = SmartRanker(alpha=0.5)

employee_data = {
    'skills': [
        {'name': 'Python', 'level': 4},
        {'name': 'JavaScript', 'level': 3}
    ],
    'experience': 5,
    'department': 'Information Technology',
    'location': 'Jeddah',
    'dept_critical_skills': ['python', 'machine_learning']
}

# كورسات تجريبية
courses = [
    {
        '_id': 'course1',
        'title': 'Advanced Python',
        'required_skills': ['python'],
        'target_experience_level': 'Advanced',
        'department': 'Information Technology',
        'duration': 30
    },
    {
        '_id': 'course2',
        'title': 'Machine Learning Basics',
        'required_skills': ['python', 'machine_learning'],
        'target_experience_level': 'Intermediate',
        'department': 'Information Technology',
        'duration': 45
    },
    {
        '_id': 'course3',
        'title': 'Web Development',
        'required_skills': ['javascript', 'react'],
        'target_experience_level': 'Intermediate',
        'department': 'Information Technology',
        'duration': 30
    }
]

recommendations = ranker.rank_courses(
    employee_data=employee_data,
    all_courses=courses,
    top_k=3
)

print(f"عدد التوصيات: {len(recommendations)}")
for rec in recommendations:
    print(f"\n{rec['rank']}. {rec['course_title']}")
    print(f"   النتيجة النهائية: {rec['final_score']:.3f}")
    print(f"   ثقة ML: {rec['ml_confidence']:.3f}")
    print(f"   نتيجة القواعد: {rec['rule_score']:.3f}")
    
assert len(recommendations) <= 3, "يجب ألا يتجاوز عدد التوصيات 3"
print("\n✅ اختبار Smart Ranker ناجح!")
```

### اختبار 5: Explanation Generator

```python
from utils.explanation_generator import ExplanationGenerator

generator = ExplanationGenerator()

# توصية تجريبية
recommendation = {
    'breakdown': {
        'skill_match_score': 0.85,
        'skill_gap_score': 0.70,
        'dept_needs_score': 1.0,
        'career_path_score': 0.80
    },
    'final_score': 0.84,
    'ml_confidence': 0.82,
    'rule_score': 0.86
}

employee_data = {
    'skills': [{'name': 'Python', 'level': 4}],
    'experience': 5,
    'department': 'Information Technology'
}

explanation = generator.generate_explanation(recommendation, employee_data)

print("التفسير:")
print(f"  التوافق الإجمالي: {explanation['overall_fit']:.2f}")
print(f"  التصنيف: {explanation['fit_category']}")
print("\nأهم الأسباب:")
for reason in explanation['top_reasons']:
    print(f"  - {reason['reason']} ({reason['impact_percentage']:.1f}%)")

assert 'top_reasons' in explanation, "يجب وجود أسباب"
assert 'fit_category' in explanation, "يجب وجود تصنيف"
print("\n✅ اختبار Explanation Generator ناجح!")
```

## اختبارات API

### اختبار 6: API Endpoint القديم

```bash
curl -X POST http://localhost:5001/api/recommend \
  -H "Content-Type: application/json" \
  -d '{
    "skills": [{"name": "Python", "level": 4}],
    "experience": 5,
    "department": "Information Technology",
    "location": "Jeddah"
  }'
```

**النتيجة المتوقعة**: 3 توصيات مع confidence_score

### اختبار 7: API Endpoint الجديد (v2)

```bash
curl -X POST http://localhost:5001/api/recommend-v2 \
  -H "Content-Type: application/json" \
  -d '{
    "skills": [
      {"name": "Python", "level": 4},
      {"name": "SQL", "level": 3}
    ],
    "experience": 5,
    "department": "Information Technology",
    "location": "Jeddah",
    "dept_critical_skills": ["python", "machine_learning"],
    "courses": [
      {
        "_id": "course1",
        "title": "Advanced Python",
        "required_skills": ["python"],
        "target_experience_level": "Advanced",
        "department": "Information Technology",
        "duration": 30
      }
    ]
  }'
```

**النتيجة المتوقعة**: توصيات مع:
- `final_score`
- `ml_confidence`
- `rule_score`
- `breakdown` (4 معايير)
- `explanation`

### اختبار 8: Ranker Configuration

```bash
curl http://localhost:5001/api/ranker/config
```

**النتيجة المتوقعة**: معلومات عن:
- alpha (وزن ML vs Rules)
- ensemble_info
- scoring_weights

## اختبارات الأداء

### اختبار 9: قياس التحسينات

```python
import json

# قراءة المقاييس
with open('models/model_metrics.json', 'r') as f:
    metrics = json.load(f)

print("=== مقاييس الأداء ===")
print(f"F1-Score: {metrics['f1_score']:.4f} (الهدف: >= 0.92)")
print(f"Accuracy: {metrics['accuracy']:.4f} (الهدف: >= 0.92)")
print(f"Precision: {metrics['precision']:.4f}")
print(f"Recall: {metrics['recall']:.4f}")
print(f"Avg Confidence: {metrics['avg_confidence']:.4f} (الهدف: >= 0.85)")
print(f"CV Mean: {metrics['cv_mean']:.4f}")
print(f"\nعدد العينات: {metrics['n_samples']}")
print(f"عدد الميزات: {metrics['n_features']}")

# التحقق من الأهداف
checks = {
    'F1-Score >= 92%': metrics['f1_score'] >= 0.92,
    'Accuracy >= 92%': metrics['accuracy'] >= 0.92,
    'Avg Confidence >= 85%': metrics['avg_confidence'] >= 0.85,
    'Features == 43': metrics['n_features'] == 43,
    'Samples >= 12000': metrics['n_samples'] >= 12000
}

print("\n=== التحقق من الأهداف ===")
for check, passed in checks.items():
    status = "✅" if passed else "❌"
    print(f"{status} {check}")

all_passed = all(checks.values())
if all_passed:
    print("\n🎉 جميع الأهداف تحققت!")
else:
    print("\n⚠️ بعض الأهداف لم تتحقق - قد تحتاج لإعادة التدريب")
```

### اختبار 10: مقارنة قبل وبعد

| المقياس | قبل | بعد | التحسين |
|---------|-----|-----|---------|
| F1-Score | 87.7% | **؟%** | **+؟%** |
| Accuracy | 87.6% | **؟%** | **+؟%** |
| Avg Confidence | 75.7% | **؟%** | **+؟%** |
| Features | 31 | 43 | +12 |
| Samples | 6000 | 12000 | +6000 |

**ملاحظة**: قم بتشغيل train_model.py لملء القيم الفعلية

## اختبارات التكامل

### اختبار 11: Backend Integration

1. تشغيل Backend Server:
```bash
cd server
npm start
```

2. تشغيل ML Engine:
```bash
cd ml-engine
python app.py
```

3. اختبار التوصيات عبر Backend:
```bash
# احصل على token أولاً
TOKEN="your_jwt_token"

# توليد توصيات لموظف
curl -X POST http://localhost:5000/api/recommendations/generate/EMPLOYEE_ID \
  -H "Authorization: Bearer $TOKEN"
```

**النتيجة المتوقعة**:
- استخدام `/api/recommend-v2` تلقائياً
- حفظ `metadata` مع التوصيات
- وجود `explanation` في الاستجابة

### اختبار 12: Fallback إلى v1

```python
# إيقاف ML Engine
# محاولة توليد توصيات من Backend
# يجب أن يعود خطأ أو يستخدم v1 كـ fallback
```

## معايير النجاح

### ✅ المعايير الوظيفية

- [ ] 43 ميزة في Feature Engineering
- [ ] CourseScorer يعمل مع 4 معايير
- [ ] Ensemble يدمج RF و XGBoost
- [ ] SmartRanker ينتج توصيات هجينة
- [ ] ExplanationGenerator يقدم تفسيرات

### ✅ معايير الأداء

- [ ] F1-Score >= 92%
- [ ] Avg Confidence >= 85%
- [ ] زمن الاستجابة < 3 ثواني
- [ ] عدد الميزات = 43
- [ ] عدد العينات >= 12000

### ✅ معايير التكامل

- [ ] API v2 يعمل بشكل صحيح
- [ ] Backend يستخدم v2 تلقائياً
- [ ] Fallback إلى v1 يعمل
- [ ] حفظ metadata مع التوصيات
- [ ] عرض التفسيرات في Frontend

## استكشاف الأخطاء الشائعة

### خطأ: "Feature mismatch"

**الحل**: احذف النماذج القديمة وأعد التدريب

```bash
rm models/*.joblib
python train_model.py
```

### خطأ: "XGBoost not available"

**الحل**: النظام سيعمل بـ RF فقط (مقبول)

```bash
pip install xgboost==2.1.3
```

### خطأ: "Low confidence scores"

**الحل**: تحقق من جودة البيانات التدريبية

```python
# تحقق من course_profiles في model_trainer.py
# تأكد من استخدام 12000 عينة
```

### خطأ: "API timeout"

**الحل**: قلل عدد الكورسات أو زد timeout

```javascript
// في recommendationController.js
timeout: 20000  // بدلاً من 15000
```

## الخلاصة

بعد تشغيل جميع الاختبارات:

```
✅ Feature Engineering: 43 ميزة
✅ Course Scoring: 4 معايير
✅ ML Models: RF + XGBoost
✅ Hybrid System: تكامل كامل
✅ API v2: يعمل بشكل صحيح
✅ Backend Integration: تكامل ناجح
```

النظام جاهز للاستخدام! 🎉

