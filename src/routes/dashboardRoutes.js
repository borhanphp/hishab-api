const express = require('express');
const router = express.Router();
const { getHistory, getFinancialHealthScore, getWeeklyReview } = require('../controllers/dashboardController');
const { protect } = require('../middleware/auth');

router.get('/history', protect, getHistory);
router.get('/health-score', protect, getFinancialHealthScore);
router.get('/weekly-review', protect, getWeeklyReview);

module.exports = router;
