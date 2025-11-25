# تقرير هندسة النظام الشامل
## Smart Training Management System (STMS)

**المؤلف:** osama bittar  
**التاريخ:** نوفمبر 2025  
**الإصدار:** 1.0.0

---

## جدول المحتويات

1. [نظرة عامة على النظام](#1-نظرة-عامة-على-النظام)
2. [الهندسة المعمارية](#2-الهندسة-المعمارية)
3. [المكونات الأساسية](#3-المكونات-الأساسية)
4. [قاعدة البيانات](#4-قاعدة-البيانات)
5. [محرك التعلم الآلي](#5-محرك-التعلم-الآلي)
6. [واجهة المستخدم](#6-واجهة-المستخدم)
7. [الأمان والمصادقة](#7-الأمان-والمصادقة)
8. [API Reference](#8-api-reference)
9. [تدفق العمليات](#9-تدفق-العمليات)
10. [الأداء والمقاييس](#10-الأداء-والمقاييس)
11. [النشر والتشغيل](#11-النشر-والتشغيل)

---

## 1. نظرة عامة على النظام

### 1.1 وصف المشروع
نظام إدارة التدريب الذكي (STMS) هو منصة متكاملة تستخدم الذكاء الاصطناعي لتوليد توصيات تدريبية مخصصة للموظفين بناءً على:
- المهارات الحالية
- الخبرة العملية
- القسم والموقع
- التاريخ التدريبي
- احتياجات القسم

### 1.2 الأهداف الرئيسية
✅ **أتمتة عملية اختيار الدورات التدريبية**  
✅ **تحسين دقة التوصيات باستخدام ML**  
✅ **تقليل الوقت المستغرق في التخطيط التدريبي**  
✅ **تتبع وتحليل فعالية التدريب**  
✅ **دعم التطوير المهني المستمر**

### 1.3 المستخدمون المستهدفون
- **Admins:** إدارة كاملة للنظام
- **Managers:** مراجعة واعتماد التوصيات
- **Viewers:** عرض البيانات والتقارير

### 1.4 التقنيات المستخدمة

#### **Frontend Stack**
- React 18.2.0 + TypeScript
- Redux Toolkit (إدارة الحالة)
- Vite (Build Tool)
- TailwindCSS (التنسيق)
- Chart.js (الرسوم البيانية)
- AG Grid (جداول البيانات)

#### **Backend Stack**
- Node.js + Express.js
- MongoDB + Mongoose
- JWT (المصادقة)
- Axios (HTTP Requests)
- Bcrypt (تشفير كلمات المرور)

#### **ML Engine Stack**
- Python 3.x + Flask
- scikit-learn 1.2.2 (Random Forest)
- XGBoost 2.1.3 (Gradient Boosting)
- Pandas + NumPy (معالجة البيانات)
- Joblib (حفظ النماذج)

---

## 2. الهندسة المعمارية

### 2.1 Architecture Pattern
**3-Tier Microservices Architecture**

```
┌─────────────────────────────────────────────────────────┐
│                    CLIENT LAYER                         │
│            React SPA (Port 3000/5173)                   │
│    ┌──────────┬──────────┬──────────┬──────────┐      │
│    │Dashboard │Employees │ Courses  │  Reports │      │
│    └──────────┴──────────┴──────────┴──────────┘      │
└─────────────────────────┬───────────────────────────────┘
                          │ HTTP/REST
                          ▼
┌─────────────────────────────────────────────────────────┐
│                   API GATEWAY LAYER                     │
│           Express.js Server (Port 5000)                 │
│    ┌──────────┬──────────┬──────────┬──────────┐      │
│    │   Auth   │Employee  │  Course  │   Rec    │      │
│    │Controller│Controller│Controller│Controller│      │
│    └──────────┴──────────┴──────────┴──────────┘      │
└─────────────┬──────────────────────┬──────────────────┘
              │                      │
              │                      │ HTTP POST
              ▼                      ▼
┌──────────────────────┐  ┌────────────────────────────┐
│   DATABASE LAYER     │  │      ML ENGINE LAYER       │
│  MongoDB (27017)     │  │   Flask API (Port 5001)    │
│  ┌────────────────┐  │  │  ┌──────────────────────┐  │
│  │ - employees    │  │  │  │ Random Forest Model  │  │
│  │ - courses      │  │  │  │ XGBoost Model        │  │
│  │ - users        │  │  │  │ Hybrid Ranker        │  │
│  │ - recommend.   │  │  │  │ Rule-Based Scorer    │  │
│  │ - training_hist│  │  │  └──────────────────────┘  │
│  └────────────────┘  │  └────────────────────────────┘
└──────────────────────┘
```

### 2.2 Communication Flow

**1. User Authentication:**
```
Browser → POST /api/auth/login → Express → MongoDB
                                     ↓
                                 JWT Token
                                     ↓
                              Local Storage
```

**2. Recommendation Generation:**
```
Browser → POST /api/recommendations/generate/:id
           ↓
    Express Server
           ↓
    Fetch Employee + Courses from MongoDB
           ↓
    POST /api/recommend-v2 → Flask ML Engine
           ↓
    Hybrid System Processing:
    - Data Processing (43 features)
    - ML Prediction (RF + XGBoost)
    - Rule-Based Scoring (4 criteria)
    - Fusion & Ranking
           ↓
    Save Recommendations to MongoDB
           ↓
    Return Results to Browser
```

---

## 3. المكونات الأساسية

### 3.1 Backend Server (Express.js)

#### **3.1.1 Structure**
```
server/
├── config/
│   └── database.js          # MongoDB connection
├── controllers/
│   ├── authController.js    # Authentication logic
│   ├── employeeController.js
│   ├── courseController.js
│   ├── recommendationController.js
│   ├── trainingHistoryController.js
│   └── reportController.js
├── middleware/
│   ├── auth.js              # JWT verification
│   ├── validation.js        # Input validation
│   └── errorHandler.js
├── models/
│   ├── User.js
│   ├── Employee.js
│   ├── Course.js
│   ├── Recommendation.js
│   └── TrainingHistory.js
├── routes/
│   └── [API Routes]
└── index.js                 # Main entry point
```

#### **3.1.2 Key Features**
✅ RESTful API Design  
✅ JWT-based Authentication  
✅ Role-Based Access Control (Admin, Manager, Viewer)  
✅ Input Validation with express-validator  
✅ Error Handling Middleware  
✅ CORS Configuration  
✅ Security Headers (XSS, CSRF protection)  
✅ CSV Import/Export functionality  
✅ PDF Report Generation

#### **3.1.3 Environment Variables**
```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/stms
JWT_SECRET=your_secret_key
JWT_EXPIRE=30d
CLIENT_URL=http://localhost:3000
ML_ENGINE_URL=http://localhost:5001
NODE_ENV=development
```

---

### 3.2 Frontend Client (React + TypeScript)

#### **3.2.1 Structure**
```
client/src/
├── components/
│   ├── Layout.tsx           # Main layout wrapper
│   ├── ProtectedRoute.tsx   # Route protection
│   ├── PageLoader.tsx
│   ├── FeedbackBanner.tsx
│   └── ConfirmDialog.tsx
├── pages/
│   ├── LandingPage.tsx
│   ├── Login.tsx
│   ├── Dashboard.tsx        # Main dashboard
│   ├── Employees.tsx
│   ├── Courses.tsx
│   ├── Recommendations.tsx
│   ├── TrainingHistory.tsx
│   └── Reports.tsx
├── store/
│   ├── store.ts             # Redux store config
│   └── slices/
│       ├── authSlice.ts
│       ├── employeeSlice.ts
│       ├── courseSlice.ts
│       ├── recommendationSlice.ts
│       └── trainingHistorySlice.ts
├── services/
│   └── api.ts               # Axios instance + interceptors
├── types/
│   └── index.ts             # TypeScript definitions
├── hooks/
│   └── useSessionTimeout.ts
└── App.tsx
```

#### **3.2.2 State Management (Redux)**
```typescript
// Global State Structure
{
  auth: {
    user: User | null,
    token: string | null,
    isAuthenticated: boolean,
    loading: boolean
  },
  employees: {
    employees: Employee[],
    loading: boolean,
    error: string | null
  },
  courses: { ... },
  recommendations: { ... },
  trainingHistory: { ... }
}
```

#### **3.2.3 Key Features**
✅ Responsive Design (Mobile-First)  
✅ Real-time Data Updates  
✅ Interactive Charts (Chart.js)  
✅ Advanced Data Grids (AG Grid)  
✅ Session Timeout Management  
✅ Toast Notifications  
✅ Loading States & Error Handling  
✅ Form Validation  
✅ CSV Import/Export UI

---

### 3.3 ML Engine (Python + Flask)

#### **3.3.1 Structure**
```
ml-engine/
├── app.py                   # Flask API server
├── train_model.py           # Model training script
├── requirements.txt
├── models/
│   ├── recommendation_model.joblib    # Random Forest
│   ├── xgboost_model.joblib          # XGBoost
│   └── model_metrics.json            # Performance metrics
└── utils/
    ├── data_processor.py    # Feature engineering (43 features)
    ├── predictor.py         # Random Forest predictor
    ├── xgboost_trainer.py   # XGBoost trainer
    ├── ensemble_predictor.py # Ensemble (RF + XGBoost)
    ├── smart_ranker.py      # Hybrid system
    ├── course_scorer.py     # Rule-based scoring
    ├── course_mapper.py     # Course feature extraction
    └── explanation_generator.py
```

#### **3.3.2 Feature Engineering (43 Features)**

**Technical Skills (16 features):**
- Individual skill presence: python, javascript, java, sql, react, node.js, ml, data_analysis, pm, agile, devops, cloud, cybersecurity, network_security, database_design, web_dev
- avg_skill_level
- num_skills

**Experience (2 features):**
- experience_years
- experience_level (encoded: 0-3)

**Department (7 features - One-Hot Encoded):**
- dept_information_technology
- dept_human_resources
- dept_finance
- dept_marketing
- dept_operations
- dept_sales
- dept_engineering

**Location (4 features - One-Hot Encoded):**
- location_jeddah
- location_riyadh
- location_dammam
- location_unknown

**Skill Analysis (4 features):**
- weak_skills_count (level ≤ 2)
- strong_skills_count (level ≥ 4)
- skill_gap_score
- skill_progression_potential

**Career Progression (4 features):**
- career_level (1-4)
- next_level_readiness
- specialization_score
- leadership_skills (boolean)

**Training History (4 features):**
- training_frequency
- completion_rate
- avg_assessment_score
- days_since_last_training

#### **3.3.3 Hybrid Recommendation System**

**Architecture:**
```
┌──────────────────────────────────────────────────┐
│         HYBRID RECOMMENDATION ENGINE             │
├──────────────────────────────────────────────────┤
│                                                  │
│  ┌────────────────┐        ┌────────────────┐  │
│  │   ML MODELS    │        │  RULE-BASED    │  │
│  │   (50% weight) │        │   SCORING      │  │
│  │                │        │  (50% weight)  │  │
│  │ ┌───────────┐  │        │                │  │
│  │ │Random     │  │        │ • Skill Match  │  │
│  │ │Forest     │  │        │   (30%)        │  │
│  │ │(60%)      │  │        │                │  │
│  │ └───────────┘  │        │ • Skill Gap    │  │
│  │                │        │   Fill (30%)   │  │
│  │ ┌───────────┐  │        │                │  │
│  │ │XGBoost    │  │        │ • Dept Needs   │  │
│  │ │(40%)      │  │        │   (20%)        │  │
│  │ └───────────┘  │        │                │  │
│  └────────────────┘        │ • Career Path  │  │
│          │                 │   (20%)        │  │
│          │                 └────────────────┘  │
│          │                         │           │
│          └─────────┬───────────────┘           │
│                    ▼                            │
│              ┌──────────┐                       │
│              │  FUSION  │                       │
│              │  LAYER   │                       │
│              └──────────┘                       │
│                    │                            │
│                    ▼                            │
│          ┌──────────────────┐                  │
│          │ DIVERSITY RANKER │                  │
│          │ (Top-K Selection)│                  │
│          └──────────────────┘                  │
│                    │                            │
│                    ▼                            │
│           Final Recommendations                │
└──────────────────────────────────────────────────┘
```

**Scoring Formula:**
```
final_score = α × ML_confidence + (1-α) × rule_score

Where:
- α = 0.5 (equal weight)
- ML_confidence = 0.6 × RF_prob + 0.4 × XGB_prob
- rule_score = 0.3×skill_match + 0.3×gap_fill + 
               0.2×dept_align + 0.2×career_fit
```

#### **3.3.4 API Endpoints**

**Health Check:**
```
GET /api/health
Response: { status: "OK", message: "ML Engine is running" }
```

**Model Metrics:**
```
GET /api/ml/metrics
Response: {
  performance: { f1_score, accuracy, precision, recall },
  cross_validation: { cv_mean, cv_std, cv_scores },
  feature_importances: { ... },
  model_info: { ... }
}
```

**Generate Recommendations (v2 - Hybrid):**
```
POST /api/recommend-v2
Body: {
  skills: [{ name, level }, ...],
  experience: number,
  department: string,
  location: string,
  training_history: [...],
  dept_critical_skills: [...],
  courses: [...]
}
Response: {
  success: true,
  recommendations: [{
    course_id, course_title,
    final_score, rank,
    ml_confidence, rule_score,
    breakdown: { skill_match, gap_fill, dept_needs, career_path },
    explanation: { ... }
  }],
  method: "hybrid_system"
}
```

---

## 4. قاعدة البيانات

### 4.1 MongoDB Schema Design

#### **4.1.1 Users Collection**
```javascript
{
  _id: ObjectId,
  username: String (unique),
  password: String (hashed),
  role: Enum['Admin', 'Manager', 'Viewer'],
  email: String,
  createdAt: Date
}
```

#### **4.1.2 Employees Collection**
```javascript
{
  _id: ObjectId,
  employee_id: String (unique),
  name: String,
  email: String,
  department: {
    name: String,
    subgroup: String,
    critical_skills: [String]
  },
  skills: [{
    name: String,
    level: Number (1-5),
    last_used: Date
  }],
  experience: {
    years: Number (0-50),
    domain: String
  },
  location: String,
  training_history: [{
    course_id: ObjectId (ref: Course),
    completion_date: Date,
    assessment_score: Number (0-100)
  }],
  createdAt: Date,
  updatedAt: Date
}
```

#### **4.1.3 Courses Collection**
```javascript
{
  _id: ObjectId,
  title: String,
  description: String,
  department: String,
  prerequisites: [ObjectId (ref: Course)],
  delivery_mode: Enum['Online', 'In-Person', 'Hybrid'],
  duration: Number (days),
  max_participants: Number,
  required_skills: [String],
  target_experience_level: Enum['Beginner', 'Intermediate', 'Advanced', 'Expert'],
  isActive: Boolean,
  createdAt: Date,
  updatedAt: Date
}
```

#### **4.1.4 Recommendations Collection**
```javascript
{
  _id: ObjectId,
  employee_id: ObjectId (ref: Employee),
  course_id: ObjectId (ref: Course),
  confidence_score: Number (0-1),
  rank: Number (1-3),
  override_flag: Boolean,
  override_reason: String,
  status: Enum['Pending', 'Accepted', 'Rejected', 'Completed'],
  metadata: {
    ml_confidence: Number,
    rule_score: Number,
    breakdown: {
      skill_match_score, skill_gap_score,
      dept_needs_score, career_path_score
    },
    explanation: { ... },
    method: String
  },
  generated_at: Date,
  updatedAt: Date
}

// Indexes
{ employee_id: 1, course_id: 1 }
{ employee_id: 1, rank: 1 }
```

#### **4.1.5 Training History Collection**
```javascript
{
  _id: ObjectId,
  employee_id: ObjectId (ref: Employee),
  course_id: ObjectId (ref: Course),
  enrollment_date: Date,
  completion_date: Date,
  status: Enum['Completed', 'In Progress', 'Failed'],
  assessment_score: Number (0-100),
  feedback: String,
  createdAt: Date
}
```

### 4.2 Data Relationships

```
     ┌──────────┐
     │  Users   │
     └──────────┘
          
     ┌──────────┐         ┌──────────────┐         ┌──────────┐
     │Employees │◄────────│Recommendations│────────►│ Courses  │
     └────┬─────┘         └──────────────┘         └────┬─────┘
          │                                              │
          │                                              │
          │       ┌─────────────────────┐               │
          └──────►│ Training History    │◄──────────────┘
                  └─────────────────────┘
```

---

## 5. محرك التعلم الآلي

### 5.1 Model Training Process

```
1. Data Generation (train_model.py)
   ├─ 12,000 synthetic samples
   ├─ 30 course profiles
   └─ Realistic patterns (70-20-10 distribution)

2. Feature Engineering
   ├─ 43 features extracted
   ├─ One-hot encoding (dept, location)
   └─ Skill gap analysis

3. Model Training
   ├─ Random Forest (200 trees, max_depth=12)
   ├─ XGBoost (optional)
   └─ Class balancing

4. Validation
   ├─ 5-Fold Cross-Validation
   ├─ Test set evaluation (20%)
   └─ Confidence calibration

5. Model Persistence
   ├─ Save to models/*.joblib
   └─ Export metrics to model_metrics.json
```

### 5.2 Current Model Performance

**Random Forest Classifier:**
- **Accuracy:** 74.92%
- **Precision:** 78.64%
- **Recall:** 74.92%
- **F1-Score:** 76.21%
- **OOB Score:** 74%
- **CV Mean:** 71.10% (±19.44%)
- **Average Confidence:** 49.02%
- **Training Date:** 2025-11-25
- **Training Samples:** 6,000
- **Features:** 43
- **Model:** Random Forest (200 estimators, depth 12)

**Feature Importance (Top 10):**
1. **next_level_readiness:** 6.60% (career progression)
2. **experience_years:** 6.30%
3. **python:** 4.66%
4. **skill_progression_potential:** 4.50%
5. **avg_skill_level:** 3.91%
6. **dept_information_technology:** 3.73%
7. **sql:** 3.52%
8. **specialization_score:** 3.16%
9. **javascript:** 3.18%
10. **cybersecurity:** 3.05%

### 5.3 Hybrid System Components

#### **5.3.1 Ensemble Predictor**
- Combines Random Forest + XGBoost
- Weighted voting (RF: 60%, XGBoost: 40%)
- Fallback to RF if XGBoost unavailable

#### **5.3.2 Course Scorer (Rule-Based)**
```python
Criteria Weights:
├─ Skill Match (30%): How well employee has required skills
├─ Skill Gap Fill (30%): How well course fills missing skills
├─ Department Alignment (20%): Dept match score
└─ Career Progression (20%): Helps advance to next level

Scoring Logic:
skill_match = 0.5×coverage + 0.3×proficiency + 0.2×exp_match
skill_gap = 0.5×fills_critical + 0.3×fills_missing + 0.2×improves_weak
dept_align = 1.0 (exact) | 0.7 (related) | 0.3 (unrelated)
career_fit = 0.6×progression_fit + 0.25×skill_readiness + 0.15×duration
```

#### **5.3.3 Smart Ranker**
- Fuses ML and rule-based scores (α=0.5)
- Diversity-aware selection
- Avoids recommending redundant courses
- Returns top-K with rank

#### **5.3.4 Explanation Generator**
Generates human-readable explanations:
- Top reasons for recommendation
- Skill match details
- Gap analysis
- Fit category (ممتاز, جيد جداً, جيد, مقبول)

---

## 6. واجهة المستخدم

### 6.1 Dashboard Page

**Features:**
- Real-time statistics cards
  - Total Employees, Courses, Recommendations, Pending
  - Training completed/in-progress/total
- ML Model Performance Metrics
  - F1-Score, Accuracy, Precision, Recall
  - Cross-validation results
  - Model information
- Interactive Charts
  - Employees by Department (Bar Chart)
  - Recommendation Status (Doughnut Chart)
  - Courses by Department (Doughnut Chart)
- Recent Activities Feed
- Responsive design

### 6.2 Employees Page

**Features:**
- AG Grid data table
- Search & filter functionality
- Add/Edit/Delete employees
- Import from CSV
- Export to CSV
- View employee details
  - Skills with levels
  - Training history
  - Current recommendations
- Generate recommendations button

### 6.3 Courses Page

**Features:**
- Course catalog grid
- Filter by department, delivery mode, level
- Add/Edit/Delete/Deactivate courses
- View prerequisites
- Duration & max participants management

### 6.4 Recommendations Page

**Features:**
- View all recommendations
- Filter by status (Pending, Accepted, Rejected, Completed)
- Confidence score display
- Detailed breakdown view:
  - ML confidence
  - Rule score
  - Breakdown scores
  - Explanation
- Manual override capability
- Batch generation for all employees
- Custom recommendation modal

**Custom Recommendation Modal:**
Users can adjust:
- Skills (add/remove, change levels)
- Experience years
- Department
- Location
- Critical skills for department
- Training history

### 6.5 Training History Page

**Features:**
- Complete training records
- Filter by employee, course, status
- Add training completion manually
- Track assessment scores
- View completion dates
- Progress tracking

### 6.6 Reports Page

**Features:**
- Department-wise statistics
- Skill distribution analysis
- Training effectiveness metrics
- Recommendation acceptance rates
- Export reports to PDF/CSV
- Date range filtering

---

## 7. الأمان والمصادقة

### 7.1 Authentication Flow

```
┌─────────┐
│ Browser │
└────┬────┘
     │ 1. POST /api/auth/login
     │    { username, password }
     ▼
┌────────────────┐
│ Express Server │
└────┬───────────┘
     │ 2. Validate credentials
     │    bcrypt.compare(password, hash)
     ▼
┌─────────┐
│ MongoDB │
└────┬────┘
     │ 3. User found
     ▼
┌────────────────┐
│ Generate JWT   │
│ jwt.sign({id, │
│ role}, secret) │
└────┬───────────┘
     │ 4. Return token
     ▼
┌─────────┐
│ Browser │
│ Store in│
│LocalStora│
└─────────┘
```

### 7.2 Protected Routes

**Middleware Chain:**
```javascript
protect → authorize(roles) → controller

Example:
router.post('/generate/:id', 
  protect,                    // JWT verification
  authorize('Admin', 'Manager'), // Role check
  recommendationController.generate
);
```

### 7.3 Security Measures

✅ **Password Security:**
- Bcrypt hashing (10 rounds)
- No plain-text storage

✅ **JWT Security:**
- 30-day expiration
- Secure secret key
- Signed tokens

✅ **HTTP Security:**
- CORS configuration
- Security headers (X-Frame-Options, X-XSS-Protection, etc.)
- Input validation
- Rate limiting (recommended)

✅ **Database Security:**
- Mongoose schema validation
- Index optimization
- Connection pooling

✅ **Session Management:**
- Auto-logout on token expiry
- Session timeout (30 min inactivity)
- Token refresh (recommended)

---

## 8. API Reference

### 8.1 Authentication

**POST /api/auth/register**
```
Body: { username, email, password, role }
Response: { success: true, data: user, token }
```

**POST /api/auth/login**
```
Body: { username, password }
Response: { success: true, data: user, token }
```

**GET /api/auth/me**
```
Headers: { Authorization: "Bearer <token>" }
Response: { success: true, data: user }
```

### 8.2 Employees

**GET /api/employees**
```
Query: ?page=1&limit=50&search=...&department=...
Response: { success: true, count: N, data: [...] }
```

**POST /api/employees**
```
Body: { employee_id, name, email, department, skills, experience, location }
Response: { success: true, data: employee }
```

**PUT /api/employees/:id**
```
Body: { ...fields to update }
Response: { success: true, data: updatedEmployee }
```

**DELETE /api/employees/:id**
```
Response: { success: true, message: "Deleted" }
```

**POST /api/employees/import-csv**
```
Body: FormData with CSV file
Response: { success: true, count: N, message: "Imported" }
```

### 8.3 Courses

**GET /api/courses**
```
Query: ?department=...&delivery_mode=...&isActive=true
Response: { success: true, count: N, data: [...] }
```

**POST /api/courses**
```
Body: { title, description, department, prerequisites, delivery_mode, duration, ... }
Response: { success: true, data: course }
```

**PUT /api/courses/:id**
**DELETE /api/courses/:id**

### 8.4 Recommendations

**GET /api/recommendations**
```
Response: { success: true, count: N, data: [...] }
```

**GET /api/recommendations/employee/:employeeId**
```
Response: { success: true, count: N, data: [...] }
```

**POST /api/recommendations/generate/:employeeId**
```
Body: { customData?: { skills, experience, ... } }
Response: { success: true, count: 3, data: [...], method: "hybrid_system" }
```

**POST /api/recommendations/batch-generate**
```
Response: { success: true, successCount, errorCount }
```

**PUT /api/recommendations/:id**
```
Body: { status?, override_flag?, override_reason? }
Response: { success: true, data: updated }
```

### 8.5 Training History

**GET /api/training-history**
**POST /api/training-history**
**PUT /api/training-history/:id**
**DELETE /api/training-history/:id**

### 8.6 Dashboard

**GET /api/dashboard/stats**
```
Response: {
  success: true,
  data: {
    employees: { total, by_department },
    courses: { total, active, by_department },
    recommendations: { total, by_status },
    training: { completed, inProgress, total }
  }
}
```

**GET /api/dashboard/recent-activities**
```
Response: {
  success: true,
  data: [{ type, message, date, meta }]
}
```

**GET /api/dashboard/ml-metrics**
```
Response: {
  success: true,
  data: {
    performance: { f1_score, accuracy, precision, recall },
    cross_validation: { ... },
    model_info: { ... }
  }
}
```

### 8.7 Reports

**GET /api/reports/department-stats**
**GET /api/reports/skill-analysis**
**GET /api/reports/training-effectiveness**
**POST /api/reports/generate-pdf**

---

## 9. تدفق العمليات

### 9.1 Complete Recommendation Flow

```
Step 1: User selects employee
   ↓
Step 2: Frontend sends POST /api/recommendations/generate/:id
   ↓
Step 3: Backend fetches employee data + all active courses
   ↓
Step 4: Backend prepares payload with 43 features
   ↓
Step 5: POST /api/recommend-v2 to ML Engine
   ↓
Step 6: ML Engine processes:
   6a. Data Processor extracts 43 features
   6b. Ensemble Predictor (RF + XGBoost) generates ML scores
   6c. Course Scorer calculates rule-based scores
   6d. Smart Ranker fuses scores (α=0.5)
   6e. Diversity Ranker selects top-3 diverse courses
   6f. Explanation Generator adds reasoning
   ↓
Step 7: ML Engine returns recommendations with:
   - course_id, final_score, rank
   - ml_confidence, rule_score
   - breakdown (4 criteria)
   - explanation
   ↓
Step 8: Backend saves recommendations to MongoDB
   ↓
Step 9: Frontend displays recommendations with details
   ↓
Step 10: Manager reviews and accepts/rejects/overrides
   ↓
Step 11: Employee enrolls in accepted courses
   ↓
Step 12: Training completion tracked
   ↓
Step 13: Model retraining with feedback (future)
```

### 9.2 Data Import Flow

```
CSV File → Frontend Upload → Backend multer → CSV Parser
   ↓
Parse rows → Validate data → Transform to schema
   ↓
Bulk insert to MongoDB
   ↓
Return success count
```

### 9.3 Report Generation Flow

```
User selects report type + parameters
   ↓
Backend aggregates data from MongoDB
   ↓
Process statistics & charts data
   ↓
Generate PDF with PDFKit
   ↓
Return file or send email
```

---

## 10. الأداء والمقاييس

### 10.1 ML Model Performance

**Current Metrics:**
- Accuracy: 74.92%
- F1-Score: 76.21%
- Training Samples: 6,000
- Features: 43
- Cross-Validation: 71.10% ±19.44%

**Target Metrics (RETRAIN_GUIDE):**
- F1-Score: ≥92%
- Accuracy: ≥92%
- Average Confidence: ≥85%
- Training Samples: 12,000 (recommended)

**Improvement Plan:**
1. Increase training data to 12,000 samples
2. Fine-tune hyperparameters
3. Implement active learning
4. Add more feature engineering
5. Ensemble optimization

### 10.2 System Performance

**API Response Times (typical):**
- Authentication: <100ms
- CRUD operations: <200ms
- Recommendation generation: 2-5 seconds
- Batch recommendations: 30-60 seconds (100 employees)
- Dashboard load: <1 second

**Database Performance:**
- Indexed queries: <50ms
- Aggregation pipelines: <500ms
- Full-text search: <200ms

**Frontend Performance:**
- Initial load: 1-2 seconds
- Page transitions: <300ms
- Chart rendering: <500ms
- AG Grid (1000 rows): <1 second

### 10.3 Scalability Considerations

**Current Limits:**
- Max employees: ~10,000 (with current setup)
- Max courses: ~1,000
- Max concurrent users: ~50
- Max recommendations/hour: ~500

**Scaling Strategies:**
1. **Database:**
   - Sharding
   - Read replicas
   - Caching (Redis)

2. **ML Engine:**
   - Model serving with TensorFlow Serving
   - Batch prediction API
   - GPU acceleration

3. **API Server:**
   - Horizontal scaling (PM2 cluster)
   - Load balancing (nginx)
   - Caching layer

4. **Frontend:**
   - CDN for static assets
   - Code splitting
   - Lazy loading

---

## 11. النشر والتشغيل

### 11.1 Development Setup

```bash
# 1. Clone repository
git clone <repo-url>
cd SMS-final

# 2. Install dependencies
npm run install-all

# 3. Setup MongoDB
# Ensure MongoDB is running on localhost:27017

# 4. Setup Python environment
cd ml-engine
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt

# 5. Train ML model (if not already trained)
python train_model.py

# 6. Create .env files
# server/.env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/stms
JWT_SECRET=your_secret_key_here
ML_ENGINE_URL=http://localhost:5001

# ml-engine/.env
FLASK_PORT=5001
FLASK_ENV=development

# 7. Start all services
# Terminal 1: Backend
cd server && npm run dev

# Terminal 2: Frontend
cd client && npm start

# Terminal 3: ML Engine
cd ml-engine && python app.py
```

### 11.2 Production Deployment

**Recommended Stack:**
- **Hosting:** AWS EC2 / Azure VM / DigitalOcean
- **Database:** MongoDB Atlas (managed)
- **Web Server:** nginx (reverse proxy)
- **Process Manager:** PM2
- **SSL:** Let's Encrypt

**Deployment Steps:**

```bash
# 1. Server Setup
sudo apt update
sudo apt install nodejs npm python3 python3-pip nginx

# 2. Clone and setup
git clone <repo-url>
cd SMS-final
npm run install-all

# 3. Build frontend
cd client
npm run build
# Copy dist/ to nginx serve directory

# 4. Setup PM2 for backend
cd server
pm2 start index.js --name stms-backend

# 5. Setup ML Engine service
cd ml-engine
pip install -r requirements.txt
gunicorn --bind 0.0.0.0:5001 app:app --daemon

# 6. Configure nginx
# /etc/nginx/sites-available/stms
server {
    listen 80;
    server_name yourdomain.com;

    location / {
        root /var/www/stms-frontend;
        try_files $uri /index.html;
    }

    location /api {
        proxy_pass http://localhost:5000;
    }

    location /ml {
        proxy_pass http://localhost:5001;
    }
}

# 7. SSL with certbot
sudo certbot --nginx -d yourdomain.com

# 8. Setup MongoDB Atlas
# Update MONGODB_URI in production .env
```

### 11.3 Monitoring & Logging

**Backend Logging:**
```javascript
// utils/logger.js
const winston = require('winston');

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' })
  ]
});
```

**ML Engine Logging:**
```python
import logging

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('ml-engine.log'),
        logging.StreamHandler()
    ]
)
```

**Monitoring Tools:**
- PM2 monitoring: `pm2 monit`
- MongoDB Atlas monitoring
- Custom health check endpoints
- Uptime monitoring (UptimeRobot)

### 11.4 Backup Strategy

**Database Backup:**
```bash
# Automated daily backup
mongodump --uri="mongodb://localhost:27017/stms" --out=/backups/$(date +%Y%m%d)

# Restore
mongorestore --uri="mongodb://localhost:27017/stms" /backups/20251125
```

**Model Backup:**
- Version control for `models/*.joblib`
- Keep last 5 model versions
- Track `model_metrics.json` history

---

## 12. الخلاصة والتوصيات

### 12.1 نقاط القوة

✅ **Architecture:**
- Clean separation of concerns (3-tier)
- Microservices ready
- Scalable design

✅ **ML System:**
- Hybrid approach (ML + Rules)
- 43 comprehensive features
- Explainable recommendations

✅ **User Experience:**
- Modern responsive UI
- Real-time updates
- Interactive visualizations

✅ **Security:**
- JWT authentication
- Role-based access
- Input validation

✅ **Maintainability:**
- Well-structured codebase
- TypeScript for type safety
- Comprehensive API

### 12.2 نقاط التحسين

🔧 **Model Performance:**
- Current F1: 76.21% → Target: ≥92%
- Increase training data (6K → 12K)
- Hyperparameter tuning
- Implement active learning

🔧 **System Features:**
- Add notification system (email/SMS)
- Implement real-time collaboration
- Add course scheduling
- Budget tracking for training
- Manager approval workflow

🔧 **Performance:**
- Implement caching (Redis)
- Database query optimization
- Frontend code splitting
- API rate limiting

🔧 **Testing:**
- Add unit tests (Jest/Mocha)
- Integration tests
- E2E tests (Cypress)
- Load testing (k6)

🔧 **DevOps:**
- CI/CD pipeline (GitHub Actions)
- Docker containerization
- Kubernetes orchestration
- Automated backups

### 12.3 خارطة الطريق (Roadmap)

**Phase 1: Model Improvement (1-2 months)**
- Retrain with 12,000 samples
- Achieve ≥92% F1-Score
- Add confidence calibration
- Implement A/B testing

**Phase 2: Feature Enhancement (2-3 months)**
- Notification system
- Approval workflow
- Course scheduling
- Budget management

**Phase 3: Enterprise Features (3-6 months)**
- Multi-tenancy support
- Advanced analytics
- Integration with HR systems
- Mobile app (React Native)

**Phase 4: AI Enhancement (6-12 months)**
- NLP for course descriptions
- Automatic skill extraction from CVs
- Chatbot for Q&A
- Predictive analytics

### 12.4 التوصيات النهائية

**For Immediate Implementation:**
1. **Model Retraining:** Follow `ml-engine/RETRAIN_GUIDE.md`
2. **Testing:** Add test suites
3. **Documentation:** API documentation (Swagger)
4. **Security:** Implement rate limiting

**For Production:**
1. **Deployment:** Use Docker + Kubernetes
2. **Monitoring:** Set up Prometheus + Grafana
3. **Backup:** Automated daily backups
4. **SSL:** Enforce HTTPS

**For Long-term:**
1. **Scalability:** Migrate to microservices
2. **ML Ops:** Implement MLflow
3. **Analytics:** Add Business Intelligence dashboards
4. **Mobile:** Develop native apps

---

## 13. الملاحق

### 13.1 مراجع التقنيات

**Frontend:**
- React: https://react.dev/
- Redux Toolkit: https://redux-toolkit.js.org/
- TailwindCSS: https://tailwindcss.com/
- Chart.js: https://www.chartjs.org/
- AG Grid: https://www.ag-grid.com/

**Backend:**
- Express: https://expressjs.com/
- MongoDB: https://www.mongodb.com/
- Mongoose: https://mongoosejs.com/
- JWT: https://jwt.io/

**ML:**
- scikit-learn: https://scikit-learn.org/
- XGBoost: https://xgboost.readthedocs.io/
- Flask: https://flask.palletsprojects.com/

### 13.2 فريق المشروع

**Developer:** Nawar Fawzi Alodah  
**Architecture:** Full-Stack MERN + ML  
**License:** MIT

### 13.3 الدعم والتواصل

For support, questions, or contributions:
- GitHub Issues
- Email: [contact]
- Documentation: This report + inline code comments

---

**تاريخ التقرير:** نوفمبر 2025  
**الإصدار:** 1.0.0  
**الحالة:** Production Ready (with recommended improvements)


