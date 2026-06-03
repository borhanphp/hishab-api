const Loan = require('../models/Loan');

// @desc    Get all loans for user
// @route   GET /api/loans
// @access  Private
const getLoans = async (req, res) => {
  try {
    const loans = await Loan.find({ userId: req.user.id }).sort({ date: -1 });
    res.status(200).json(loans);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Add a loan record
// @route   POST /api/loans
// @access  Private
const addLoan = async (req, res) => {
  const { borrowerName, amount, type, date } = req.body;

  if (!borrowerName || typeof amount !== 'number' || amount <= 0) {
    return res.status(400).json({ message: 'Please provide borrower name and a positive amount' });
  }

  try {
    const loan = await Loan.create({
      userId: req.user.id,
      borrowerName,
      amount,
      type: type || 'lent',
      date: date || new Date(),
    });

    res.status(201).json(loan);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Mark a loan as settled
// @route   PUT /api/loans/:id/settle
// @access  Private
const settleLoan = async (req, res) => {
  try {
    const loan = await Loan.findOne({ _id: req.params.id, userId: req.user.id });

    if (!loan) {
      return res.status(404).json({ message: 'Loan record not found' });
    }

    loan.isSettled = !loan.isSettled;
    loan.settledDate = loan.isSettled ? new Date() : null;
    await loan.save();

    res.status(200).json(loan);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Add a payment to a loan
// @route   POST /api/loans/:id/pay
// @access  Private
const payLoan = async (req, res) => {
  const { amount } = req.body;

  if (typeof amount !== 'number' || amount <= 0) {
    return res.status(400).json({ message: 'Please provide a positive payment amount' });
  }

  try {
    const loan = await Loan.findOne({ _id: req.params.id, userId: req.user.id });

    if (!loan) {
      return res.status(404).json({ message: 'Loan record not found' });
    }

    loan.payments.push({ amount, date: new Date() });

    // Calculate total paid so far
    const totalPaid = loan.payments.reduce((sum, p) => sum + p.amount, 0);

    if (totalPaid >= loan.amount) {
      loan.isSettled = true;
      loan.settledDate = new Date();
    }

    await loan.save();
    res.status(200).json(loan);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Delete a loan record
// @route   DELETE /api/loans/:id
// @access  Private
const deleteLoan = async (req, res) => {
  try {
    const loan = await Loan.findOne({ _id: req.params.id, userId: req.user.id });

    if (!loan) {
      return res.status(404).json({ message: 'Loan record not found' });
    }

    await loan.deleteOne();
    res.status(200).json({ message: 'Loan record removed', id: req.params.id });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getLoans,
  addLoan,
  settleLoan,
  payLoan,
  deleteLoan,
};
