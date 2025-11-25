// Input validation middleware
// Validates request data before processing

const { body, validationResult } = require('express-validator');
const mongoose = require('mongoose');

const isValidObjectId = (value) => mongoose.Types.ObjectId.isValid(value);

// Validation error handler
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed | فشل التحقق',
      errors: errors.array(),
    });
  }
  next();
};

// Employee validation rules
exports.validateEmployee = [
  body('employee_id')
    .trim()
    .notEmpty()
    .withMessage('Employee ID is required | مُعرّف الموظف مطلوب')
    .isLength({ min: 3, max: 50 })
    .withMessage('Employee ID must be between 3 and 50 characters | يجب أن يكون طول مُعرّف الموظف بين 3 و50 حرفاً'),
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Name is required | الاسم مطلوب')
    .isLength({ min: 2, max: 100 })
    .withMessage('Name must be between 2 and 100 characters | يجب أن يتراوح طول الاسم بين 2 و100 حرف'),
  body('email')
    .trim()
    .notEmpty()
    .withMessage('Email is required | البريد الإلكتروني مطلوب')
    .isEmail()
    .withMessage('Invalid email format | صيغة البريد الإلكتروني غير صحيحة')
    .normalizeEmail(),
  body('department.name')
    .trim()
    .notEmpty()
    .withMessage('Department name is required | اسم القسم مطلوب'),
  body('experience.years')
    .isInt({ min: 0, max: 50 })
    .withMessage('Experience years must be between 0 and 50 | يجب أن تتراوح سنوات الخبرة بين 0 و50'),
  body('skills')
    .optional()
    .isArray()
    .withMessage('Skills must be an array | يجب أن تكون المهارات مصفوفة')
    .custom((skills) => {
      if (skills.length > 15) {
        throw new Error('Maximum 15 skills allowed per employee | الحد الأقصى 15 مهارة لكل موظف');
      }
      return true;
    }),
  handleValidationErrors,
];

// Course validation rules
exports.validateCourse = [
  body('title')
    .trim()
    .notEmpty()
    .withMessage('Course title is required | عنوان الدورة مطلوب')
    .isLength({ min: 3, max: 200 })
    .withMessage('Title must be between 3 and 200 characters | يجب أن يكون العنوان بين 3 و200 حرف'),
  body('department')
    .trim()
    .notEmpty()
    .withMessage('Department is required | القسم مطلوب'),
  body('delivery_mode')
    .isIn(['Online', 'In-Person', 'Hybrid'])
    .withMessage('Invalid delivery mode | نمط تقديم غير صالح'),
  body('duration')
    .isInt({ min: 1 })
    .withMessage('Duration must be a positive integer | يجب أن تكون مدة الدورة رقماً صحيحاً موجباً'),
  body('prerequisites')
    .optional()
    .isArray({ max: 10 })
    .withMessage('Prerequisites must be an array with up to 10 items | يجب أن تكون المتطلبات الأساسية مصفوفة بحد أقصى 10 عناصر')
    .custom((prerequisites, { req }) => {
      const seen = new Set();
      prerequisites.forEach((courseId) => {
        if (!isValidObjectId(courseId)) {
          throw new Error('Prerequisite course ID is invalid | مُعرّف الدورة المسبقة غير صالح');
        }
        if (seen.has(String(courseId))) {
          throw new Error('Duplicate prerequisites are not allowed | لا يسمح بتكرار الدورات المسبقة');
        }
        seen.add(String(courseId));
        if (req.params?.id && String(req.params.id) === String(courseId)) {
          throw new Error('Course cannot reference itself as prerequisite | لا يمكن للدورة أن تعتمد على نفسها كشرط مسبق');
        }
      });
      return true;
    }),
  handleValidationErrors,
];

