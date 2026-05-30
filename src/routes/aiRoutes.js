const express = require('express');
const router = express.Router();
const { getAICoachResponse, scanReceiptImage, getAICoachTips } = require('../controllers/aiController');
const { protect } = require('../middleware/auth');

router.post('/chat', protect, getAICoachResponse);
router.post('/scan', protect, scanReceiptImage);
router.get('/tips', protect, getAICoachTips);

module.exports = router;
