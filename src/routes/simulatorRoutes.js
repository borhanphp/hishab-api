const express = require('express');
const router = express.Router();
const { getAssets, tradeAsset, getPortfolio, simulateMarketEvent } = require('../controllers/simulatorController');
const { protect } = require('../middleware/auth');

router.get('/assets', protect, getAssets);
router.post('/trade', protect, tradeAsset);
router.get('/portfolio', protect, getPortfolio);
router.post('/simulate-step', protect, simulateMarketEvent);

module.exports = router;
