const express = require('express');
const router = express.Router();
const { getHistory } = require('../controllers/dashboardController');
const { protect } = require('../middleware/auth');

router.get('/history', protect, getHistory);

module.exports = router;
