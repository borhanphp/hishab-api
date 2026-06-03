const mongoose = require('mongoose');

const FriendGroupSchema = new mongoose.Schema({
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
  inviteCode: {
    type: String,
    required: true,
    unique: true,
  },
}, {
  timestamps: true,
});

module.exports = mongoose.model('FriendGroup', FriendGroupSchema);
