const User = require('../models/User');
const Holding = require('../models/Holding');

// In-memory simulator pricing state
let currentPrices = {
  SPY: 500.00,
  QQQ: 440.00,
  NVDA: 900.00,
  TSLA: 170.00,
  AAPL: 180.00,
  BTC: 65000.00,
  ETH: 3300.00,
  BOND: 100.00
};

let previousPrices = { ...currentPrices };

const BASE_ASSETS = [
  { symbol: 'SPY', name: 'S&P 500 ETF', type: 'etf', volatility: 'Low' },
  { symbol: 'QQQ', name: 'Nasdaq 100 ETF', type: 'etf', volatility: 'Moderate' },
  { symbol: 'NVDA', name: 'NVIDIA Corp.', type: 'stock', volatility: 'Very High' },
  { symbol: 'TSLA', name: 'Tesla Inc.', type: 'stock', volatility: 'High' },
  { symbol: 'AAPL', name: 'Apple Inc.', type: 'stock', volatility: 'Low-Moderate' },
  { symbol: 'BTC', name: 'Bitcoin', type: 'crypto', volatility: 'High' },
  { symbol: 'ETH', name: 'Ethereum', type: 'crypto', volatility: 'High' },
  { symbol: 'BOND', name: 'US Aggregate Bond', type: 'bond', volatility: 'Very Low' }
];

const EVENTS = [
  {
    name: 'Tech Sector Surge 🚀',
    desc: 'Earnings reports for major AI and cloud computing tech companies exceeded high expectations. Tech stocks and ETFs rally!',
    impacts: { NVDA: 0.14, QQQ: 0.06, AAPL: 0.03, TSLA: 0.04, BTC: 0.02, ETH: 0.03, SPY: 0.03, BOND: -0.01 }
  },
  {
    name: 'Inflation Report Hikes Rate Fears ⚠️',
    desc: 'Core inflation was higher than consensus forecasts. Markets fear higher-for-longer interest rates. Equities and cryptos drop!',
    impacts: { NVDA: -0.08, QQQ: -0.06, AAPL: -0.03, TSLA: -0.09, BTC: -0.11, ETH: -0.14, SPY: -0.04, BOND: -0.02 }
  },
  {
    name: 'Bitcoin ETF Inflows Surge 🐂',
    desc: 'Record-breaking net inflows into Spot Bitcoin ETFs spark a crypto bull run. Liquid market capital rushes into alternative assets.',
    impacts: { BTC: 0.16, ETH: 0.12, NVDA: 0.02, QQQ: 0.015, SPY: 0.005, TSLA: 0.02, AAPL: 0.00, BOND: -0.005 }
  },
  {
    name: 'Federal Reserve Rate Cut Announcement 🎉',
    desc: 'The Federal Reserve announced a 0.25% interest rate cut citing steady inflation cooling. Markets respond with absolute relief.',
    impacts: { NVDA: 0.06, QQQ: 0.05, AAPL: 0.04, TSLA: 0.08, BTC: 0.07, ETH: 0.08, SPY: 0.03, BOND: 0.02 }
  },
  {
    name: 'Global Supply Chain Geopolitical Bottleneck 🚢',
    desc: 'Maritime trade routes experience logistics delays. Manufacturing and hardware margins squeeze, while bond yields drop.',
    impacts: { NVDA: -0.05, AAPL: -0.04, TSLA: -0.07, QQQ: -0.03, SPY: -0.02, BOND: 0.008, BTC: -0.01, ETH: -0.02 }
  },
  {
    name: 'Electric Vehicle Subsidies Expansions ⚡',
    desc: 'Government expansions of EV and clean energy infrastructure support cause investor euphoria. Tesla gains high volume.',
    impacts: { TSLA: 0.15, QQQ: 0.02, SPY: 0.01, NVDA: 0.01, AAPL: 0.00, BTC: -0.005, ETH: 0.00, BOND: 0.002 }
  },
  {
    name: 'Global Regulatory Crypto Crackdown ⚖️',
    desc: 'Multiple regulatory bodies align on tighter oversight and AML guidelines for virtual assets. Cryptocurrency traders panic-sell.',
    impacts: { BTC: -0.14, ETH: -0.17, QQQ: -0.01, SPY: -0.005, NVDA: -0.01, TSLA: -0.02, AAPL: 0.00, BOND: 0.001 }
  }
];

