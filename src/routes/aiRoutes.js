const express = require('express');
const router = express.Router();
const {
  getAICoachResponse,
  scanReceiptImage,
  getAICoachTips,
  parseTextCommand,
  parseVoiceCommand,
  categorizeTitle,
} = require('../controllers/aiController');
const { protect } = require('../middleware/auth');

router.post('/chat', protect, getAICoachResponse);
router.post('/scan', protect, scanReceiptImage);
router.get('/tips', protect, getAICoachTips);
router.post('/parse-text', protect, parseTextCommand);
router.post('/parse-voice', protect, parseVoiceCommand);
router.post('/categorize', protect, categorizeTitle);

module.exports = router;
