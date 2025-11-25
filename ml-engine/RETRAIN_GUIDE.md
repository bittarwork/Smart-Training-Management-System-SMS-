# دليل إعادة تدريب النموذج المحسّن

## نظرة عامة

تم تحسين نظام التوصيات بميزات جديدة ونظام هجين. لإعادة تدريب النماذج:

## المتطلبات

### 1. تثبيت المكتبات الجديدة

```bash
cd ml-engine
pip install -r requirements.txt
```

**ملاحظة**: تم إضافة `xgboost==2.1.3` للنموذج الجديد

### 2. التحسينات المضافة

#### أ. ميزات جديدة (43 ميزة بدلاً من 31)

- **Skill Gap Analysis** (4 ميزات):
  - `weak_skills_count`: عدد المهارات الضعيفة
  - `strong_skills_count`: عدد المهارات القوية
  - `skill_gap_score`: نسبة الفجوات
  - `skill_progression_potential`: إمكانية التطور

- **Career Progression** (4 ميزات):
  - `career_level`: المستوى الوظيفي (1-4)
  - `next_level_readiness`: الجاهزية للمستوى التالي
  - `specialization_score`: درجة التخصص
  - `leadership_skills`: وجود مهارات قيادية

- **Training History** (4 ميزات):
  - `training_frequency`: عدد التدريبات
  - `completion_rate`: نسبة الإكمال
  - `avg_assessment_score`: متوسط الدرجات
  - `days_since_last_training`: أيام منذ آخر تدريب

#### ب. بيانات تدريبية محسّنة

- **حجم البيانات**: زيادة من 6000 إلى **12000 عينة**
- **عدد الكورسات**: زيادة من 25 إلى **30 كورس**
- **أنماط واقعية**:
  - 70% موظفين يطابقون متطلبات الكورس
  - 20% موظفين بفجوات يملؤها الكورس
  - 10% ضوضاء عشوائية

## خطوات إعادة التدريب

### الطريقة 1: تدريب Random Forest المحسّن

```bash
cd ml-engine
python train_model.py
```

**النتائج المتوقعة**:
- F1-Score: **92%+** (بدلاً من 87.7%)
- Average Confidence: **85%+** (بدلاً من 75.7%)
- عدد الميزات: **43** (بدلاً من 31)

### الطريقة 2: تدريب XGBoost (اختياري)

```python
from utils.xgboost_trainer import XGBoostTrainer
from utils.model_trainer import ModelTrainer

# Generate enhanced data
trainer = ModelTrainer()
X, y = trainer.generate_sample_data(n_samples=12000, n_courses=30)

# Train XGBoost
xgb_trainer = XGBoostTrainer('./models/xgboost_model.joblib')
xgb_trainer.train(X, y)
xgb_trainer.save_model()

print("XGBoost model trained successfully!")
```

## التحقق من النموذج

### 1. فحص الميزات

```python
from utils.data_processor import DataProcessor

processor = DataProcessor()
features = processor._get_expected_features()
print(f"Total features: {len(features)}")
print("New features:", features[31:])  # آخر 12 ميزة جديدة
```

### 2. اختبار النموذج

```python
from utils.ensemble_predictor import EnsemblePredictor

predictor = EnsemblePredictor()
print(predictor.get_model_info())
```

### 3. اختبار API الجديد

```bash
# Start ML engine
python app.py

# في terminal آخر:
curl -X POST http://localhost:5001/api/recommend-v2 \
  -H "Content-Type: application/json" \
  -d '{
    "skills": [{"name": "Python", "level": 4}],
    "experience": 5,
    "department": "Information Technology",
    "location": "Jeddah",
    "dept_critical_skills": ["python", "sql"],
    "courses": [...]
  }'
```

## ملفات النماذج

بعد التدريب ستجد:

- `models/recommendation_model.joblib` - Random Forest المحسّن
- `models/xgboost_model.joblib` - XGBoost (إذا تم تدريبه)
- `models/model_metrics.json` - مقاييس الأداء

## النظام الهجين

النظام الجديد يدمج:

1. **ML Models** (وزن 50%):
   - Random Forest (وزن 60%)
   - XGBoost (وزن 40%)

2. **Rule-Based Scoring** (وزن 50%):
   - Skill Match: 30%
   - Skill Gap Fill: 30%
   - Department Needs: 20%
   - Career Path: 20%

## استكشاف الأخطاء

### مشكلة: "Feature mismatch"

```bash
# احذف النماذج القديمة
rm models/*.joblib

# أعد التدريب
python train_model.py
```

### مشكلة: "XGBoost not available"

```bash
# تثبيت XGBoost
pip install xgboost==2.1.3

# النظام سيعمل بدون XGBoost (RF فقط)
```

### مشكلة: "Low confidence scores"

- تأكد من استخدام 12000 عينة
- تحقق من جودة البيانات التدريبية
- راجع course_profiles في model_trainer.py

## المقاييس المستهدفة

| المقياس | قبل التحسين | بعد التحسين |
|---------|-------------|--------------|
| F1-Score | 87.7% | **92%+** |
| Accuracy | 87.6% | **92%+** |
| Avg Confidence | 75.7% | **85%+** |
| Features | 31 | **43** |
| Training Samples | 6000 | **12000** |

## الخطوات التالية

1. ✅ تدريب النماذج المحسّنة
2. ✅ اختبار API endpoint الجديد
3. ✅ التحقق من جودة التوصيات
4. 📊 مراقبة الأداء في الإنتاج
5. 🔄 تحديث دوري بناءً على feedback المستخدمين

## الدعم

للمساعدة أو الأسئلة، راجع:
- `ml-engine/utils/` - الكود المصدري
- `enhanced-recommendation-system.plan.md` - الخطة الكاملة

