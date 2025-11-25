// TrainingHistory model for tracking completed training records
// Stores detailed information about employee training completions

const mongoose = require('mongoose');

const trainingHistorySchema = new mongoose.Schema({
  employee_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee',
    required: true,
  },
  course_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course',
    required: true,
  },
  start_date: {
    type: Date,
    default: Date.now,
  },
  completion_date: {
    type: Date,
  },
  assessment_score: {
    type: Number,
    min: 0,
    max: 100,
  },
  status: {
    type: String,
    enum: ['Not Started', 'In Progress', 'Completed', 'Failed'],
    default: 'Not Started',
  },
  progress: {
    type: Number,
    min: 0,
    max: 100,
    default: 0,
  },
  feedback: {
    type: String,
    trim: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

// Update timestamp on save
trainingHistorySchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Index for efficient queries
trainingHistorySchema.index({ employee_id: 1, completion_date: -1 });
trainingHistorySchema.index({ course_id: 1 });
trainingHistorySchema.index({ status: 1 });

module.exports = mongoose.model('TrainingHistory', trainingHistorySchema);

