const Income = require('../models/Income');
const Expense = require('../models/Expense');
const User = require('../models/User');
const Loan = require('../models/Loan');
const SavingsGoal = require('../models/SavingsGoal');

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

// @desc    Calculate Financial Health Score (1-100) and recommendations
// @route   GET /api/dashboard/health-score
// @access  Private
const getFinancialHealthScore = async (req, res) => {
  try {
    const userId = req.user.id;
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const currency = user.currency || '$';

    // 1. Get recent incomes & expenses (current month)
    const d = new Date();
    const currentMonth = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    
    const incomeRecord = await Income.findOne({ userId, month: currentMonth });
    const expensesList = await Expense.find({ userId, month: currentMonth });

    const monthlyIncome = incomeRecord ? incomeRecord.totalIncome : 0;
    const monthlyExpenses = expensesList.reduce((sum, e) => sum + e.amount, 0);

    // 2. Get Savings Goals balances
    const savingsGoals = await SavingsGoal.find({ userId });
    const totalSavings = savingsGoals.reduce((sum, g) => sum + g.currentAmount, 0);

    // 3. Get Active Debt
    const loans = await Loan.find({ userId, isSettled: false });
    const totalBorrowed = loans.filter(l => l.type === 'borrowed').reduce((sum, l) => {
      const paymentsTotal = l.payments ? l.payments.reduce((s, p) => s + p.amount, 0) : 0;
      return sum + (l.amount - paymentsTotal);
    }, 0);

    // CALCULATE COMPONENT SCORES

    // A. Savings Rate (Max 40 points)
    // Target savings rate is 30% or more for full points
    let savingsRateScore = 0;
    const savingsRate = monthlyIncome > 0 ? (monthlyIncome - monthlyExpenses) / monthlyIncome : 0;
    if (savingsRate >= 0.3) {
      savingsRateScore = 40;
    } else if (savingsRate > 0) {
      savingsRateScore = Math.round((savingsRate / 0.3) * 40);
    } else {
      savingsRateScore = 0; // deficit or zero
    }

    // B. Emergency Fund (Max 30 points)
    // Target buffer is 3 months of expenses covered
    let emergencyFundScore = 0;
    const monthlyExpensesBenchmark = monthlyExpenses > 0 ? monthlyExpenses : 1200; // default benchmark if no expenses
    const monthsCovered = totalSavings / monthlyExpensesBenchmark;
    if (monthsCovered >= 3) {
      emergencyFundScore = 30;
    } else if (monthsCovered > 0) {
      emergencyFundScore = Math.round((monthsCovered / 3) * 30);
    } else {
      emergencyFundScore = 0;
    }

    // C. Debt Ratio (Max 20 points)
    // Debt-to-income ratio. If debt is 0, full 20 pts. If debt >= monthly income, 0 pts.
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

    // D. Budget Adherence (Max 10 points)
    // Actual expenses vs user budget setting
    let budgetAdherenceScore = 10;
    if (user.monthlyBudget > 0 && monthlyExpenses > 0) {
      if (monthlyExpenses <= user.monthlyBudget) {
        budgetAdherenceScore = 10;
      } else {
        const overspentRatio = (monthlyExpenses - user.monthlyBudget) / user.monthlyBudget;
        budgetAdherenceScore = Math.max(0, Math.round(10 - (overspentRatio * 10)));
      }
    }

    const finalScore = Math.min(100, Math.max(1, savingsRateScore + emergencyFundScore + debtRatioScore + budgetAdherenceScore));

    // GENERATE RECOMMENDATIONS
    const recommendations = [];
    if (savingsRateScore < 25) {
      recommendations.push(`💡 **Increase Savings**: Your savings rate is currently ${monthlyIncome > 0 ? Math.round(savingsRate * 100) : 0}%. Try reducing dining out or other variable spending next week.`);
    }
    if (emergencyFundScore < 20) {
      recommendations.push(`🌱 **Build Emergency Buffer**: You have ${currency}${totalSavings.toLocaleString()} saved, covering approx ${monthsCovered.toFixed(1)} months of expenses. Aim to save at least 3 months worth.`);
    }
    if (debtRatioScore < 15) {
      recommendations.push(`💸 **Pay Off Outstanding Debt**: You owe ${currency}${totalBorrowed.toLocaleString()} to others. Structured payoffs (like Debt Snowball) will increase your credit safety.`);
    }
    if (budgetAdherenceScore < 8) {
      recommendations.push(`⚠️ **Watch Your Budget**: You spent ${currency}${monthlyExpenses.toLocaleString()} which is above your set monthly budget of ${currency}${user.monthlyBudget.toLocaleString()}.`);
    }

    if (recommendations.length === 0) {
      recommendations.push(`🎉 **Excellent Job**: You are achieving your financial targets! Your savings buffer, debt ratio, and budgets are in peak condition.`);
    }

    res.status(200).json({
      score: finalScore,
      components: {
        savingsRate: { score: savingsRateScore, max: 40, value: `${monthlyIncome > 0 ? Math.round(savingsRate * 100) : 0}%` },
        emergencyFund: { score: emergencyFundScore, max: 30, value: `${monthsCovered.toFixed(1)} months` },
        debtRatio: { score: debtRatioScore, max: 20, value: `${currency}${totalBorrowed.toLocaleString()}` },
        budgetAdherence: { score: budgetAdherenceScore, max: 10, value: user.monthlyBudget > 0 ? `${Math.round((monthlyExpenses/user.monthlyBudget)*100)}% used` : 'N/A' }
      },
      recommendations
    });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Calculate week-over-week trends
// @route   GET /api/dashboard/weekly-review
// @access  Private
const getWeeklyReview = async (req, res) => {
  try {
    const userId = req.user.id;
    const user = await User.findById(userId);
    const currency = user?.currency || '$';

    const d = new Date();
    const currentMonth = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;

    // Get current month's expenses
    const expenses = await Expense.find({ userId, month: currentMonth });

    const nowTime = d.getTime();
    const oneDay = 24 * 60 * 60 * 1000;

    // Define weeks
    const currentWeekStart = nowTime - (7 * oneDay);
    const prevWeekStart = nowTime - (14 * oneDay);

    let currentWeekSpent = 0;
    let prevWeekSpent = 0;

    expenses.forEach(e => {
      const expenseTime = new Date(e.createdAt || Date.now()).getTime();
      if (expenseTime >= currentWeekStart && expenseTime <= nowTime) {
        currentWeekSpent += e.amount;
      } else if (expenseTime >= prevWeekStart && expenseTime < currentWeekStart) {
        prevWeekSpent += e.amount;
      }
    });

    let spendingChangePercent = 0;
    if (prevWeekSpent > 0) {
      spendingChangePercent = Math.round(((currentWeekSpent - prevWeekSpent) / prevWeekSpent) * 100);
    }

    // Get primary savings goal progress
    const activeGoal = await SavingsGoal.findOne({ userId, isCompleted: false }).sort({ createdAt: 1 });

    const insights = [];

    // Week-over-week insight
    if (prevWeekSpent === 0 && currentWeekSpent === 0) {
      insights.push(`📊 **No spending trend**: Log your daily expenses to see week-over-week trends!`);
    } else if (prevWeekSpent === 0) {
      insights.push(`📊 **Weekly Spending**: You spent ${currency}${currentWeekSpent.toLocaleString()} this week. Keep tracking to compare next week!`);
    } else {
      const direction = spendingChangePercent > 0 ? 'more' : 'less';
      const indicator = spendingChangePercent > 0 ? '⚠️' : '📉';
      insights.push(`${indicator} **Weekly Spending**: You spent ${currency}${currentWeekSpent.toLocaleString()} this week, which is **${Math.abs(spendingChangePercent)}% ${direction}** than last week.`);
    }

    // Savings goal insight
    if (activeGoal) {
      const pct = Math.round((activeGoal.currentAmount / activeGoal.targetAmount) * 100);
      insights.push(`🎯 **Goal Progress**: Your goal **"${activeGoal.name}"** is at **${pct}%** (${currency}${activeGoal.currentAmount.toLocaleString()} saved out of ${currency}${activeGoal.targetAmount.toLocaleString()}).`);
    } else {
      insights.push(`💡 **Save Smarter**: You don't have an active savings goal. Head to the Goals tab to create one!`);
    }

    res.status(200).json({
      currentWeekSpent,
      prevWeekSpent,
      spendingChangePercent,
      insights
    });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getHistory,
  getFinancialHealthScore,
  getWeeklyReview,
};
