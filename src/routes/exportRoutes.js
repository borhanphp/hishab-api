const express = require('express');
const router = express.Router();
const { exportMonthCSV } = require('../controllers/exportController');
const { protect } = require('../middleware/auth');

router.route('/:month')
  .get(protect, exportMonthCSV);

module.exports = router;
