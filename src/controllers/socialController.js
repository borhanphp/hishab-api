const FriendGroup = require('../models/FriendGroup');
const UserChallenge = require('../models/UserChallenge');
const User = require('../models/User');
const Income = require('../models/Income');
const Expense = require('../models/Expense');
const SavingsGoal = require('../models/SavingsGoal');
const Loan = require('../models/Loan');

// Templates for savings challenges
const CHALLENGE_TEMPLATES = [
  {
    type: 'coffee',
    name: '☕ No Coffee Challenge',
    desc: 'Skip buying premium coffee and brew at home. Save $5/day.',
    targetAmount: 150,
    durationDays: 30,
    dailyTarget: 5
  },
  {
    type: '30day',
    name: '💰 30 Day Savings Challenge',
    desc: 'Commit to building a savings buffer this month. Save $10/day.',
    targetAmount: 300,
    durationDays: 30,
    dailyTarget: 10
  },
  {
    type: 'fastfood',
    name: '🍔 Cook at Home Challenge',
    desc: 'Avoid restaurant deliveries and cook meals at home. Save $15/day.',
    targetAmount: 210,
    durationDays: 14,
    dailyTarget: 15
  },
  {
    type: 'detox',
    name: '📱 Digital Buy Detox',
    desc: 'Avoid online shopping impulse buys and subscriptions this week.',
    targetAmount: 50,
    durationDays: 7,
    dailyTarget: null
  }
];

// Helper to calculate User's Financial Health Score (1-100)
const calculateUserHealthScore = async (userId) => {
  try {
    const user = await User.findById(userId);
    if (!user) return 50;

    const d = new Date();
    const currentMonth = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;

    const [incomeRecord, expensesList, savingsGoals, loans] = await Promise.all([
      Income.findOne({ userId, month: currentMonth }),
      Expense.find({ userId, month: currentMonth }),
      SavingsGoal.find({ userId }),
      Loan.find({ userId, isSettled: false })
    ]);

    const monthlyIncome = incomeRecord ? incomeRecord.totalIncome : 0;
    const monthlyExpenses = expensesList.reduce((sum, e) => sum + e.amount, 0);
    const totalSavings = savingsGoals.reduce((sum, g) => sum + g.currentAmount, 0);
    const totalBorrowed = loans.filter(l => l.type === 'borrowed').reduce((sum, l) => {
      const paymentsTotal = l.payments ? l.payments.reduce((s, p) => s + p.amount, 0) : 0;
      return sum + (l.amount - paymentsTotal);
    }, 0);

    // Savings Rate (Max 40)
    let savingsRateScore = 0;
    const savingsRate = monthlyIncome > 0 ? (monthlyIncome - monthlyExpenses) / monthlyIncome : 0;
    if (savingsRate >= 0.3) {
      savingsRateScore = 40;
    } else if (savingsRate > 0) {
      savingsRateScore = Math.round((savingsRate / 0.3) * 40);
    }

    // Emergency Fund (Max 30)
    let emergencyFundScore = 0;
    const monthlyExpensesBenchmark = monthlyExpenses > 0 ? monthlyExpenses : 1200;
    const monthsCovered = totalSavings / monthlyExpensesBenchmark;
    if (monthsCovered >= 3) {
      emergencyFundScore = 30;
    } else if (monthsCovered > 0) {
      emergencyFundScore = Math.round((monthsCovered / 3) * 30);
    }

    // Debt Ratio (Max 20)
    let debtRatioScore = 20;
    if (totalBorrowed > 0) {
      const incomeBenchmark = monthlyIncome > 0 ? monthlyIncome : 2500;
      const debtRatio = totalBorrowed / incomeBenchmark;
      if (debtRatio >= 1.0) {
        debtRatioScore = 0;
      } else {
        debtRatioScore = Math.round((1 - debtRatio) * 20);
      }
    }

    // Budget Adherence (Max 10)
    let budgetAdherenceScore = 10;
    if (user.monthlyBudget > 0 && monthlyExpenses > 0) {
      if (monthlyExpenses <= user.monthlyBudget) {
        budgetAdherenceScore = 10;
      } else {
        const overspentRatio = (monthlyExpenses - user.monthlyBudget) / user.monthlyBudget;
        budgetAdherenceScore = Math.max(0, Math.round(10 - (overspentRatio * 10)));
      }
    }

    return Math.min(100, Math.max(1, savingsRateScore + emergencyFundScore + debtRatioScore + budgetAdherenceScore));
  } catch (err) {
    return 50;
  }
};

