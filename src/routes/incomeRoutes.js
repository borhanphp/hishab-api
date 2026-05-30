const express = require('express');
const router = express.Router();
const { getIncome, saveIncome } = require('../controllers/incomeController');
const { protect } = require('../middleware/auth');

router.route('/')
  .post(protect, saveIncome);

router.route('/:month')
  .get(protect, getIncome);

module.exports = router;
