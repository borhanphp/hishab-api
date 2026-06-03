const express = require('express');
const router = express.Router();
const { getRecommendations, trackAffiliateClick, checkLoanEligibility } = require('../controllers/marketplaceController');
const { protect } = require('../middleware/auth');

router.get('/recommendations', protect, getRecommendations);
router.post('/click', protect, trackAffiliateClick);
router.post('/check-eligibility', protect, checkLoanEligibility);

module.exports = router;
