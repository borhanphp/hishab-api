const mongoose = require('mongoose');

const IncomeSourceSchema = new mongoose.Schema({
  sourceName: {
    type: String,
    required: true,
    trim: true,
  },
  amount: {
    type: Number,
    required: true,
    min: 0,
  },
  isFixed: {
    type: Boolean,
    default: false,
  },
  wallet: {
    type: String,
    enum: ['Cash', 'Bank', 'Card'],
    default: 'Cash',
  },
});

const IncomeSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  month: {
    type: String, // format: "YYYY-MM"
    required: true,
  },
  sources: [IncomeSourceSchema],
  totalIncome: {
    type: Number,
    default: 0,
  },
}, {
  timestamps: true,
});

// Compound index to ensure one income document per user per month
IncomeSchema.index({ userId: 1, month: 1 }, { unique: true });

// Auto-calculate totalIncome before saving
IncomeSchema.pre('save', function (next) {
  if (this.sources && this.sources.length > 0) {
    this.totalIncome = this.sources.reduce((sum, item) => sum + item.amount, 0);
  } else {
    this.totalIncome = 0;
  }
  next();
});

module.exports = mongoose.model('Income', IncomeSchema);
