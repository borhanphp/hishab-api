const API_URL = 'http://localhost:5000/api';

async function verifyWealthSimulator() {
  console.log('=== Starting Integration Tests for Wealth & Simulator Features ===\n');

  try {
    // 1. Register a test user
    const email = `wealth_tester_${Date.now()}@example.com`;
    const password = 'password123';
    console.log(`Registering tester: ${email}`);
    
    const regRes = await fetch(`${API_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'Wealth Tester', email, password })
    });
    
    const regData = await regRes.json();
    if (!regRes.ok) {
      console.log('✗ Registration failed:', regData.message);
      process.exit(1);
    }
    const token = regData.token;
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    };
    console.log('✓ Registered successfully.');

    // 2. Test Risk Profile Saving
    console.log('\nTesting Risk Profile Saving via PUT /api/auth/profile...');
    const profileRes = await fetch(`${API_URL}/auth/profile`, {
      method: 'PUT',
      headers,
      body: JSON.stringify({ riskProfile: 'moderate' })
    });
    const profileData = await profileRes.json();
    if (profileRes.ok && profileData.riskProfile === 'moderate') {
      console.log('✓ Risk profile saved successfully. Value:', profileData.riskProfile);
    } else {
      console.log('✗ Risk profile save failed:', profileData);
      process.exit(1);
    }

    // 3. Test GET /api/simulator/assets
    console.log('\nTesting Retrieval of Market Assets...');
    const assetsRes = await fetch(`${API_URL}/simulator/assets`, { headers });
    const assetsData = await assetsRes.json();
    if (assetsRes.ok && Array.isArray(assetsData) && assetsData.length === 8) {
      console.log('✓ Market assets fetched successfully. Assets count:', assetsData.length);
      console.log('List of available assets:');
      assetsData.forEach(asset => {
        console.log(`  - [${asset.symbol}] ${asset.name} (${asset.type}) | Price: $${asset.price} | Volatility: ${asset.volatility}`);
      });
    } else {
      console.log('✗ Failed to retrieve market assets:', assetsData);
      process.exit(1);
    }

    // 4. Test GET /api/simulator/portfolio (Initial State)
    console.log('\nTesting Portfolio Initial State...');
    const portRes = await fetch(`${API_URL}/simulator/portfolio`, { headers });
    const portData = await portRes.json();
    if (portRes.ok && portData.cash === 10000 && portData.holdingsValue === 0 && portData.netWorth === 10000) {
      console.log(`✓ Portfolio initial state verified: Cash = $${portData.cash}, Holdings = $${portData.holdingsValue}, Net Worth = $${portData.netWorth}`);
    } else {
      console.log('✗ Initial portfolio state mismatch:', portData);
      process.exit(1);
    }

    // 5. Test executing a simulated Buy trade (Buy 2 NVDA shares)
    console.log('\nTesting Buy Trade (2 NVDA)...');
    const nvdaAsset = assetsData.find(a => a.symbol === 'NVDA');
    const nvdaPrice = nvdaAsset ? nvdaAsset.price : 900.00;
    const expectedCost = 2 * nvdaPrice;
    
    const buyRes = await fetch(`${API_URL}/simulator/trade`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        symbol: 'NVDA',
        tradeType: 'buy',
        quantity: 2
      })
    });
    const buyData = await buyRes.json();
    if (buyRes.ok && buyData.holding && buyData.holding.quantity === 2) {
      console.log(`✓ Buy trade executed. Cash remaining: $${buyData.balance} (Spent: $${expectedCost.toFixed(2)})`);
      console.log(`  Holding: ${buyData.holding.quantity} shares of ${buyData.holding.assetSymbol} with avg price $${buyData.holding.averageBuyPrice}`);
    } else {
      console.log('✗ Buy trade failed:', buyData);
      process.exit(1);
    }

    // 6. Verify Portfolio after Buy
    console.log('\nVerifying Portfolio state after Buy...');
    const portPostBuyRes = await fetch(`${API_URL}/simulator/portfolio`, { headers });
    const portPostBuyData = await portPostBuyRes.json();
    if (portPostBuyRes.ok && portPostBuyData.holdings.length === 1 && portPostBuyData.holdings[0].assetSymbol === 'NVDA') {
      console.log(`✓ Portfolio updated: Cash = $${portPostBuyData.cash}, Holdings = $${portPostBuyData.holdingsValue}, Net Worth = $${portPostBuyData.netWorth}`);
    } else {
      console.log('✗ Portfolio post-buy verification failed:', portPostBuyData);
      process.exit(1);
    }

    // 7. Test Insufficient Funds error handling (Buy 100 BTC)
    console.log('\nTesting Insufficient Funds Validation (Buying 100 BTC)...');
    const badBuyRes = await fetch(`${API_URL}/simulator/trade`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        symbol: 'BTC',
        tradeType: 'buy',
        quantity: 100
      })
    });
    const badBuyData = await badBuyRes.json();
    if (!badBuyRes.ok && badBuyData.message.includes('Insufficient funds')) {
      console.log(`✓ Rejection caught correctly: "${badBuyData.message}"`);
    } else {
      console.log('✗ Failed to reject purchase with insufficient funds:', badBuyData);
      process.exit(1);
    }

    // 8. Test Simulate Market Event / Advancing market step
    console.log('\nTesting Advancing Market Simulation (POST /api/simulator/simulate-step)...');
    const stepRes = await fetch(`${API_URL}/simulator/simulate-step`, {
      method: 'POST',
      headers
    });
    const stepData = await stepRes.json();
    if (stepRes.ok && stepData.event) {
      console.log(`✓ Market step advanced successfully.`);
      console.log(`  Event: ${stepData.event}`);
      console.log(`  Description: ${stepData.description}`);
      console.log(`  New NVDA Price: $${stepData.newPrices.NVDA}`);
    } else {
      console.log('✗ Market simulation step failed:', stepData);
      process.exit(1);
    }

    // 9. Test Sell Trade (Sell 1 NVDA)
    console.log('\nTesting Sell Trade (1 NVDA)...');
    const sellRes = await fetch(`${API_URL}/simulator/trade`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        symbol: 'NVDA',
        tradeType: 'sell',
        quantity: 1
      })
    });
    const sellData = await sellRes.json();
    if (sellRes.ok && sellData.holding && sellData.holding.quantity === 1) {
      console.log(`✓ Sell trade executed. Cash remaining: $${sellData.balance}`);
      console.log(`  Holding updated: ${sellData.holding.quantity} shares remaining`);
    } else {
      console.log('✗ Sell trade failed:', sellData);
      process.exit(1);
    }

    // 10. Test Insufficient Assets Sell error handling (Sell 10 QQQ or 10 NVDA)
    console.log('\nTesting Insufficient Assets Sell Validation (Selling 10 NVDA when only 1 held)...');
    const badSellRes = await fetch(`${API_URL}/simulator/trade`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        symbol: 'NVDA',
        tradeType: 'sell',
        quantity: 10
      })
    });
    const badSellData = await badSellRes.json();
    if (!badSellRes.ok && badSellData.message.includes('Insufficient asset quantity')) {
      console.log(`✓ Rejection caught correctly: "${badSellData.message}"`);
    } else {
      console.log('✗ Failed to reject sell with insufficient holdings:', badSellData);
      process.exit(1);
    }

    console.log('\n=== All Wealth & Simulator API Integrations Verified Successfully! ===');
  } catch (error) {
    console.error('Integration test crashed:', error);
    process.exit(1);
  }
}

verifyWealthSimulator();
