const Expense = require('../models/Expense');

// Helper to sync fixed expenses to already initialized future months
const syncFutureFixedExpenses = async (userId, month) => {
  try {
    // 1. Get all fixed expenses for the current month
    const currentFixedExpenses = await Expense.find({ userId, month, isFixed: true });

    // 2. Find all distinct future months that already have expenses recorded
    const futureMonths = await Expense.distinct('month', {
      userId,
      month: { $gt: month }
    });

    for (const fMonth of futureMonths) {
      // 3. Delete existing fixed expenses in the future month
      await Expense.deleteMany({ userId, month: fMonth, isFixed: true });

      // 4. Insert the current fixed expenses into the future month
      if (currentFixedExpenses.length > 0) {
        const expensesToInsert = currentFixedExpenses.map(exp => ({
          userId,
          month: fMonth,
          title: exp.title,
          amount: exp.amount,
          isFixed: true,
          isCompleted: false,
          category: exp.category || 'Other'
        }));
        await Expense.insertMany(expensesToInsert);
      }
    }
  } catch (error) {
    console.error('Error syncing future fixed expenses:', error.message);
  }
};

// @desc    Get all expenses for a specific month
// @route   GET /api/expenses/:month
// @access  Private
const getExpenses = async (req, res) => {
  const { month } = req.params;

  try {
    let expenses = await Expense.find({ userId: req.user.id, month }).sort({ createdAt: -1 });
    
    // If no expenses are found for this month, check for fixed expenses in the most recent recorded month
    if (expenses.length === 0) {
      const lastExpense = await Expense.findOne({
        userId: req.user.id,
        month: { $lt: month }
      }).sort({ month: -1 });

      if (lastExpense) {
        const previousMonthFixedExpenses = await Expense.find({
          userId: req.user.id,
          month: lastExpense.month,
          isFixed: true
        });

        if (previousMonthFixedExpenses.length > 0) {
          const expensesToCarryForward = previousMonthFixedExpenses.map(exp => ({
            userId: req.user.id,
            month,
            title: exp.title,
            amount: exp.amount,
            isFixed: true,
            isCompleted: false,
            category: exp.category || 'Other'
          }));

          await Expense.insertMany(expensesToCarryForward);
          // Re-fetch to return sorted list
          expenses = await Expense.find({ userId: req.user.id, month }).sort({ createdAt: -1 });
        }
      }
    }

    res.status(200).json(expenses);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Add expense(s) for a specific month
// @route   POST /api/expenses
// @access  Private
const addExpenses = async (req, res) => {
  const { month, title, amount, isFixed, category, wallet, expenses } = req.body;

  if (!month) {
    return res.status(400).json({ message: 'Month is required' });
  }

  try {
    // If user passed multiple expenses in an array
    if (expenses && Array.isArray(expenses)) {
      if (expenses.length === 0) {
        return res.status(400).json({ message: 'Expenses array cannot be empty' });
      }

      // Format expenses with userId and month
      const expensesToInsert = expenses.map(exp => {
        if (!exp.title || typeof exp.amount !== 'number' || exp.amount < 0) {
          throw new Error('Each expense must have a title and non-negative amount');
        }
        return {
          userId: req.user.id,
          month,
          title: exp.title,
          amount: exp.amount,
          isFixed: !!exp.isFixed,
          isCompleted: false,
          category: exp.category || 'Other',
          wallet: exp.wallet || 'Cash'
        };
      });

      const createdExpenses = await Expense.insertMany(expensesToInsert);

      // If any of the added expenses were fixed, sync future months
      if (expensesToInsert.some(e => e.isFixed)) {
        await syncFutureFixedExpenses(req.user.id, month);
      }

      return res.status(201).json(createdExpenses);
    }

    // Otherwise, handle a single expense insertion
    if (!title || typeof amount !== 'number' || amount < 0) {
      return res.status(400).json({ message: 'Please provide a title and non-negative amount' });
    }

    const expense = await Expense.create({
      userId: req.user.id,
      month,
      title,
      amount,
      isFixed: !!isFixed,
      category: category || 'Other',
      wallet: wallet || 'Cash',
    });

    if (isFixed) {
      await syncFutureFixedExpenses(req.user.id, month);
    }

    res.status(201).json(expense);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Toggle expense completion status
// @route   PUT /api/expenses/:id/toggle
// @access  Private
const toggleExpense = async (req, res) => {
  try {
    const expense = await Expense.findOne({ _id: req.params.id, userId: req.user.id });

    if (!expense) {
      return res.status(404).json({ message: 'Expense not found' });
    }

    expense.isCompleted = !expense.isCompleted;
    await expense.save();

    res.status(200).json(expense);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Delete expense
// @route   DELETE /api/expenses/:id
// @access  Private
const deleteExpense = async (req, res) => {
  try {
    const expense = await Expense.findOne({ _id: req.params.id, userId: req.user.id });

    if (!expense) {
      return res.status(404).json({ message: 'Expense not found' });
    }

    const isFixed = expense.isFixed;
    const month = expense.month;

    await expense.deleteOne();

    if (isFixed) {
      await syncFutureFixedExpenses(req.user.id, month);
    }

    res.status(200).json({ message: 'Expense removed', id: req.params.id });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get category-wise expense breakdown for a month
// @route   GET /api/expenses/:month/breakdown
// @access  Private
const getCategoryBreakdown = async (req, res) => {
  const { month } = req.params;

  try {
    const expenses = await Expense.find({ userId: req.user.id, month });
    const totalAmount = expenses.reduce((sum, e) => sum + e.amount, 0);

    const categoryMap = {};
    expenses.forEach(exp => {
      const cat = exp.category || 'Other';
      if (!categoryMap[cat]) {
        categoryMap[cat] = { category: cat, total: 0, count: 0 };
      }
      categoryMap[cat].total += exp.amount;
      categoryMap[cat].count += 1;
    });

    const breakdown = Object.values(categoryMap).map(item => ({
      ...item,
      percentage: totalAmount > 0 ? Math.round((item.total / totalAmount) * 100) : 0,
    }));

    // Sort by total descending
    breakdown.sort((a, b) => b.total - a.total);

    res.status(200).json({ month, totalAmount, breakdown });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getExpenses,
  addExpenses,
  toggleExpense,
  deleteExpense,
  getCategoryBreakdown,
};
