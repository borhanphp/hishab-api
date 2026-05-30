const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const UserSchema = new mongoose.Schema({
  username: {
    type: String,
    required: [true, 'Please add a username'],
    trim: true,
  },
  email: {
    type: String,
    required: [true, 'Please add an email'],
    unique: true,
    match: [
      /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
      'Please add a valid email',
    ],
  },
  password: {
    type: String,
    required: [true, 'Please add a password'],
    minlength: 6,
    select: false, // Don't return password by default in queries
  },
  currency: {
    type: String,
    default: '$',
  },
  profilePhoto: {
    type: String,
    default: 'https://api.dicebear.com/7.x/bottts/svg?seed=Hishab',
  },
  monthlyLoanTarget: {
    type: Number,
    default: 0,
  },
  financialGoal: {
    type: String,
    enum: ['general', 'debt-free', 'savings', 'investing'],
    default: 'general',
  },
  monthlyBudget: {
    type: Number,
    default: 0,
  },
  enableNotifications: {
    type: Boolean,
    default: true,
  },
}, {
  timestamps: true,
});

// Encrypt password using bcrypt
UserSchema.pre('save', async function (next) {
  if (!this.isModified('password')) {
    next();
  }
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

// Match user entered password to hashed password in database
UserSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model('User', UserSchema);
