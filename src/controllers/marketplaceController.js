const Product = require('../models/Product');
const User = require('../models/User');
const Income = require('../models/Income');
const Expense = require('../models/Expense');
const Loan = require('../models/Loan');
const SavingsGoal = require('../models/SavingsGoal');

const MOCK_PRODUCTS = [
  {
    name: 'Hishab High-Yield Saver',
    provider: 'Saber Bank',
    type: 'savings',
    details: 'Maximize your interest with zero monthly maintenance fees and no minimum balance requirements.',
    rate: '4.75% APY',
    affiliateUrl: 'https://example.com/hys-saber',
    icon: '🏦'
  },
  {
    name: 'Apex High-Yield Cash',
    provider: 'Apex Trust',
    type: 'savings',
    details: 'Premium yields for savers holding emergency buffers above $5,000.',
    rate: '5.10% APY',
    affiliateUrl: 'https://example.com/hys-apex',
    icon: '💰'
  },
  {
    name: 'CashBack Boost Card',
    provider: 'Apex Trust',
    type: 'card',
    details: 'Get unlimited 2% cashback on groceries, transport, and dining out.',
    rate: '2% Flat CashBack',
    affiliateUrl: 'https://example.com/cc-boost',
    icon: '💳'
  },
  {
    name: 'Zero-Interest Consolidation Card',
    provider: 'Saber Bank',
    type: 'card',
    details: 'Consolidate and payoff high-interest debt with a long intro period.',
    rate: '0% APR for 18mo',
    affiliateUrl: 'https://example.com/cc-consolidation',
    icon: '💸'
  },
  {
    name: 'SecureLife Family Plan',
    provider: 'Universal Life',
    type: 'insurance',
    details: '$250k term coverage with instant approval and optional accidental riders.',
    rate: '$15/month',
    affiliateUrl: 'https://example.com/ins-life',
    icon: '🛡️'
  },
  {
    name: 'HealthShield Starter',
    provider: 'Metro Care',
    type: 'insurance',
    details: 'Essential medical coverage tailored for young professionals with $0 deductibles.',
    rate: '$45/month',
    affiliateUrl: 'https://example.com/ins-health',
    icon: '🏥'
  },
  {
    name: 'DirectTrade Brokerage',
    provider: 'Brokerage Direct',
    type: 'investment',
    details: 'Access global equities, index funds, and fractional share investing.',
    rate: '$0 Comm. Trades',
    affiliateUrl: 'https://example.com/inv-trade',
    icon: '📈'
  },
  {
    name: 'CoinVault Exchange',
    provider: 'CoinVault Inc.',
    type: 'investment',
    details: 'Securely trade Bitcoin, Ethereum, and earn yields on stablecoins.',
    rate: 'Low 0.1% Fees',
    affiliateUrl: 'https://example.com/inv-coin',
    icon: '🪙'
  }
];

// Helper to seed products if collection is empty
const seedProductsIfNeeded = async () => {
  const count = await Product.countDocuments();
  if (count === 0) {
    console.log('Marketplace collection empty. Seeding mock financial products...');
    await Product.insertMany(MOCK_PRODUCTS);
    console.log('✓ Seeding complete.');
  }
};

