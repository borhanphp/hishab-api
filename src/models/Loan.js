const mongoose = require('mongoose');

const LoanSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  borrowerName: {
    type: String,
    required: [true, 'Please add borrower or lender name'],
    trim: true,
  },
  amount: {
    type: Number,
    required: [true, 'Please add a loan amount'],
    min: 0,
  },
  type: {
    type: String,
    enum: ['lent', 'borrowed'],
    default: 'lent', // Default to who gets money from me (lent)
  },
  isSettled: {
    type: Boolean,
    default: false,
  },
  date: {
    type: Date,
    default: Date.now,
  },
  settledDate: {
    type: Date,
  },
  payments: [{
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    date: {
      type: Date,
      default: Date.now,
    }
  }],
}, {
  timestamps: true,
});

module.exports = mongoose.model('Loan', LoanSchema);
