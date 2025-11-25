// Employee routes
// Handles all employee-related API endpoints

const express = require('express');
const router = express.Router();
const {
  getEmployees,
  getEmployee,
  createEmployee,
  updateEmployee,
  deleteEmployee,
} = require('../controllers/employeeController');
const { protect, authorize } = require('../middleware/auth');
const { uploadCSV, parseCSV } = require('../controllers/csvController');
const { validateEmployee } = require('../middleware/validation');

// All routes require authentication
router.use(protect);

// CRUD operations
router.route('/')
  .get(getEmployees)
  .post(authorize('Admin', 'Manager'), validateEmployee, createEmployee);

router.route('/:id')
  .get(getEmployee)
  .put(authorize('Admin', 'Manager'), updateEmployee)
  .delete(authorize('Admin'), deleteEmployee);

// CSV upload route
router.post('/upload', authorize('Admin', 'Manager'), uploadCSV, parseCSV);

module.exports = router;

