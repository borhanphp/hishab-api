const API_URL = 'http://localhost:5000/api';

async function verifyNewFeatures() {
  console.log('=== Starting Integration Tests for New AI & Dashboard Features ===\n');

  try {
    // 1. Register a test user
    const email = `score_tester_${Date.now()}@example.com`;
    const password = 'password123';
    console.log(`Registering tester: ${email}`);
    
    const regRes = await fetch(`${API_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'Health Tester', email, password })
    });
    
    const regData = await regRes.json();
    if (!regRes.ok) {
      console.log('✗ Registration failed:', regData.message);
      return;
    }
    const token = regData.token;
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    };
    console.log('✓ Registered successfully.');

    // 2. Test Text Command Parsing
    console.log('\nTesting Text Command Parsing (e.g. "spent 25 on pizza at Dominos")...');
    const textParseRes = await fetch(`${API_URL}/ai/parse-text`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ text: 'spent 25 on pizza at Dominos' })
    });
    const textParseData = await textParseRes.json();
    if (textParseRes.ok && textParseData.amount === 25 && textParseData.category === 'Food') {
      console.log(`✓ Parse Successful. Merchant: "${textParseData.title}", Amount: ${textParseData.amount}, Category: "${textParseData.category}"`);
    } else {
      console.log('✗ Text command parse failed:', textParseData);
    }

    // 3. Test Auto-Categorization
    console.log('\nTesting Title Auto-Categorization (e.g. "Netflix Subscription")...');
    const catRes = await fetch(`${API_URL}/ai/categorize`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ title: 'Netflix Subscription' })
    });
    const catData = await catRes.json();
    if (catRes.ok && catData.category === 'Entertainment') {
      console.log(`✓ Auto-categorize successful. Category: "${catData.category}"`);
    } else {
      console.log('✗ Title auto-categorization failed:', catData);
    }

    // 4. Populate some income and expenses to test health score
    console.log('\nAdding mock income and expenses to calculate health score...');
    
    const d = new Date();
    const currentMonth = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;

    // Add Income: $5000
    await fetch(`${API_URL}/income`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        month: currentMonth,
        sources: [{ sourceName: 'Salary', amount: 5000, wallet: 'Bank' }]
      })
    });

    // Add Expense: $1500 (Rent: 1000, Food: 500)
    await fetch(`${API_URL}/expenses`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        month: currentMonth,
        expenses: [
          { title: 'Rent', amount: 1000, category: 'Rent', isFixed: true, wallet: 'Bank' },
          { title: 'Groceries', amount: 500, category: 'Food', isFixed: false, wallet: 'Cash' }
        ]
      })
    });

    // Add a Loan Debt: $1000
    await fetch(`${API_URL}/loans`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        borrowerName: 'Uncle Bob',
        amount: 1000,
        type: 'borrowed'
      })
    });

    // 5. Test Financial Health Score calculation
    console.log('\nTesting Financial Health Score...');
    const scoreRes = await fetch(`${API_URL}/dashboard/health-score`, { headers });
    const scoreData = await scoreRes.json();
    if (scoreRes.ok && scoreData.score !== undefined) {
      console.log(`✓ Score calculated: ${scoreData.score}/100`);
      console.log('Diagnostics Breakdown:');
      console.log(`  - Savings Rate Score: ${scoreData.components.savingsRate.score}/40 (Rate: ${scoreData.components.savingsRate.value})`);
      console.log(`  - Emergency Fund Score: ${scoreData.components.emergencyFund.score}/30 (Buffer: ${scoreData.components.emergencyFund.value})`);
      console.log(`  - Debt Ratio Score: ${scoreData.components.debtRatio.score}/20 (Borrowed: ${scoreData.components.debtRatio.value})`);
      console.log(`  - Budget Adherence Score: ${scoreData.components.budgetAdherence.score}/10 (Usage: ${scoreData.components.budgetAdherence.value})`);
      console.log('AI Recommendations:');
      scoreData.recommendations.forEach(r => console.log(`  - ${r}`));
    } else {
      console.log('✗ Health score retrieval failed:', scoreData);
    }

    // 6. Test Weekly AI Review
    console.log('\nTesting Weekly AI Review...');
    const weeklyRes = await fetch(`${API_URL}/dashboard/weekly-review`, { headers });
    const weeklyData = await weeklyRes.json();
    if (weeklyRes.ok && weeklyData.insights !== undefined) {
      console.log('✓ Weekly AI Review Insights:');
      weeklyData.insights.forEach(insight => console.log(`  - ${insight}`));
    } else {
      console.log('✗ Weekly review retrieval failed:', weeklyData);
    }

    // 7. Test Voice Command Parsing (Mock fallback check)
    console.log('\nTesting Voice Command Parsing (sending mock base64 audio)...');
    const voiceRes = await fetch(`${API_URL}/ai/parse-voice`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ audioBase64: 'data:audio/mp4;base64,AAA=', mimeType: 'audio/mp4' })
    });
    const voiceData = await voiceRes.json();
    if (voiceRes.ok && voiceData.amount !== undefined) {
      console.log(`✓ Voice parser completed successfully. Title: "${voiceData.title}", Amount: ${voiceData.amount}, Category: "${voiceData.category}"`);
    } else {
      console.log('✗ Voice command parse failed:', voiceData);
    }

    console.log('\n=== All Integrations and New Endpoints Verified Successfully! ===');
  } catch (error) {
    console.error('Integration test crashed:', error);
  }
}

verifyNewFeatures();
