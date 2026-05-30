const SavingsGoal = require('../models/SavingsGoal');

// @desc    Get all savings goals
// @route   GET /api/savings
// @access  Private
const getGoals = async (req, res) => {
  try {
    const goals = await SavingsGoal.find({ userId: req.user.id }).sort({ createdAt: -1 });
    res.status(200).json(goals);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Create a savings goal
// @route   POST /api/savings
// @access  Private
const createGoal = async (req, res) => {
  const { name, targetAmount, currentAmount, deadline } = req.body;

  if (!name || !targetAmount) {
    return res.status(400).json({ message: 'Name and target amount are required' });
  }

  if (typeof targetAmount !== 'number' || targetAmount <= 0) {
    return res.status(400).json({ message: 'Target amount must be a positive number' });
  }

  try {
    const goal = await SavingsGoal.create({
      userId: req.user.id,
      name: name.trim(),
      targetAmount,
      currentAmount: currentAmount || 0,
      deadline: deadline || null,
    });

    res.status(201).json(goal);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update a savings goal (add savings or edit details)
// @route   PUT /api/savings/:id
// @access  Private
const updateGoal = async (req, res) => {
  const { name, targetAmount, currentAmount, addAmount, deadline } = req.body;

  try {
    const goal = await SavingsGoal.findOne({ _id: req.params.id, userId: req.user.id });

    if (!goal) {
      return res.status(404).json({ message: 'Savings goal not found' });
    }

    if (name) goal.name = name.trim();
    if (typeof targetAmount === 'number' && targetAmount > 0) goal.targetAmount = targetAmount;
    if (typeof currentAmount === 'number' && currentAmount >= 0) goal.currentAmount = currentAmount;
    if (typeof addAmount === 'number' && addAmount > 0) goal.currentAmount += addAmount;
    if (deadline !== undefined) goal.deadline = deadline;

    const updatedGoal = await goal.save();
    res.status(200).json(updatedGoal);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Delete a savings goal
// @route   DELETE /api/savings/:id
// @access  Private
const deleteGoal = async (req, res) => {
  try {
    const goal = await SavingsGoal.findOne({ _id: req.params.id, userId: req.user.id });

    if (!goal) {
      return res.status(404).json({ message: 'Savings goal not found' });
    }

    await goal.deleteOne();
    res.status(200).json({ message: 'Savings goal removed', id: req.params.id });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getGoals,
  createGoal,
  updateGoal,
  deleteGoal,
};