// @desc    Get current simulated asset pricing
// @route   GET /api/simulator/assets
// @access  Private
const getAssets = async (req, res) => {
  try {
    const assetsWithPrice = BASE_ASSETS.map(asset => {
      const current = currentPrices[asset.symbol];
      const prev = previousPrices[asset.symbol];
      const changePct = prev > 0 ? parseFloat((((current - prev) / prev) * 100).toFixed(2)) : 0.00;
      
      return {
        ...asset,
        price: current,
        change: changePct
      };
    });
    res.status(200).json(assetsWithPrice);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Execute simulated stock or crypto trade
// @route   POST /api/simulator/trade
// @access  Private
const tradeAsset = async (req, res) => {
  const { symbol, tradeType, quantity } = req.body; // tradeType: 'buy' | 'sell'

  if (!symbol || !tradeType || !quantity) {
    return res.status(400).json({ message: 'Symbol, tradeType, and quantity are required' });
  }

  const parsedQty = parseFloat(quantity);
  if (isNaN(parsedQty) || parsedQty <= 0) {
    return res.status(400).json({ message: 'Quantity must be a positive number' });
  }

  const price = currentPrices[symbol];
  if (!price) {
    return res.status(400).json({ message: `Invalid asset symbol: ${symbol}` });
  }

  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const assetMeta = BASE_ASSETS.find(a => a.symbol === symbol);
    const assetName = assetMeta?.name || symbol;
    const assetType = assetMeta?.type || 'stock';

    if (tradeType === 'buy') {
      const totalCost = parsedQty * price;
      if (user.simulatedBalance < totalCost) {
        return res.status(400).json({
          message: `Insufficient funds. Purchase cost ${user.currency || '$'}${totalCost.toFixed(2)} exceeds your balance ${user.currency || '$'}${user.simulatedBalance.toFixed(2)}`
        });
      }

      // Deduct cash balance
      user.simulatedBalance = parseFloat((user.simulatedBalance - totalCost).toFixed(2));
      await user.save();

      // Find or create Holding
      let holding = await Holding.findOne({ userId: req.user.id, assetSymbol: symbol });
      if (holding) {
        const totalQty = holding.quantity + parsedQty;
        const averagePrice = ((holding.quantity * holding.averageBuyPrice) + totalCost) / totalQty;
        holding.quantity = parseFloat(totalQty.toFixed(6));
        holding.averageBuyPrice = parseFloat(averagePrice.toFixed(2));
        await holding.save();
      } else {
        holding = await Holding.create({
          userId: req.user.id,
          assetSymbol: symbol,
          assetName,
          assetType,
          quantity: parsedQty,
          averageBuyPrice: price
        });
      }

      return res.status(200).json({
        message: `Successfully bought ${parsedQty} ${symbol} for ${user.currency || '$'}${totalCost.toFixed(2)}`,
        balance: user.simulatedBalance,
        holding
      });

    } else if (tradeType === 'sell') {
      const holding = await Holding.findOne({ userId: req.user.id, assetSymbol: symbol });
      if (!holding || holding.quantity < parsedQty) {
        return res.status(400).json({
          message: `Insufficient asset quantity. You own ${holding ? holding.quantity : 0} ${symbol} but tried to sell ${parsedQty}`
        });
      }

      const totalRevenue = parsedQty * price;
      user.simulatedBalance = parseFloat((user.simulatedBalance + totalRevenue).toFixed(2));
      await user.save();

      holding.quantity = parseFloat((holding.quantity - parsedQty).toFixed(6));
      if (holding.quantity <= 0.0001) {
        await holding.deleteOne();
      } else {
        await holding.save();
      }

      return res.status(200).json({
        message: `Successfully sold ${parsedQty} ${symbol} for ${user.currency || '$'}${totalRevenue.toFixed(2)}`,
        balance: user.simulatedBalance,
        holding: holding.quantity <= 0.0001 ? null : holding
      });

    } else {
      return res.status(400).json({ message: `Invalid tradeType: ${tradeType}. Must be buy or sell.` });
    }

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Retrieve user simulated portfolio dashboard
// @route   GET /api/simulator/portfolio
// @access  Private
const getPortfolio = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const holdings = await Holding.find({ userId: req.user.id });
    
    let holdingsValue = 0;
    let totalInvested = 0;

    const detailedHoldings = holdings.map(h => {
      const price = currentPrices[h.assetSymbol] || h.averageBuyPrice;
      const currentVal = h.quantity * price;
      const costBasis = h.quantity * h.averageBuyPrice;
      const profit = currentVal - costBasis;
      const gainPct = costBasis > 0 ? parseFloat(((profit / costBasis) * 100).toFixed(2)) : 0.00;

      holdingsValue += currentVal;
      totalInvested += costBasis;

      return {
        _id: h._id,
        assetSymbol: h.assetSymbol,
        assetName: h.assetName,
        assetType: h.assetType,
        quantity: h.quantity,
        averageBuyPrice: h.averageBuyPrice,
        currentPrice: price,
        currentValue: parseFloat(currentVal.toFixed(2)),
        gain: parseFloat(profit.toFixed(2)),
        gainPct
      };
    });

    const netWorth = parseFloat((user.simulatedBalance + holdingsValue).toFixed(2));
    const totalProfit = parseFloat((netWorth - 10000.00).toFixed(2)); // initial virtual starting cash is $10k
    const totalProfitPct = parseFloat(((totalProfit / 10000.00) * 100).toFixed(2));

    res.status(200).json({
      cash: user.simulatedBalance,
      holdingsValue: parseFloat(holdingsValue.toFixed(2)),
      netWorth,
      totalProfit,
      totalProfitPct,
      holdings: detailedHoldings
    });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Advance simulated time step and fluctuate mock market prices
// @route   POST /api/simulator/simulate-step
// @access  Private
const simulateMarketEvent = async (req, res) => {
  try {
    // 1. Pick a random market event
    const event = EVENTS[Math.floor(Math.random() * EVENTS.length)];
    
    // Save current prices as previous prices
    previousPrices = { ...currentPrices };

    // 2. Adjust prices based on event + some small background market noise
    Object.keys(currentPrices).forEach(sym => {
      const eventImpact = event.impacts[sym] || 0.00;
      // Add random background fluctuation noise (-1.5% to +1.5%)
      const noise = (Math.random() * 0.03) - 0.015;
      
      const multiplier = 1 + eventImpact + noise;
      const newPrice = currentPrices[sym] * multiplier;
      
      // Ensure prices don't drop below $1
      currentPrices[sym] = parseFloat(Math.max(1.00, newPrice).toFixed(2));
    });

    res.status(200).json({
      event: event.name,
      description: event.desc,
      newPrices: currentPrices
    });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getAssets,
  tradeAsset,
  getPortfolio,
  simulateMarketEvent
};
