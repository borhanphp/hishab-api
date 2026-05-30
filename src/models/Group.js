const mongoose = require('mongoose');

const SplitSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  amount: {
    type: Number,
    required: true,
    min: 0,
  },
});

const SharedExpenseSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Please add a title for shared expense'],
    trim: true,
  },
  amount: {
    type: Number,
    required: [true, 'Please add a shared expense amount'],
    min: 0,
  },
  paidBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  splits: [SplitSchema],
  date: {
    type: Date,
    default: Date.now,
  },
});

const GroupSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please add a group name'],
    trim: true,
  },
  creator: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  members: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  }],
  sharedExpenses: [SharedExpenseSchema],
}, {
  timestamps: true,
});

module.exports = mongoose.model('Group', GroupSchema);
