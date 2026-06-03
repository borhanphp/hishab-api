const API_URL = 'http://localhost:5000/api';

async function testEnhancements() {
  console.log('=== Starting Backend Enhancements Integration Test ===\n');

  try {
    // 1. Register a test user
    const email = `enhancement_tester_${Date.now()}@example.com`;
    const password = 'password123';
    console.log(`Registering tester: ${email}`);
    
    const regRes = await fetch(`${API_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'Enhance Tester', email, password })
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

    // 2. Test Expense creation with custom Wallet parameter
    console.log('\nTesting Expense creation with Card wallet...');
    const expRes = await fetch(`${API_URL}/expenses`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        month: '2026-06',
        title: 'Premium Keyboard',
        amount: 150,
        category: 'Shopping',
        wallet: 'Card'
      })
    });
    const expData = await expRes.json();
    if (expRes.ok && expData.wallet === 'Card') {
      console.log('✓ Expense created successfully with wallet: Card');
    } else {
      console.log('✗ Expense creation with wallet failed:', expData.message || expData);
    }

    // 3. Test Loan creation & Partial Payments
    console.log('\nTesting Loan creation and partial payments...');
    const loanRes = await fetch(`${API_URL}/loans`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        borrowerName: 'Sarah Connor',
        amount: 500,
        type: 'lent'
      })
    });
    const loanData = await loanRes.json();
    if (!loanRes.ok) {
      console.log('✗ Loan creation failed:', loanData.message);
      return;
    }
    console.log(`✓ Loan of $${loanData.amount} created. ID: ${loanData._id}`);

    // Log first payment of $200
    console.log('Logging loan partial payment of $200...');
    const payRes1 = await fetch(`${API_URL}/loans/${loanData._id}/pay`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ amount: 200 })
    });
    const payData1 = await payRes1.json();
    const totalPaid1 = payData1.payments.reduce((s, p) => s + p.amount, 0);
    console.log(`✓ Payment logged. Total paid: $${totalPaid1}. Settled: ${payData1.isSettled}`);

    // Log settling payment of $300
    console.log('Logging settling loan payment of $300...');
    const payRes2 = await fetch(`${API_URL}/loans/${loanData._id}/pay`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ amount: 300 })
    });
    const payData2 = await payRes2.json();
    const totalPaid2 = payData2.payments.reduce((s, p) => s + p.amount, 0);
    console.log(`✓ Payment logged. Total paid: $${totalPaid2}. Settled: ${payData2.isSettled}`);

    if (payData2.isSettled) {
      console.log('✓ Partial repayment and auto-settlement verified successfully!');
    } else {
      console.log('✗ Loan did not auto-settle upon full repayment.');
    }

    // 4. Test AI Receipt scan category extraction
    console.log('\nTesting AI scan OCR receipt category estimation...');
    const scanRes = await fetch(`${API_URL}/ai/scan`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        imageBase64: 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAAPAA8BAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA='
      })
    });
    const scanData = await scanRes.json();
    if (scanRes.ok && scanData.category) {
      console.log(`✓ Receipt category returned correctly: Merchant: ${scanData.title}, Amount: ${scanData.amount}, Category: ${scanData.category}`);
    } else {
      console.log('✗ Receipt scan category extraction failed:', scanData.message || scanData);
    }

    // 5. Test Unequal split shared billing in workspaces
    console.log('\nTesting Group collaborative unequal split budgeting...');
    const friendEmail = `friend_tester_${Date.now()}@example.com`;
    
    // Register friend user
    const friendReg = await fetch(`${API_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'Friend Tester', email: friendEmail, password: 'password123' })
    });
    const friendData = await friendReg.json();
    if (!friendReg.ok) {
      console.log('✗ Friend registration failed:', friendData.message);
      return;
    }
    
    // Create workspace
    const groupRes = await fetch(`${API_URL}/groups`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        name: 'Shared Flat Workspace',
        memberEmails: [friendEmail]
      })
    });
    const groupData = await groupRes.json();
    if (!groupRes.ok) {
      console.log('✗ Workspace creation failed:', groupData.message);
      return;
    }
    console.log(`✓ Workspace "${groupData.name}" created with ${groupData.members.length} members.`);

    // Friend ID and My ID
    const friendId = friendData._id || groupData.members.find(m => m.email === friendEmail)._id;
    const myId = regData._id;

    // Log unequal shared expense: total $120. Payer: Me. splits: Me ($40), Friend ($80)
    console.log('Logging unequal split bill: Total $120 (Me: $40, Friend: $80)...');
    const splitRes = await fetch(`${API_URL}/groups/${groupData._id}/expenses`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        title: 'Electricity & Gas bill',
        amount: 120,
        splits: [
          { userId: myId, amount: 40 },
          { userId: friendId, amount: 80 }
        ]
      })
    });
    const splitData = await splitRes.json();
    if (!splitRes.ok) {
      console.log('✗ Logging unequal split bill failed:', splitData.message);
      return;
    }
    console.log('✓ Unequal split bill logged successfully.');

    // Fetch ledger calculations and simplified debts
    const ledgerRes = await fetch(`${API_URL}/groups/${groupData._id}/expenses`, { headers });
    const ledgerData = await ledgerRes.json();
    if (ledgerRes.ok) {
      console.log('✓ Group ledger balance details retrieved:');
      ledgerData.netBalances.forEach(b => {
        console.log(`  - Member: ${b.username}, Balance: $${b.balance}`);
      });
      console.log('✓ Simplified settlements:');
      ledgerData.simplifiedDebts.forEach(d => {
        console.log(`  - ${d.fromName} owes ${d.toName} $${d.amount}`);
      });

      // Verify that Friend owes Me exactly $80
      const validDebt = ledgerData.simplifiedDebts.find(d => d.fromId === friendId && d.toId === myId && d.amount === 80);
      if (validDebt) {
        console.log('✓ Splitwise simplified debts logic verified matching unequal split target amounts!');
      } else {
        console.log('✗ Unequal split debt simplified calculation mismatch!');
      }
    } else {
      console.log('✗ Failed to fetch group ledger details:', ledgerData.message);
    }

    console.log('\n=== Backend Enhancements Integration Test Completed Successfully ===');
  } catch (error) {
    console.error('Integration test crashed:', error);
  }
}

testEnhancements();
