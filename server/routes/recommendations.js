// Recommendation routes
// Handles ML recommendation generation and management

const express = require('express');
const router = express.Router();
const {
  getEmployeeRecommendations,
  getAllRecommendations,
  generateRecommendations,
  updateRecommendation,
  batchGenerateRecommendations,
} = require('../controllers/recommendationController');
const { protect, authorize } = require('../middleware/auth');

// All routes require authentication
router.use(protect);

router.get('/', getAllRecommendations);
router.get('/employee/:employeeId', getEmployeeRecommendations);
router.post('/generate/:employeeId', authorize('Admin', 'Manager'), generateRecommendations);
router.post('/batch-generate', authorize('Admin'), batchGenerateRecommendations);
router.put('/:id', authorize('Admin', 'Manager'), updateRecommendation);

module.exports = router;

