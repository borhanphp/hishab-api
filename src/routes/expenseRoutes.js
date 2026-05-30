const express = require('express');
const router = express.Router();
const { getExpenses, addExpenses, toggleExpense, deleteExpense, getCategoryBreakdown } = require('../controllers/expenseController');
const { protect } = require('../middleware/auth');

router.route('/')
  .post(protect, addExpenses);

router.route('/:month')
  .get(protect, getExpenses);

router.route('/:month/breakdown')
  .get(protect, getCategoryBreakdown);

router.route('/:id/toggle')
  .put(protect, toggleExpense);

router.route('/:id')
  .delete(protect, deleteExpense);

module.exports = router;
