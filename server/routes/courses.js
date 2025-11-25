// Course routes
// Handles all course-related API endpoints

const express = require('express');
const router = express.Router();
const {
  getCourses,
  getCourse,
  createCourse,
  updateCourse,
  deleteCourse,
} = require('../controllers/courseController');
const { protect, authorize } = require('../middleware/auth');
const { validateCourse, validateCourseUpdate } = require('../middleware/validation');

// All routes require authentication
router.use(protect);

// CRUD operations
router.route('/')
  .get(getCourses)
  .post(authorize('Admin', 'Manager'), validateCourse, createCourse);

router.route('/:id')
  .get(getCourse)
  .put(authorize('Admin', 'Manager'), validateCourseUpdate, updateCourse)
  .delete(authorize('Admin'), deleteCourse);

module.exports = router;

