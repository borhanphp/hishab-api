const Income = require('../models/Income');
const Expense = require('../models/Expense');

// @desc    Get monthly summary statistics (History)
// @route   GET /api/dashboard/history
// @access  Private
const getHistory = async (req, res) => {
  try {
    const userId = req.user.id;

    // Fetch all records for this user
    const incomes = await Income.find({ userId });
    const expenses = await Expense.find({ userId });

    // Group by month
    const monthlyData = {};

    // Populate incomes
    incomes.forEach((inc) => {
      const month = inc.month;
      if (!monthlyData[month]) {
        monthlyData[month] = {
          month,
          totalIncome: 0,
          totalExpenses: 0,
          remainingBalance: 0,
          totalExpensesCount: 0,
          completedExpensesCount: 0,
          incomeSources: [],
          expenses: [],
        };
      }
      monthlyData[month].totalIncome += inc.totalIncome;
      monthlyData[month].incomeSources = inc.sources;
    });

    // Populate expenses
    expenses.forEach((exp) => {
      const month = exp.month;
      if (!monthlyData[month]) {
        monthlyData[month] = {
          month,
          totalIncome: 0,
          totalExpenses: 0,
          remainingBalance: 0,
          totalExpensesCount: 0,
          completedExpensesCount: 0,
          incomeSources: [],
          expenses: [],
        };
      }
      monthlyData[month].totalExpenses += exp.amount;
      monthlyData[month].totalExpensesCount += 1;
      if (exp.isCompleted) {
        monthlyData[month].completedExpensesCount += 1;
      }
      monthlyData[month].expenses.push(exp);
    });

    // Calculate remaining balance and convert to sorted array
    const historyList = Object.values(monthlyData).map((data) => {
      data.remainingBalance = data.totalIncome - data.totalExpenses;
      return data;
    });

    // Sort by month descending (newest first)
    historyList.sort((a, b) => b.month.localeCompare(a.month));

    res.status(200).json(historyList);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getHistory,
};
