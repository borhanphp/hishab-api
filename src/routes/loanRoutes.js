const express = require('express');
const router = express.Router();
const { getLoans, addLoan, settleLoan, deleteLoan } = require('../controllers/loanController');
const { protect } = require('../middleware/auth');

router.route('/')
  .get(protect, getLoans)
  .post(protect, addLoan);

router.route('/:id/settle')
  .put(protect, settleLoan);

router.route('/:id')
  .delete(protect, deleteLoan);

module.exports = router;
