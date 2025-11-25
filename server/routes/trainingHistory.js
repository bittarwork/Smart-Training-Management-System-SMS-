// Training History routes
// Defines routes for training history CRUD operations

const express = require('express');
const router = express.Router();
const {
  getAllTrainingHistory,
  getTrainingHistoryById,
  createTrainingHistory,
  updateTrainingHistory,
  deleteTrainingHistory,
  getTrainingStats,
} = require('../controllers/trainingHistoryController');
const { protect, authorize } = require('../middleware/auth');
const {
  validateTrainingHistoryCreate,
  validateTrainingHistoryUpdate,
} = require('../middleware/validation');

// All training history routes require authentication
router.use(protect);

// @route   GET /api/training-history/stats/overview
// @desc    Get training history statistics
// @access  Private
router.get('/stats/overview', getTrainingStats);

// @route   GET /api/training-history
// @desc    Get all training history records with filtering
// @access  Private
router.get('/', getAllTrainingHistory);

// @route   GET /api/training-history/:id
// @desc    Get single training history record
// @access  Private
router.get('/:id', getTrainingHistoryById);

// @route   POST /api/training-history
// @desc    Create new training history record
// @access  Private (Admin, Manager)
router.post('/', authorize('Admin', 'Manager'), validateTrainingHistoryCreate, createTrainingHistory);

// @route   PUT /api/training-history/:id
// @desc    Update training history record
// @access  Private (Admin, Manager)
router.put('/:id', authorize('Admin', 'Manager'), validateTrainingHistoryUpdate, updateTrainingHistory);

// @route   DELETE /api/training-history/:id
// @desc    Delete training history record
// @access  Private (Admin only)
router.delete('/:id', authorize('Admin'), deleteTrainingHistory);

module.exports = router;