// Helper to calculate User's consecutive savings streak months
const calculateUserSavingsStreak = async (userId) => {
  try {
    const incomes = await Income.find({ userId });
    const expenses = await Expense.find({ userId });

    const monthlyData = {};
    incomes.forEach(inc => {
      monthlyData[inc.month] = { income: inc.totalIncome, expenses: 0 };
    });
    expenses.forEach(exp => {
      if (!monthlyData[exp.month]) {
        monthlyData[exp.month] = { income: 0, expenses: 0 };
      }
      monthlyData[exp.month].expenses += exp.amount;
    });

    const sortedMonths = Object.keys(monthlyData).sort((a, b) => b.localeCompare(a));
    if (sortedMonths.length === 0) return 0;

    let streak = 0;
    const today = new Date();
    const currentMonthStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
    const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    const lastMonthStr = `${lastMonth.getFullYear()}-${String(lastMonth.getMonth() + 1).padStart(2, '0')}`;

    // If no records in current or previous month, return 0 streak
    if (!monthlyData[currentMonthStr] && !monthlyData[lastMonthStr]) {
      return 0;
    }

    for (const month of sortedMonths) {
      const data = monthlyData[month];
      if (data.income > data.expenses) {
        streak++;
      } else {
        break;
      }
    }
    return streak;
  } catch (err) {
    return 0;
  }
};

// Helper to calculate User's Spending Control percentage (budget remaining or savings rate)
const calculateUserSpendingControl = async (userId, user) => {
  try {
    const d = new Date();
    const currentMonth = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const expensesList = await Expense.find({ userId, month: currentMonth });
    const monthlyExpenses = expensesList.reduce((sum, e) => sum + e.amount, 0);

    if (user.monthlyBudget > 0) {
      if (monthlyExpenses <= user.monthlyBudget) {
        return Math.round(((user.monthlyBudget - monthlyExpenses) / user.monthlyBudget) * 100);
      }
      return 0;
    } else {
      const incomeRecord = await Income.findOne({ userId, month: currentMonth });
      const monthlyIncome = incomeRecord ? incomeRecord.totalIncome : 0;
      if (monthlyIncome > 0) {
        return Math.max(0, Math.round(((monthlyIncome - monthlyExpenses) / monthlyIncome) * 100));
      }
      return 50;
    }
  } catch (err) {
    return 50;
  }
};

// ==================== FRIEND GROUPS ====================

