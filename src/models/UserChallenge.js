const mongoose = require('mongoose');

const UserChallengeSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  name: {
    type: String,
    required: [true, 'Please add a challenge name'],
  },
  type: {
    type: String,
    enum: ['coffee', '30day', 'fastfood', 'detox'],
    required: true,
  },
  targetAmount: {
    type: Number,
    required: [true, 'Please add a target amount'],
    min: 0.01,
  },
  currentAmount: {
    type: Number,
    default: 0,
    min: 0,
  },
  startDate: {
    type: Date,
    default: Date.now,
  },
  endDate: {
    type: Date,
    required: true,
  },
  streakDays: {
    type: Number,
    default: 0,
  },
  lastLoggedDate: {
    type: Date,
    default: null,
  },
  isCompleted: {
    type: Boolean,
    default: false,
  },
  logs: [{
    date: {
      type: Date,
      default: Date.now,
    },
    amount: {
      type: Number,
      required: true,
      min: 0.01,
    },
  }],
}, {
  timestamps: true,
});

module.exports = mongoose.model('UserChallenge', UserChallengeSchema);
