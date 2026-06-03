const jwt = require('jsonwebtoken');
const User = require('../models/User');
const nodemailer = require('nodemailer');

// Helper to generate JWT
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET || 'supersecretkey_hishab_123_456_789', {
    expiresIn: '30d',
  });
};

// @desc    Register new user
// @route   POST /api/auth/register
// @access  Public
const registerUser = async (req, res) => {
  const { username, email, password } = req.body;

  try {
    if (!username || !email || !password) {
      return res.status(400).json({ message: 'Please add all fields' });
    }

    // Check if user exists
    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ message: 'User already exists' });
    }

    // Create user
    const user = await User.create({
      username,
      email,
      password,
    });

    if (user) {
      res.status(201).json({
        _id: user.id,
        username: user.username,
        email: user.email,
        token: generateToken(user._id),
      });
    } else {
      res.status(400).json({ message: 'Invalid user data' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Authenticate a user
// @route   POST /api/auth/login
// @access  Public
const loginUser = async (req, res) => {
  const { email, password } = req.body;

  try {
    if (!email || !password) {
      return res.status(400).json({ message: 'Please add all fields' });
    }

    // Check for user email (explicitly selecting password since it is set to select: false)
    const user = await User.findOne({ email }).select('+password');

    if (user && (await user.matchPassword(password))) {
      res.json({
        _id: user.id,
        username: user.username,
        email: user.email,
        token: generateToken(user._id),
      });
    } else {
      res.status(401).json({ message: 'Invalid email or password' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get user data
// @route   GET /api/auth/me
// @access  Private
const getMe = async (req, res) => {
  try {
    res.status(200).json(req.user);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update user profile details
// @route   PUT /api/auth/profile
// @access  Private
const updateProfile = async (req, res) => {
  const { username, currency, profilePhoto, monthlyLoanTarget, financialGoal, monthlyBudget, enableNotifications } = req.body;

  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (username) user.username = username;
    if (currency) user.currency = currency;
    if (profilePhoto) user.profilePhoto = profilePhoto;
    if (typeof monthlyLoanTarget === 'number') user.monthlyLoanTarget = monthlyLoanTarget;
    if (financialGoal) user.financialGoal = financialGoal;
    if (typeof monthlyBudget === 'number') user.monthlyBudget = monthlyBudget;
    if (typeof enableNotifications === 'boolean') user.enableNotifications = enableNotifications;

    const updatedUser = await user.save();
    
    res.status(200).json({
      _id: updatedUser._id,
      username: updatedUser.username,
      email: updatedUser.email,
      currency: updatedUser.currency,
      profilePhoto: updatedUser.profilePhoto,
      monthlyLoanTarget: updatedUser.monthlyLoanTarget,
      financialGoal: updatedUser.financialGoal,
      monthlyBudget: updatedUser.monthlyBudget,
      enableNotifications: updatedUser.enableNotifications,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Change user password
// @route   PUT /api/auth/password
// @access  Private
const updatePassword = async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  try {
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: 'Please provide current and new password' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ message: 'New password must be at least 6 characters' });
    }

    const user = await User.findById(req.user.id).select('+password');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Verify current password
    const isMatch = await user.matchPassword(currentPassword);
    if (!isMatch) {
      return res.status(400).json({ message: 'Incorrect current password' });
    }

    // Save new password (pre-save hook will encrypt it)
    user.password = newPassword;
    await user.save();

    res.status(200).json({ message: 'Password updated successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};


// @desc    Forgot password - generate reset token
// @route   POST /api/auth/forgot-password
// @access  Public
const forgotPassword = async (req, res) => {
  const { email } = req.body;

  try {
    if (!email) {
      return res.status(400).json({ message: 'Please provide an email' });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: 'No user found with that email' });
    }

    // Generate random 6-digit numeric token
    const resetToken = Math.floor(100000 + Math.random() * 900000).toString();

    // Set token and expiry on user schema
    user.resetPasswordToken = resetToken;
    user.resetPasswordExpire = Date.now() + 10 * 60 * 1000; // 10 minutes

    await user.save();

    // Check if SMTP environment variables are configured
    const isSmtpConfigured = process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS;

    if (isSmtpConfigured) {
      try {
        const transporter = nodemailer.createTransport({
          host: process.env.SMTP_HOST,
          port: parseInt(process.env.SMTP_PORT) || 587,
          secure: process.env.SMTP_SECURE === 'true',
          auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS,
          },
        });

        const mailOptions = {
          from: process.env.FROM_EMAIL || '"Hishab Support" <noreply@hishab.com>',
          to: user.email,
          subject: 'Hishab Password Recovery Code',
          html: `
            <div style="font-family: sans-serif; background-color: #0a0d16; color: #f8fafc; padding: 30px; border-radius: 12px; max-width: 500px; margin: auto; border: 1px solid rgba(255, 255, 255, 0.08);">
              <h1 style="color: #6366f1; text-align: center; font-size: 28px; margin-bottom: 20px; letter-spacing: 2px;">Hishab</h1>
              <h3 style="color: #ffffff; text-align: center; margin-bottom: 20px;">Account Password Reset</h3>
              <p style="color: #94a3b8; font-size: 15px; line-height: 24px; text-align: center;">
                You requested a password reset. Please use the following 6-digit recovery code to reset your password:
              </p>
              <div style="background-color: rgba(255, 255, 255, 0.05); border: 1.5px solid rgba(255, 255, 255, 0.1); border-radius: 8px; padding: 15px; text-align: center; margin: 25px 0;">
                <span style="font-size: 32px; font-weight: bold; color: #38bdf8; letter-spacing: 6px; font-family: monospace;">${resetToken}</span>
              </div>
              <p style="color: #64748b; font-size: 13px; text-align: center; line-height: 18px;">
                This code is valid for 10 minutes. If you did not request this, please ignore this email.
              </p>
            </div>
          `,
        };

        await transporter.sendMail(mailOptions);
        console.log(`Password reset email sent to ${email}`);

        return res.status(200).json({
          message: 'Reset token sent to your email address',
          token: process.env.NODE_ENV === 'production' ? undefined : resetToken,
        });
      } catch (mailError) {
        console.error('SMTP Email sending failed:', mailError.message);
        // Fallback to console + response token for developer convenience if SMTP fails
        return res.status(200).json({
          message: 'Reset token generated (SMTP delivery failed, showing token)',
          token: resetToken,
        });
      }
    } else {
      // SMTP not configured - log and return token (default sandbox mode)
      console.log(`SMTP not configured. Password reset token for ${email}: ${resetToken}`);
      return res.status(200).json({
        message: 'Reset token generated (SMTP not configured, showing token)',
        token: resetToken,
      });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Reset password
// @route   PUT /api/auth/reset-password/:token
// @access  Public
const resetPassword = async (req, res) => {
  const { token } = req.params;
  const { password } = req.body;

  try {
    if (!password) {
      return res.status(400).json({ message: 'Please provide a new password' });
    }

    if (password.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters' });
    }

    // Find user by token and ensure token is not expired
    const user = await User.findOne({
      resetPasswordToken: token,
      resetPasswordExpire: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({ message: 'Invalid or expired reset token' });
    }

    // Set new password
    user.password = password;
    // Clear reset token and expiration
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;

    await user.save();

    res.status(200).json({ message: 'Password reset successful' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  registerUser,
  loginUser,
  getMe,
  updateProfile,
  updatePassword,
  forgotPassword,
  resetPassword,
};
