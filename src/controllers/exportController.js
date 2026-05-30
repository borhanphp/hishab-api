const Income = require('../models/Income');
const Expense = require('../models/Expense');

// @desc    Export monthly financial data as CSV
// @route   GET /api/export/:month
// @access  Private
const exportMonthCSV = async (req, res) => {
  const { month } = req.params;

  try {
    const userId = req.user.id;
    const income = await Income.findOne({ userId, month });
    const expenses = await Expense.find({ userId, month }).sort({ createdAt: 1 });

    // Build CSV content
    let csv = 'Hishab Financial Report\n';
    csv += `Month: ${month}\n`;
    csv += `Generated: ${new Date().toISOString()}\n\n`;

    // Income Section
    csv += '=== INCOME SOURCES ===\n';
    csv += 'Source Name,Amount,Fixed\n';
    if (income && income.sources.length > 0) {
      income.sources.forEach(src => {
        csv += `"${src.sourceName}",${src.amount},${src.isFixed ? 'Yes' : 'No'}\n`;
      });
      csv += `Total Income,${income.totalIncome},\n`;
    } else {
      csv += 'No income recorded,,\n';
    }

    csv += '\n';

    // Expenses Section
    csv += '=== EXPENSES ===\n';
    csv += 'Title,Amount,Category,Fixed,Paid\n';
    let totalExpenses = 0;
    if (expenses.length > 0) {
      expenses.forEach(exp => {
        csv += `"${exp.title}",${exp.amount},${exp.category || 'Other'},${exp.isFixed ? 'Yes' : 'No'},${exp.isCompleted ? 'Yes' : 'No'}\n`;
        totalExpenses += exp.amount;
      });
      csv += `Total Expenses,${totalExpenses},,,\n`;
    } else {
      csv += 'No expenses recorded,,,,\n';
    }

    csv += '\n';

    // Summary Section
    const totalIncome = income?.totalIncome || 0;
    const savings = totalIncome - totalExpenses;
    csv += '=== SUMMARY ===\n';
    csv += 'Item,Amount\n';
    csv += `Total Income,${totalIncome}\n`;
    csv += `Total Expenses,${totalExpenses}\n`;
    csv += `Net Savings,${savings}\n`;
    csv += `Savings Rate,${totalIncome > 0 ? Math.round((savings / totalIncome) * 100) : 0}%\n`;

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=hishab_${month}.csv`);
    res.status(200).send(csv);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  exportMonthCSV,
};
