const Income = require('../models/Income');

// @desc    Get income for a specific month
// @route   GET /api/income/:month
// @access  Private
const getIncome = async (req, res) => {
  const { month } = req.params; // format: YYYY-MM

  try {
    let income = await Income.findOne({ userId: req.user.id, month });
    
    if (!income) {
      // Look for the most recent month's income recorded before target month
      const lastIncome = await Income.findOne({
        userId: req.user.id,
        month: { $lt: month }
      }).sort({ month: -1 });

      if (lastIncome) {
        const fixedSources = lastIncome.sources
          .filter(s => s.isFixed)
          .map(s => ({
            sourceName: s.sourceName,
            amount: s.amount,
            isFixed: true
          }));

        if (fixedSources.length > 0) {
          // Auto carry-forward to the new month
          income = new Income({
            userId: req.user.id,
            month,
            sources: fixedSources
          });
          await income.save();
        }
      }
    }

    if (!income) {
      return res.status(200).json({
        month,
        sources: [],
        totalIncome: 0,
      });
    }

    res.status(200).json(income);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Save/Update income for a month
// @route   POST /api/income
// @access  Private
const saveIncome = async (req, res) => {
  const { month, sources } = req.body; // sources: [{ sourceName, amount, isFixed }]

  if (!month) {
    return res.status(400).json({ message: 'Month is required' });
  }

  if (!Array.isArray(sources)) {
    return res.status(400).json({ message: 'Sources must be an array' });
  }

  try {
    // Validate sources
    for (const source of sources) {
      if (!source.sourceName || typeof source.amount !== 'number' || source.amount < 0) {
        return res.status(400).json({ message: 'Invalid source data. Each source must have a sourceName and non-negative amount.' });
      }
    }

    let income = await Income.findOne({ userId: req.user.id, month });

    const mappedSources = sources.map(s => ({
      sourceName: s.sourceName,
      amount: s.amount,
      isFixed: !!s.isFixed
    }));

    if (income) {
      income.sources = mappedSources;
    } else {
      income = new Income({
        userId: req.user.id,
        month,
        sources: mappedSources,
      });
    }

    await income.save();

    // SINK TO FUTURE MONTHS:
    const fixedSources = mappedSources.filter(s => s.isFixed);
    const futureIncomes = await Income.find({
      userId: req.user.id,
      month: { $gt: month }
    });

    for (const fIncome of futureIncomes) {
      // Filter out existing fixed sources and append new fixed sources
      fIncome.sources = [
        ...fIncome.sources.filter(s => !s.isFixed),
        ...fixedSources.map(s => ({
          sourceName: s.sourceName,
          amount: s.amount,
          isFixed: true
        }))
      ];
      await fIncome.save();
    }

    res.status(200).json(income);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getIncome,
  saveIncome,
};
