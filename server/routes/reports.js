// Report routes
// Handles report generation and export functionality

const express = require('express');
const router = express.Router();
const {
  getParticipationReport,
  getSkillGapReport,
  getCompletionReport,
  exportPDF,
  exportCSV,
} = require('../controllers/reportController');
const { protect, authorize } = require('../middleware/auth');

// All routes require authentication
router.use(protect);

// Report endpoints
router.get('/participation', getParticipationReport);
router.get('/skill-gaps', getSkillGapReport);
router.get('/completion', getCompletionReport);

// Export endpoints
router.get('/export/pdf', authorize('Admin', 'Manager'), exportPDF);
router.get('/export/csv', authorize('Admin', 'Manager'), exportCSV);

module.exports = router;

