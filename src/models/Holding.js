const mongoose = require('mongoose');

const HoldingSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  assetSymbol: {
    type: String,
    required: true,
  },
  assetName: {
    type: String,
    required: true,
  },
  assetType: {
    type: String,
    enum: ['stock', 'crypto', 'etf', 'bond'],
    required: true,
  },
  quantity: {
    type: Number,
    required: true,
    min: 0,
    default: 0,
  },
  averageBuyPrice: {
    type: Number,
    required: true,
    min: 0,
  },
}, {
  timestamps: true,
});

module.exports = mongoose.model('Holding', HoldingSchema);
