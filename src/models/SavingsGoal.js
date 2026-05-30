const mongoose = require('mongoose');

const SavingsGoalSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  name: {
    type: String,
    required: [true, 'Please add a goal name'],
    trim: true,
  },
  targetAmount: {
    type: Number,
    required: [true, 'Please add a target amount'],
    min: 1,
  },
  currentAmount: {
    type: Number,
    default: 0,
    min: 0,
  },
  deadline: {
    type: Date,
    default: null,
  },
  isCompleted: {
    type: Boolean,
    default: false,
  },
}, {
  timestamps: true,
});

// Auto-mark as completed if currentAmount >= targetAmount
SavingsGoalSchema.pre('save', function (next) {
  if (this.currentAmount >= this.targetAmount) {
    this.isCompleted = true;
  }
  next();
});

module.exports = mongoose.model('SavingsGoal', SavingsGoalSchema);
