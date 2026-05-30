const express = require('express');
const router = express.Router();
const {
  createGroup,
  inviteMember,
  getGroups,
  addSharedExpense,
  getGroupExpensesAndLedger,
} = require('../controllers/groupController');
const { protect } = require('../middleware/auth');

router.route('/')
  .post(protect, createGroup)
  .get(protect, getGroups);

router.route('/:id/invite')
  .post(protect, inviteMember);

router.route('/:id/expenses')
  .post(protect, addSharedExpense)
  .get(protect, getGroupExpensesAndLedger);

module.exports = router;
