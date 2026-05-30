const Group = require('../models/Group');
const User = require('../models/User');

// @desc    Create a new group workspace
// @route   POST /api/groups
// @access  Private
const createGroup = async (req, res) => {
  const { name, memberEmails } = req.body;

  if (!name) {
    return res.status(400).json({ message: 'Group name is required' });
  }

  try {
    const members = [req.user.id]; // Creator is always a member

    if (memberEmails && Array.isArray(memberEmails)) {
      for (const email of memberEmails) {
        if (email.trim() === req.user.email) continue; // Skip creator email
        const user = await User.findOne({ email: email.trim().toLowerCase() });
        if (!user) {
          return res.status(404).json({ message: `User with email ${email} not found` });
        }
        if (!members.includes(user.id)) {
          members.push(user.id);
        }
      }
    }

    const group = await Group.create({
      name,
      creator: req.user.id,
      members,
    });

    const populatedGroup = await Group.findById(group.id).populate('members', 'username email');
    res.status(201).json(populatedGroup);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Invite a user to a group by email
// @route   POST /api/groups/:id/invite
// @access  Private
const inviteMember = async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ message: 'Email is required' });
  }

  try {
    const group = await Group.findById(req.params.id);
    if (!group) {
      return res.status(404).json({ message: 'Group workspace not found' });
    }

    // Verify req.user is a member
    if (!group.members.includes(req.user.id)) {
      return res.status(403).json({ message: 'Not authorized to invite to this group' });
    }

    const user = await User.findOne({ email: email.trim().toLowerCase() });
    if (!user) {
      return res.status(404).json({ message: 'User not found with this email' });
    }

    if (group.members.includes(user.id)) {
      return res.status(400).json({ message: 'User is already a member of this group' });
    }

    group.members.push(user.id);
    await group.save();

    const populatedGroup = await Group.findById(group.id).populate('members', 'username email');
    res.status(200).json(populatedGroup);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get user's groups
// @route   GET /api/groups
// @access  Private
const getGroups = async (req, res) => {
  try {
    const groups = await Group.find({ members: req.user.id })
      .populate('members', 'username email')
      .populate('sharedExpenses.paidBy', 'username email')
      .sort({ updatedAt: -1 });

    res.status(200).json(groups);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Add a shared expense to split
// @route   POST /api/groups/:id/expenses
// @access  Private
const addSharedExpense = async (req, res) => {
  const { title, amount } = req.body;

  if (!title || !amount || amount <= 0) {
    return res.status(400).json({ message: 'Title and positive amount are required' });
  }

  try {
    const group = await Group.findById(req.params.id);
    if (!group) {
      return res.status(404).json({ message: 'Group workspace not found' });
    }

    if (!group.members.includes(req.user.id)) {
      return res.status(403).json({ message: 'Not authorized to post to this group' });
    }

    const membersCount = group.members.length;
    const splitAmount = parseFloat((amount / membersCount).toFixed(2));

    // Create splits (everyone gets splitAmount)
    const splits = group.members.map(memberId => ({
      userId: memberId,
      amount: splitAmount,
    }));

    const newExpense = {
      title,
      amount,
      paidBy: req.user.id,
      splits,
      date: new Date(),
    };

    group.sharedExpenses.push(newExpense);
    await group.save();

    const updatedGroup = await Group.findById(group.id)
      .populate('members', 'username email')
      .populate('sharedExpenses.paidBy', 'username email');

    res.status(200).json(updatedGroup);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get group details & balance summary (ledger simplified debts)
// @route   GET /api/groups/:id/expenses
// @access  Private
const getGroupExpensesAndLedger = async (req, res) => {
  try {
    const group = await Group.findById(req.params.id)
      .populate('members', 'username email')
      .populate('sharedExpenses.paidBy', 'username email')
      .populate('sharedExpenses.splits.userId', 'username email');

    if (!group) {
      return res.status(404).json({ message: 'Group workspace not found' });
    }

    const isMember = group.members.some(
      (m) => m._id.toString() === req.user.id.toString()
    );

    if (!isMember) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    // Map user id -> User object for easy reference
    const userMap = {};
    group.members.forEach(m => {
      userMap[m._id.toString()] = m;
    });

    // Initialize balances: user_id -> net_balance
    // Positive means they are owed money, negative means they owe money
    const netBalances = {};
    group.members.forEach(m => {
      netBalances[m._id.toString()] = 0;
    });

    // Compute balances
    group.sharedExpenses.forEach(exp => {
      const payerId = exp.paidBy._id.toString();
      
      // Credit the payer
      if (netBalances[payerId] !== undefined) {
        netBalances[payerId] += exp.amount;
      }

      // Debit everyone according to split
      exp.splits.forEach(split => {
        const splitUserId = split.userId._id.toString();
        if (netBalances[splitUserId] !== undefined) {
          netBalances[splitUserId] -= split.amount;
        }
      });
    });

    // Simplify balances into transactions (Splitwise algorithm)
    const participants = Object.keys(netBalances).map(id => ({
      id,
      netAmount: parseFloat(netBalances[id].toFixed(2)),
      username: userMap[id]?.username || 'Unknown',
    }));

    const simplifiedDebts = [];
    
    // Sort into debtors (negative) and creditors (positive)
    const debtors = participants.filter(p => p.netAmount < -0.01).sort((a, b) => a.netAmount - b.netAmount);
    const creditors = participants.filter(p => p.netAmount > 0.01).sort((a, b) => b.netAmount - a.netAmount);

    let dIdx = 0;
    let cIdx = 0;

    while (dIdx < debtors.length && cIdx < creditors.length) {
      const debtor = debtors[dIdx];
      const creditor = creditors[cIdx];

      const amountToPay = Math.min(Math.abs(debtor.netAmount), creditor.netAmount);

      simplifiedDebts.push({
        fromId: debtor.id,
        fromName: debtor.username,
        toId: creditor.id,
        toName: creditor.username,
        amount: parseFloat(amountToPay.toFixed(2)),
      });

      debtor.netAmount += amountToPay;
      creditor.netAmount -= amountToPay;

      if (Math.abs(debtor.netAmount) < 0.01) {
        dIdx++;
      }
      if (Math.abs(creditor.netAmount) < 0.01) {
        cIdx++;
      }
    }

    res.status(200).json({
      groupName: group.name,
      members: group.members,
      expenses: group.sharedExpenses,
      netBalances: Object.keys(netBalances).map(id => ({
        userId: id,
        username: userMap[id]?.username || 'Unknown',
        email: userMap[id]?.email || '',
        balance: parseFloat(netBalances[id].toFixed(2)),
      })),
      simplifiedDebts,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  createGroup,
  inviteMember,
  getGroups,
  addSharedExpense,
  getGroupExpensesAndLedger,
};
