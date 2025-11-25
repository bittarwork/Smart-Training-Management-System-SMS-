// Course model for training course catalog
// Stores course information including prerequisites and delivery mode

const mongoose = require('mongoose');

const courseSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Course title is required'],
    trim: true,
  },
  description: {
    type: String,
    trim: true,
  },
  department: {
    type: String,
    required: [true, 'Department is required'],
    trim: true,
  },
  prerequisites: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course',
  }],
  delivery_mode: {
    type: String,
    enum: ['Online', 'In-Person', 'Hybrid'],
    required: true,
  },
  duration: {
    type: Number,
    required: true,
    min: 1,
  },
  max_participants: {
    type: Number,
    min: 1,
  },
  required_skills: [{
    type: String,
    trim: true,
  }],
  target_experience_level: {
    type: String,
    enum: ['Beginner', 'Intermediate', 'Advanced', 'Expert'],
  },
  isActive: {
    type: Boolean,
    default: true,
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

// Update updatedAt before saving
courseSchema.pre('save', function (next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('Course', courseSchema);

