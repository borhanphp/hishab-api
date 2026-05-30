const express = require('express');
const router = express.Router();
const { getAICoachResponse, scanReceiptImage } = require('../controllers/aiController');
const { protect } = require('../middleware/auth');

router.post('/chat', protect, getAICoachResponse);
router.post('/scan', protect, scanReceiptImage);

module.exports = router;
