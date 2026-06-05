const express = require('express');
const router = express.Router();
const { getRecommendations, trackAffiliateClick, simulateAffordability } = require('../controllers/marketplaceController');
const { protect } = require('../middleware/auth');

router.get('/recommendations', protect, getRecommendations);
router.post('/click', protect, trackAffiliateClick);
router.post('/simulate-affordability', protect, simulateAffordability);

module.exports = router;