// Course update validation (fields optional but validated when present)
exports.validateCourseUpdate = [
  body('title')
    .optional()
    .trim()
    .isLength({ min: 3, max: 200 })
    .withMessage('Title must be between 3 and 200 characters | يجب أن يكون العنوان بين 3 و200 حرف'),
  body('department')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Department is required | القسم مطلوب'),
  body('delivery_mode')
    .optional()
    .isIn(['Online', 'In-Person', 'Hybrid'])
    .withMessage('Invalid delivery mode | نمط تقديم غير صالح'),
  body('duration')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Duration must be a positive integer | يجب أن تكون مدة الدورة رقماً صحيحاً موجباً'),
  body('prerequisites')
    .optional()
    .isArray({ max: 10 })
    .withMessage('Prerequisites must be an array with up to 10 items | يجب أن تكون المتطلبات الأساسية مصفوفة بحد أقصى 10 عناصر')
    .custom((prerequisites, { req }) => {
      const seen = new Set();
      prerequisites.forEach((courseId) => {
        if (!isValidObjectId(courseId)) {
          throw new Error('Prerequisite course ID is invalid | مُعرّف الدورة المسبقة غير صالح');
        }
        if (seen.has(String(courseId))) {
          throw new Error('Duplicate prerequisites are not allowed | لا يسمح بتكرار الدورات المسبقة');
        }
        seen.add(String(courseId));
        if (req.params?.id && String(req.params.id) === String(courseId)) {
          throw new Error('Course cannot reference itself as prerequisite | لا يمكن للدورة أن تعتمد على نفسها كشرط مسبق');
        }
      });
      return true;
    }),
  handleValidationErrors,
];

// Login validation rules
exports.validateLogin = [
  body('username')
    .trim()
    .notEmpty()
    .withMessage('Username is required | اسم المستخدم مطلوب')
    .isLength({ min: 3, max: 50 })
    .withMessage('Username must be between 3 and 50 characters | يجب أن يكون اسم المستخدم بين 3 و50 حرفاً'),
  body('password')
    .notEmpty()
    .withMessage('Password is required | كلمة المرور مطلوبة')
    .isLength({ min: 1 })
    .withMessage('Password is required | كلمة المرور مطلوبة'),
  handleValidationErrors,
];

const trainingStatuses = ['Not Started', 'In Progress', 'Completed', 'Failed'];

exports.validateTrainingHistoryCreate = [
  body('employee_id')
    .notEmpty()
    .withMessage('Employee ID is required | مُعرّف الموظف مطلوب')
    .custom((value) => {
      if (!isValidObjectId(value)) {
        throw new Error('Employee ID must be a valid identifier | يجب أن يكون معرّف الموظف صالحاً');
      }
      return true;
    }),
  body('course_id')
    .notEmpty()
    .withMessage('Course ID is required | مُعرّف الدورة مطلوب')
    .custom((value) => {
      if (!isValidObjectId(value)) {
        throw new Error('Course ID must be a valid identifier | يجب أن يكون معرّف الدورة صالحاً');
      }
      return true;
    }),
  body('start_date')
    .optional()
    .isISO8601()
    .withMessage('Start date must be a valid ISO date | يجب أن يكون تاريخ البدء صالحاً'),
  body('completion_date')
    .optional()
    .isISO8601()
    .withMessage('Completion date must be a valid ISO date | يجب أن يكون تاريخ الإنهاء صالحاً'),
  body('assessment_score')
    .optional()
    .isInt({ min: 0, max: 100 })
    .withMessage('Assessment score must be between 0 and 100 | يجب أن تكون درجة التقييم بين 0 و100'),
  body('status')
    .isIn(trainingStatuses)
    .withMessage('Invalid training status | حالة تدريب غير صالحة'),
  body('progress')
    .isInt({ min: 0, max: 100 })
    .withMessage('Progress must be between 0 and 100 | يجب أن تكون نسبة التقدم بين 0 و100'),
  body('feedback')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Feedback cannot exceed 500 characters | لا يمكن أن يتجاوز التعليق 500 حرف'),
  handleValidationErrors,
];

exports.validateTrainingHistoryUpdate = [
  body('start_date')
    .optional()
    .isISO8601()
    .withMessage('Start date must be a valid ISO date | يجب أن يكون تاريخ البدء صالحاً'),
  body('completion_date')
    .optional()
    .isISO8601()
    .withMessage('Completion date must be a valid ISO date | يجب أن يكون تاريخ الإنهاء صالحاً'),
  body('assessment_score')
    .optional()
    .isInt({ min: 0, max: 100 })
    .withMessage('Assessment score must be between 0 and 100 | يجب أن تكون درجة التقييم بين 0 و100'),
  body('status')
    .optional()
    .isIn(trainingStatuses)
    .withMessage('Invalid training status | حالة تدريب غير صالحة'),
  body('progress')
    .optional()
    .isInt({ min: 0, max: 100 })
    .withMessage('Progress must be between 0 and 100 | يجب أن تكون نسبة التقدم بين 0 و100'),
  body('feedback')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Feedback cannot exceed 500 characters | لا يمكن أن يتجاوز التعليق 500 حرف'),
  handleValidationErrors,
];

exports.handleValidationErrors = handleValidationErrors;

