// Employee model for storing employee profiles
// Includes skills, experience, department, and training history

const mongoose = require('mongoose');

const skillSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  level: {
    type: Number,
    required: true,
    min: 1,
    max: 5,
  },
  last_used: {
    type: Date,
    default: Date.now,
  },
});

const trainingHistorySchema = new mongoose.Schema({
  course_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course',
    required: true,
  },
  completion_date: {
    type: Date,
    default: Date.now,
  },
  assessment_score: {
    type: Number,
    min: 0,
    max: 100,
  },
});

const employeeSchema = new mongoose.Schema({
  employee_id: {
    type: String,
    required: [true, 'Employee ID is required'],
    unique: true,
    trim: true,
  },
  name: {
    type: String,
    required: [true, 'Employee name is required'],
    trim: true,
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    trim: true,
    lowercase: true,
  },
  department: {
    name: {
      type: String,
      required: [true, 'Department name is required'],
      trim: true,
    },
    subgroup: {
      type: String,
      trim: true,
    },
    critical_skills: [{
      type: String,
      trim: true,
    }],
  },
  skills: {
    type: [skillSchema],
    validate: {
      validator: function (v) {
        return v.length <= 15;
      },
      message: 'Maximum 15 skills allowed per employee',
    },
  },
  experience: {
    years: {
      type: Number,
      required: true,
      min: 0,
      max: 50,
    },
    domain: {
      type: String,
      trim: true,
    },
  },
  location: {
    type: String,
    trim: true,
  },
  training_history: [trainingHistorySchema],
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

// Update updatedAt before saving
employeeSchema.pre('save', function (next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('Employee', employeeSchema);

