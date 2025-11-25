// Dashboard routes
// Defines routes for dashboard statistics and analytics

const express = require('express');
const router = express.Router();
const { getStats, getRecentActivities, getMLMetrics } = require('../controllers/dashboardController');
const { protect } = require('../middleware/auth');

// All dashboard routes require authentication
router.use(protect);

// @route   GET /api/dashboard/stats
// @desc    Get dashboard statistics
// @access  Private
router.get('/stats', getStats);

// @route   GET /api/dashboard/recent-activities
// @desc    Get recent activities
// @access  Private
router.get('/recent-activities', getRecentActivities);

// @route   GET /api/dashboard/ml-metrics
// @desc    Get ML model performance metrics
// @access  Private
router.get('/ml-metrics', getMLMetrics);

module.exports = router;