// @desc    Get tailored behavior-based product recommendations
// @route   GET /api/marketplace/recommendations
// @access  Private
const getRecommendations = async (req, res) => {
  try {
    await seedProductsIfNeeded();
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const d = new Date();
    const currentMonth = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;

    const [incomeRecord, expensesList, loans, allProducts] = await Promise.all([
      Income.findOne({ userId: req.user.id, month: currentMonth }),
      Expense.find({ userId: req.user.id, month: currentMonth }),
      Loan.find({ userId: req.user.id, isSettled: false }),
      Product.find({})
    ]);

    const monthlyIncome = incomeRecord ? incomeRecord.totalIncome : 0;
    const monthlyExpenses = expensesList.reduce((sum, e) => sum + e.amount, 0);
    const savingsRate = monthlyIncome > 0 ? (monthlyIncome - monthlyExpenses) / monthlyIncome : 0;
    const totalBorrowedDebt = loans.filter(l => l.type === 'borrowed').reduce((sum, l) => sum + l.amount, 0);

    const recommendedIds = new Set();
    const recommendedList = [];

    // Rule 1: Risk Profile tailoring
    if (user.riskProfile === 'aggressive') {
      const crypto = allProducts.find(p => p.type === 'investment' && p.name.includes('CoinVault'));
      if (crypto) {
        recommendedList.push(crypto);
        recommendedIds.add(crypto._id.toString());
      }
    } else if (user.riskProfile === 'conservative') {
      const apexCash = allProducts.find(p => p.type === 'savings' && p.name.includes('Apex'));
      if (apexCash) {
        recommendedList.push(apexCash);
        recommendedIds.add(apexCash._id.toString());
      }
    }

    // Rule 2: Active Debt tailoring
    if (totalBorrowedDebt > 0) {
      const consolidationCard = allProducts.find(p => p.type === 'card' && p.name.includes('Consolidation'));
      if (consolidationCard && !recommendedIds.has(consolidationCard._id.toString())) {
        recommendedList.push(consolidationCard);
        recommendedIds.add(consolidationCard._id.toString());
      }
    }

    // Rule 3: Savings rate tailoring
    if (savingsRate >= 0.2) {
      // High saver: Brokerage & High Yield Savings
      const brokerage = allProducts.find(p => p.type === 'investment' && p.name.includes('DirectTrade'));
      const apexCash = allProducts.find(p => p.type === 'savings' && p.name.includes('Apex'));
      
      if (brokerage && !recommendedIds.has(brokerage._id.toString())) {
        recommendedList.push(brokerage);
        recommendedIds.add(brokerage._id.toString());
      }
      if (apexCash && !recommendedIds.has(apexCash._id.toString())) {
        recommendedList.push(apexCash);
        recommendedIds.add(apexCash._id.toString());
      }
    } else {
      // Low saver: Saver HYS & CashBack Card
      const saverBank = allProducts.find(p => p.type === 'savings' && p.name.includes('Hishab'));
      const cashbackCard = allProducts.find(p => p.type === 'card' && p.name.includes('Boost'));
      
      if (saverBank && !recommendedIds.has(saverBank._id.toString())) {
        recommendedList.push(saverBank);
        recommendedIds.add(saverBank._id.toString());
      }
      if (cashbackCard && !recommendedIds.has(cashbackCard._id.toString())) {
        recommendedList.push(cashbackCard);
        recommendedIds.add(cashbackCard._id.toString());
      }
    }

    // Rule 4: Insurance inclusion
    const insuranceType = user.monthlyBudget > 1000 || monthlyIncome > 3000 ? 'SecureLife' : 'HealthShield';
    const insProduct = allProducts.find(p => p.type === 'insurance' && p.name.includes(insuranceType));
    if (insProduct && !recommendedIds.has(insProduct._id.toString())) {
      recommendedList.push(insProduct);
      recommendedIds.add(insProduct._id.toString());
    }

    // Fallback: fill up to 4 recommendations
    for (const prod of allProducts) {
      if (recommendedList.length >= 4) break;
      if (!recommendedIds.has(prod._id.toString())) {
        recommendedList.push(prod);
        recommendedIds.add(prod._id.toString());
      }
    }

    // Other offers are the remaining ones
    const otherOffers = allProducts.filter(p => !recommendedIds.has(p._id.toString()));

    res.status(200).json({
      affiliateStats: {
        clicks: user.affiliateClicksCount || 0,
        revenue: user.affiliateRevenueEarned || 0
      },
      recommendations: recommendedList.slice(0, 4),
      otherOffers
    });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Track click on affiliate link and add mock commission revenue
// @route   POST /api/marketplace/click
// @access  Private
const trackAffiliateClick = async (req, res) => {
  const { productId } = req.body;
  if (!productId) {
    return res.status(400).json({ message: 'Product ID is required' });
  }

  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    // Increment click counts
    user.affiliateClicksCount = (user.affiliateClicksCount || 0) + 1;

    // Generate mock referral revenue ($5 to $25)
    const commission = parseFloat((5.00 + Math.random() * 20.00).toFixed(2));
    user.affiliateRevenueEarned = parseFloat(((user.affiliateRevenueEarned || 0) + commission).toFixed(2));
    await user.save();

    res.status(200).json({
      message: `Affiliate click tracked successfully for ${product.name}!`,
      clicks: user.affiliateClicksCount,
      revenue: user.affiliateRevenueEarned,
      commissionAdded: commission
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Check Loan Eligibility against current finances
// @route   POST /api/marketplace/check-eligibility
// @access  Private
const checkLoanEligibility = async (req, res) => {
  const { requestedAmount } = req.body;
  const principal = parseFloat(requestedAmount);

  if (isNaN(principal) || principal <= 0) {
    return res.status(400).json({ message: 'Please provide a valid requested loan amount' });
  }

  try {
    const userId = req.user.id;
    const user = await User.findById(userId);

    const d = new Date();
    const currentMonth = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;

    const [incomeRecord, expensesList, loans, savingsGoals] = await Promise.all([
      Income.findOne({ userId, month: currentMonth }),
      Expense.find({ userId, month: currentMonth }),
      Loan.find({ userId, isSettled: false }),
      SavingsGoal.find({ userId })
    ]);

    const monthlyIncome = incomeRecord ? incomeRecord.totalIncome : 0;
    const monthlyExpenses = expensesList.reduce((sum, e) => sum + e.amount, 0);
    const totalSavings = savingsGoals.reduce((sum, g) => sum + g.currentAmount, 0);
    const totalBorrowed = loans.filter(l => l.type === 'borrowed').reduce((sum, l) => {
      const paymentsTotal = l.payments ? l.payments.reduce((s, p) => s + p.amount, 0) : 0;
      return sum + (l.amount - paymentsTotal);
    }, 0);

    const monthlySurplus = monthlyIncome - monthlyExpenses;
    
    // Safety calculations:
    // 1. Proposed repayment: assume 5% of principal monthly (e.g. 20-month payoff)
    const proposedRepayment = principal * 0.05;
    
    // 2. Proposed DTI: (existingBorrowed + proposedRepayment) / income
    const proposedDti = monthlyIncome > 0 ? (totalBorrowed + proposedRepayment) / monthlyIncome : 1.0;
    
    // 3. Savings buffer: how many months expenses are saved
    const monthlyExpensesBenchmark = monthlyExpenses > 0 ? monthlyExpenses : 1200;
    const savingsBufferMonths = totalSavings / monthlyExpensesBenchmark;

    let status = 'Declined';
    let estimatedRate = 'N/A';
    const diagnostics = [];

    // Evaluate eligibility
    if (monthlyIncome <= 0) {
      status = 'Declined';
      diagnostics.push('❌ No active monthly income history detected. Please log your income.');
    } else if (proposedRepayment > monthlySurplus) {
      status = 'Declined';
      diagnostics.push(`❌ Proposed monthly repayment of $${proposedRepayment.toFixed(2)} exceeds your monthly cash flow surplus ($${monthlySurplus.toFixed(2)}).`);
      diagnostics.push('💡 Tip: Try lowering the requested loan amount or reducing variable expenses.');
    } else if (proposedDti > 0.5) {
      status = 'Declined';
      diagnostics.push(`❌ Proposed debt-to-income (DTI) ratio (${Math.round(proposedDti * 100)}%) exceeds the safe risk limit of 50%.`);
      diagnostics.push(`💡 Tip: Settle your outstanding debts of $${totalBorrowed.toLocaleString()} before taking new loans.`);
    } else if (proposedDti < 0.25 && monthlySurplus >= proposedRepayment * 1.5 && savingsBufferMonths >= 1.5) {
      status = 'Approved';
      estimatedRate = '7.49% - 9.25% APR';
      diagnostics.push('✅ Approved under premium interest rates!');
      diagnostics.push(`📊 Safe Debt-to-Income (DTI) index of ${Math.round(proposedDti * 100)}%.`);
      diagnostics.push('📈 Strong monthly cash surplus covers estimated loan repayments comfortably.');
      if (savingsBufferMonths > 0) {
        diagnostics.push(`🛡️ Emergency buffer of ${savingsBufferMonths.toFixed(1)} months provides solid collateral support.`);
      }
    } else {
      status = 'Conditional';
      estimatedRate = '10.99% - 13.50% APR';
      diagnostics.push('⚠️ Approved conditionally with moderate rates.');
      diagnostics.push(`📊 Proposed DTI ratio is at ${Math.round(proposedDti * 100)}%.`);
      diagnostics.push('📈 Cash flow surplus is sufficient, but savings buffers are low.');
      diagnostics.push('💡 Tip: Adding a co-signer or opting for direct payroll deposit will lower your APR.');
    }

    const maxEligibleAmount = parseFloat(Math.max(0, monthlySurplus * 20).toFixed(2));

    res.status(200).json({
      requestedAmount: principal,
      status,
      maxEligibleAmount,
      estimatedRate,
      estimatedMonthlyRepayment: proposedRepayment,
      diagnostics
    });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getRecommendations,
  trackAffiliateClick,
  checkLoanEligibility
};