// @desc    Create a new Friend Group
// @route   POST /api/social/groups
// @access  Private
const createFriendGroup = async (req, res) => {
  const { name } = req.body;
  if (!name) {
    return res.status(400).json({ message: 'Group name is required' });
  }

  try {
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const inviteCode = `HISH-${randomSuffix}`;

    const group = await FriendGroup.create({
      name: name.trim(),
      creator: req.user.id,
      members: [req.user.id],
      inviteCode,
    });

    const populated = await FriendGroup.findById(group._id).populate('members', 'username email profilePhoto');
    res.status(201).json(populated);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get user's Friend Groups
// @route   GET /api/social/groups
// @access  Private
const getFriendGroups = async (req, res) => {
  try {
    const groups = await FriendGroup.find({ members: req.user.id })
      .populate('members', 'username email profilePhoto')
      .sort({ createdAt: -1 });
    res.status(200).json(groups);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Join a Friend Group via Invite Code
// @route   POST /api/social/groups/join
// @access  Private
const joinFriendGroup = async (req, res) => {
  const { inviteCode } = req.body;
  if (!inviteCode) {
    return res.status(400).json({ message: 'Invite code is required' });
  }

  try {
    const group = await FriendGroup.findOne({ inviteCode: inviteCode.trim().toUpperCase() });
    if (!group) {
      return res.status(404).json({ message: 'Friend group not found' });
    }

    if (group.members.includes(req.user.id)) {
      return res.status(400).json({ message: 'You are already a member of this group' });
    }

    group.members.push(req.user.id);
    await group.save();

    const populated = await FriendGroup.findById(group._id).populate('members', 'username email profilePhoto');
    res.status(200).json(populated);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ==================== SOCIAL LEADERBOARD ====================

// @desc    Get Leaderboard for a Friend Group
// @route   GET /api/social/groups/:id/leaderboard
// @access  Private
const getLeaderboard = async (req, res) => {
  try {
    const group = await FriendGroup.findById(req.params.id);
    if (!group) {
      return res.status(404).json({ message: 'Group not found' });
    }

    if (!group.members.includes(req.user.id)) {
      return res.status(403).json({ message: 'Not authorized to view this group leaderboard' });
    }

    const leaderboard = [];

    for (const memberId of group.members) {
      const user = await User.findById(memberId);
      if (!user) continue;

      const [healthScore, savingsStreak, spendingControl, publicGoals] = await Promise.all([
        calculateUserHealthScore(memberId),
        calculateUserSavingsStreak(memberId),
        calculateUserSpendingControl(memberId, user),
        SavingsGoal.find({ userId: memberId, isPublic: true })
      ]);

      leaderboard.push({
        userId: user._id,
        username: user.username,
        email: user.email,
        profilePhoto: user.profilePhoto || 'https://api.dicebear.com/7.x/bottts/svg?seed=' + user.username,
        healthScore,
        savingsStreak,
        spendingControl,
        publicGoals: publicGoals.map(g => ({
          _id: g._id,
          name: g.name,
          targetAmount: g.targetAmount,
          currentAmount: g.currentAmount,
          percent: g.targetAmount > 0 ? Math.round((g.currentAmount / g.targetAmount) * 100) : 0,
          cheersCount: g.cheers ? g.cheers.length : 0,
          hasCheered: g.cheers ? g.cheers.includes(req.user.id) : false
        }))
      });
    }

    // Sort leaderboard primarily by Health Score descending, then streak descending
    leaderboard.sort((a, b) => b.healthScore - a.healthScore || b.savingsStreak - a.savingsStreak);

    res.status(200).json({
      groupName: group.name,
      leaderboard
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ==================== SAVINGS CHALLENGES ====================

// @desc    Get Templates and user joined active challenges
// @route   GET /api/social/challenges
// @access  Private
const getChallenges = async (req, res) => {
  try {
    const active = await UserChallenge.find({ userId: req.user.id }).sort({ createdAt: -1 });
    res.status(200).json({
      templates: CHALLENGE_TEMPLATES,
      active
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Join a new Savings Challenge
// @route   POST /api/social/challenges/join
// @access  Private
const joinChallenge = async (req, res) => {
  const { type } = req.body;
  if (!type) {
    return res.status(400).json({ message: 'Challenge type is required' });
  }

  const template = CHALLENGE_TEMPLATES.find(t => t.type === type);
  if (!template) {
    return res.status(400).json({ message: 'Invalid challenge type' });
  }

  try {
    // Check if already active and not completed
    const existing = await UserChallenge.findOne({ userId: req.user.id, type, isCompleted: false });
    if (existing) {
      return res.status(400).json({ message: 'You already have an active challenge of this type' });
    }

    const durationDays = template.durationDays;
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + durationDays);

    const challenge = await UserChallenge.create({
      userId: req.user.id,
      name: template.name,
      type,
      targetAmount: template.targetAmount,
      currentAmount: 0,
      startDate: new Date(),
      endDate,
    });

    res.status(201).json(challenge);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Log savings progress on a challenge
// @route   POST /api/social/challenges/:id/log
// @access  Private
const logChallengeSavings = async (req, res) => {
  const { amount } = req.body;
  const parsedAmt = parseFloat(amount);

  if (isNaN(parsedAmt) || parsedAmt <= 0) {
    return res.status(400).json({ message: 'Amount must be a positive number' });
  }

  try {
    const challenge = await UserChallenge.findById(req.params.id);
    if (!challenge) {
      return res.status(404).json({ message: 'Challenge not found' });
    }

    if (challenge.userId.toString() !== req.user.id.toString()) {
      return res.status(403).json({ message: 'Not authorized to log to this challenge' });
    }

    if (challenge.isCompleted) {
      return res.status(400).json({ message: 'Challenge is already completed!' });
    }

    const now = new Date();
    
    // Calculate Streak
    let newStreak = challenge.streakDays || 0;
    if (challenge.lastLoggedDate) {
      const lastDate = new Date(challenge.lastLoggedDate);
      const diffTime = Math.abs(now.setHours(0,0,0,0) - lastDate.setHours(0,0,0,0));
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      if (diffDays === 1) {
        newStreak += 1;
      } else if (diffDays > 1) {
        newStreak = 1; // streak reset
      }
    } else {
      newStreak = 1; // first log
    }

    challenge.currentAmount = parseFloat((challenge.currentAmount + parsedAmt).toFixed(2));
    challenge.lastLoggedDate = new Date();
    challenge.streakDays = newStreak;

    challenge.logs.push({
      date: new Date(),
      amount: parsedAmt
    });

    if (challenge.currentAmount >= challenge.targetAmount) {
      challenge.isCompleted = true;
    }

    await challenge.save();
    res.status(200).json(challenge);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Delete/Quit a challenge
// @route   DELETE /api/social/challenges/:id
// @access  Private
const deleteChallenge = async (req, res) => {
  try {
    const challenge = await UserChallenge.findById(req.params.id);
    if (!challenge) {
      return res.status(404).json({ message: 'Challenge not found' });
    }

    if (challenge.userId.toString() !== req.user.id.toString()) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    await challenge.deleteOne();
    res.status(200).json({ message: 'Challenge deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ==================== PUBLIC GOAL CHEERS ====================

// @desc    Cheer a friend's public savings goal
// @route   POST /api/social/goals/:goalId/cheer
// @access  Private
const cheerPublicGoal = async (req, res) => {
  try {
    const goal = await SavingsGoal.findById(req.params.goalId);
    if (!goal) {
      return res.status(404).json({ message: 'Savings goal not found' });
    }

    if (goal.userId.toString() === req.user.id.toString()) {
      return res.status(400).json({ message: 'You cannot cheer your own goal' });
    }

    // Ensure they are friends (in at least one common group)
    const commonGroup = await FriendGroup.findOne({
      members: { $all: [req.user.id, goal.userId] }
    });

    if (!commonGroup) {
      return res.status(403).json({ message: 'You must be in a friend group with this user to cheer their goal' });
    }

    if (!goal.cheers) {
      goal.cheers = [];
    }

    // Toggle cheer (like/unlike mechanism)
    const cheeredIndex = goal.cheers.indexOf(req.user.id);
    if (cheeredIndex > -1) {
      // Remove cheer
      goal.cheers.splice(cheeredIndex, 1);
      await goal.save();
      return res.status(200).json({ message: 'Goal uncheered successfully', cheered: false, count: goal.cheers.length });
    } else {
      // Add cheer
      goal.cheers.push(req.user.id);
      await goal.save();
      return res.status(200).json({ message: 'Goal cheered! 🎉', cheered: true, count: goal.cheers.length });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  createFriendGroup,
  getFriendGroups,
  joinFriendGroup,
  getLeaderboard,
  getChallenges,
  joinChallenge,
  logChallengeSavings,
  deleteChallenge,
  cheerPublicGoal,
};
