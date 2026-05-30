const mongoose = require('mongoose');

const ExpenseSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  month: {
    type: String, // format: "YYYY-MM"
    required: true,
  },
  title: {
    type: String,
    required: [true, 'Please add an expense title'],
    trim: true,
  },
  amount: {
    type: Number,
    required: [true, 'Please add an expense amount'],
    min: 0,
  },
  isCompleted: {
    type: Boolean,
    default: false,
  },
  isFixed: {
    type: Boolean,
    default: false,
  },
  category: {
    type: String,
    enum: ['Food', 'Transport', 'Rent', 'Utilities', 'Entertainment', 'Health', 'Shopping', 'Education', 'Other'],
    default: 'Other',
  },
}, {
  timestamps: true,
});

module.exports = mongoose.model('Expense', ExpenseSchema);
