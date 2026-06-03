const mongoose = require('mongoose');

const ProductSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please add a product name'],
    trim: true,
  },
  provider: {
    type: String,
    required: [true, 'Please add a provider name'],
    trim: true,
  },
  type: {
    type: String,
    enum: ['savings', 'card', 'insurance', 'investment', 'loan'],
    required: [true, 'Please select a product type'],
  },
  details: {
    type: String,
    required: [true, 'Please add product details'],
  },
  rate: {
    type: String,
    required: [true, 'Please add a rate (e.g. 4.75% APY)'],
  },
  affiliateUrl: {
    type: String,
    required: [true, 'Please add an affiliate URL'],
  },
  icon: {
    type: String,
    default: '💰',
  },
}, {
  timestamps: true,
});

module.exports = mongoose.model('Product', ProductSchema);
