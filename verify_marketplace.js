const API_URL = 'http://localhost:5000/api';

async function verifyMarketplace() {
  console.log('=== Starting Integration Tests for Phase 5 Financial Marketplace ===\n');

  try {
    // 1. Register a test user
    const email = `market_tester_${Date.now()}@example.com`;
    const password = 'password123';
    console.log(`Registering tester: ${email}`);
    
    const regRes = await fetch(`${API_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'Market Tester', email, password })
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

    // 2. Fetch recommendations (initial state: empty database will auto-seed products)
    console.log('\nTesting Product Auto-seeding and initial Recommendations shelf...');
    const recRes = await fetch(`${API_URL}/marketplace/recommendations`, { headers });
    const recData = await recRes.json();
    
    if (recRes.ok && Array.isArray(recData.recommendations) && recData.recommendations.length === 4) {
      console.log('✓ Fetch recommendations successful. Auto-seeded and returned 4 recommendations.');
      console.log('  Affiliate Stats:', recData.affiliateStats);
    } else {
      console.log('✗ Fetch recommendations failed:', recData);
      process.exit(1);
    }

    const testProduct = recData.recommendations[0];
    console.log(`  Sample recommendation: [${testProduct.provider}] ${testProduct.name} - Rate: ${testProduct.rate}`);

    // 3. Test Affiliate Link Clicks Tracker
    console.log('\nTesting Affiliate Link Click Tracker...');
    const clickRes = await fetch(`${API_URL}/marketplace/click`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ productId: testProduct._id })
    });
    const clickData = await clickRes.json();
    if (clickRes.ok && clickData.clicks === 1 && clickData.commissionAdded >= 5 && clickData.commissionAdded <= 25) {
      console.log(`✓ Affiliate click tracked. Click count: ${clickData.clicks}, Revenue earned: $${clickData.revenue} (Commission added: $${clickData.commissionAdded})`);
    } else {
      console.log('✗ Affiliate click tracking failed:', clickData);
      process.exit(1);
    }

    // 4. Set up Financial Profile: High savings rate, aggressive risk profile
    console.log('\nSetting up Financial Profile: Income = $6,000, Expenses = $1,500, Risk = aggressive');
    
    // Save Income
    const currentMonth = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;
    const incomeRes = await fetch(`${API_URL}/income`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        month: currentMonth,
        sources: [{ sourceName: 'Main Salary', amount: 6000 }]
      })
    });
    if (!incomeRes.ok) {
      console.log('✗ Save income failed:', await incomeRes.json());
      process.exit(1);
    }

    // Save Expense
    const expenseRes = await fetch(`${API_URL}/expenses`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        month: currentMonth,
        expenses: [
          { title: 'Rent', amount: 1000, isFixed: true },
          { title: 'Food', amount: 500, isFixed: false }
        ]
      })
    });
    if (!expenseRes.ok) {
      console.log('✗ Save expense failed:', await expenseRes.json());
      process.exit(1);
    }

    // Update risk profile to aggressive
    const profileRes = await fetch(`${API_URL}/auth/profile`, {
      method: 'PUT',
      headers,
      body: JSON.stringify({ riskProfile: 'aggressive' })
    });
    if (!profileRes.ok) {
      console.log('✗ Update profile failed:', await profileRes.json());
      process.exit(1);
    }
    
    // Create a savings goal to establish a savings buffer for the Approved status
    const saveGoalRes = await fetch(`${API_URL}/savings`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        name: 'Emergency Fund',
        targetAmount: 10000,
        currentAmount: 3000
      })
    });
    if (!saveGoalRes.ok) {
      console.log('✗ Save savings goal failed:', await saveGoalRes.json());
      process.exit(1);
    }
    
    console.log('✓ Financial profile and savings goals configured.');

    // 5. Fetch Recommendations again to check behavior-based tailoring
    console.log('\nFetching Recommendations for aggressive & high savings rate tester...');
    const recRes2 = await fetch(`${API_URL}/marketplace/recommendations`, { headers });
    const recData2 = await recRes2.json();
    
    // Assert nvda or crypto and brokerage are recommended
    const recommendedNames = recData2.recommendations.map(p => p.name);
    console.log('  Current recommendations list:', recommendedNames);
    
    const hasCoinVault = recommendedNames.some(name => name.includes('CoinVault'));
    const hasDirectTrade = recommendedNames.some(name => name.includes('DirectTrade'));
    
    if (hasCoinVault && hasDirectTrade) {
      console.log('✓ Recommendations tailored successfully based on high savings and aggressive risk profile!');
    } else {
      console.log('✗ Recommendations tailoring failed.');
      process.exit(1);
    }

    // 6. Test Loan Affordability Estimator - Low Risk Case
    // Income = 6000, Expense = 1500, Surplus = 4500. Requested = 5000. Proposed repayment = 250.
    // DTI = 250 / 6000 = ~4.1% (< 25%). Should be low risk.
    console.log('\nTesting Loan Affordability Estimator - Low Risk Case (Requesting $5,000)...');
    const loanCheckRes1 = await fetch(`${API_URL}/marketplace/simulate-affordability`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ requestedAmount: 5000 })
    });
    const loanCheckData1 = await loanCheckRes1.json();
    
    if (loanCheckRes1.ok && loanCheckData1.status === 'Low Risk') {
      console.log(`✓ Loan Check: LOW RISK! Max Eligible: $${loanCheckData1.maxEligibleAmount}, Rate: ${loanCheckData1.estimatedRate}`);
      console.log('  Diagnostics:');
      loanCheckData1.diagnostics.forEach(d => console.log(`    ${d}`));
    } else {
      console.log('✗ Loan Check (Low Risk Case) failed:', loanCheckData1);
      process.exit(1);
    }

    // 7. Test Loan Estimator - High Risk Case (Requesting $150,000)
    // Proposed repayment = 7500, which exceeds monthly surplus (4500). Should be high risk.
    console.log('\nTesting Loan Affordability Estimator - High Risk Case (Requesting $150,000)...');
    const loanCheckRes2 = await fetch(`${API_URL}/marketplace/simulate-affordability`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ requestedAmount: 150000 })
    });
    const loanCheckData2 = await loanCheckRes2.json();
    
    if (loanCheckRes2.ok && loanCheckData2.status === 'High Risk') {
      console.log(`✓ Loan Check: HIGH RISK! Reason preview: ${loanCheckData2.diagnostics[0]}`);
    } else {
      console.log('✗ Loan Check (High Risk Case) failed:', loanCheckData2);
      process.exit(1);
    }

    // 8. Test Loan Checker - Conditional Case
    // We register a new user with average income ($3,000), expenses ($2,500), surplus = $500.
    // We request $4,000 (repayment = $200). Proposed DTI = 200 / 3000 = 6.6%. Surplus (500) > proposed repayment (200).
    // Savings buffer is 0. This should yield Conditional status.
    console.log('\nRegistering second tester for Conditional loan check case...');
    const email2 = `market_tester_cond_${Date.now()}@example.com`;
    const regRes2 = await fetch(`${API_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'Cond Tester', email: email2, password: 'password123' })
    });
    const regData2 = await regRes2.json();
    const token2 = regData2.token;
    const headers2 = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token2}`
    };

    // Save income = 3000
    await fetch(`${API_URL}/income`, {
      method: 'POST',
      headers: headers2,
      body: JSON.stringify({
        month: currentMonth,
        sources: [{ sourceName: 'Salary', amount: 3000 }]
      })
    });

    // Save expense = 2500
    await fetch(`${API_URL}/expenses`, {
      method: 'POST',
      headers: headers2,
      body: JSON.stringify({
        month: currentMonth,
        expenses: [{ title: 'Living Cost', amount: 2500, isFixed: false }]
      })
    });

    console.log('Testing Loan Checker - Moderate Risk Case (Requesting $4,000)...');
    const loanCheckRes3 = await fetch(`${API_URL}/marketplace/simulate-affordability`, {
      method: 'POST',
      headers: headers2,
      body: JSON.stringify({ requestedAmount: 4000 })
    });
    const loanCheckData3 = await loanCheckRes3.json();
    
    if (loanCheckRes3.ok && loanCheckData3.status === 'Moderate Risk') {
      console.log(`✓ Loan Check: MODERATE RISK! Max Eligible: $${loanCheckData3.maxEligibleAmount}, Rate: ${loanCheckData3.estimatedRate}`);
      console.log('  Diagnostics:');
      loanCheckData3.diagnostics.forEach(d => console.log(`    ${d}`));
    } else {
      console.log('✗ Loan Check (Moderate Risk Case) failed:', loanCheckData3);
      process.exit(1);
    }

    console.log('\n=== All Financial Marketplace Integration Tests Verified Successfully! ===');
    process.exit(0);
  } catch (error) {
    console.error('Integration test crashed:', error);
    process.exit(1);
  }
}

verifyMarketplace();
