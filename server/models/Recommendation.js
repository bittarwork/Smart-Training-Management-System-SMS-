// Recommendation model for storing ML-generated training recommendations
// Links employees to recommended courses with confidence scores

const mongoose = require('mongoose');

const recommendationSchema = new mongoose.Schema({
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
  confidence_score: {
    type: Number,
    required: true,
    min: 0,
    max: 1,
  },
  rank: {
    type: Number,
    required: true,
    min: 1,
    max: 3,
  },
  override_flag: {
    type: Boolean,
    default: false,
  },
  override_reason: {
    type: String,
    trim: true,
  },
  status: {
    type: String,
    enum: ['Pending', 'Accepted', 'Rejected', 'Completed'],
    default: 'Pending',
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  generated_at: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

// Index for efficient queries
recommendationSchema.index({ employee_id: 1, course_id: 1 });
recommendationSchema.index({ employee_id: 1, rank: 1 });

// Update updatedAt before saving
recommendationSchema.pre('save', function (next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('Recommendation', recommendationSchema);

