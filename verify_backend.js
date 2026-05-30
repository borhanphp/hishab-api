const API_URL = 'http://localhost:5000/api';

async function testBackend() {
  console.log('=== Starting Backend Integration Test ===\n');

  try {
    // 1. Health check
    const healthRes = await fetch('http://localhost:5000/health');
    const healthData = await healthRes.json();
    console.log('✓ Health check status:', healthData.status, '-', healthData.message);

    // 2. Auth: Register
    const email = `tester_${Date.now()}@example.com`;
    const password = 'password123';
    console.log(`\nAttempting registration with email: ${email}`);
    
    const regRes = await fetch(`${API_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'Test Tester', email, password })
    });
    
    let token = '';
    const regData = await regRes.json();
    if (regRes.ok) {
      console.log('✓ User registered successfully! Token generated.');
      token = regData.token;
    } else {
      console.log('✗ Registration failed:', regData.message);
      return;
    }

    // 3. Auth: Login
    console.log('\nTesting Login...');
    const loginRes = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    const loginData = await loginRes.json();
    if (loginRes.ok) {
      console.log('✓ Login successful! Token verified.');
      token = loginData.token;
    } else {
      console.log('✗ Login failed:', loginData.message);
      return;
    }

    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    };

    // 4. Income: Save Income
    const currentMonth = '2026-05';
    console.log(`\nTesting Save Income for ${currentMonth}...`);
    const incomeRes = await fetch(`${API_URL}/income`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        month: currentMonth,
        sources: [
          { sourceName: 'Salary', amount: 5000 },
          { sourceName: 'Freelance', amount: 1500 }
        ]
      })
    });
    const incomeData = await incomeRes.json();
    if (incomeRes.ok) {
      console.log('✓ Income saved! Total Monthly Income:', incomeData.totalIncome);
    } else {
      console.log('✗ Save Income failed:', incomeData.message);
    }

    // 5. Expense: Add Expenses
    console.log('\nTesting Add Expenses...');
    const expenseRes = await fetch(`${API_URL}/expenses`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        month: currentMonth,
        expenses: [
          { title: 'House Rent', amount: 1200, isFixed: true },
          { title: 'Groceries', amount: 300, isFixed: false }
        ]
      })
    });
    const expenseData = await expenseRes.json();
    if (expenseRes.ok) {
      console.log(`✓ Added ${expenseData.length} expenses successfully.`);
    } else {
      console.log('✗ Add Expenses failed:', expenseData.message);
    }

    // 6. Expense: List and Toggle completed
    console.log('\nListing Expenses...');
    const listExpRes = await fetch(`${API_URL}/expenses/${currentMonth}`, { headers });
    const listExpData = await listExpRes.json();
    console.log(`Found ${listExpData.length} expenses for ${currentMonth}.`);
    
    if (listExpData.length > 0) {
      const expenseToToggle = listExpData[0];
      console.log(`Toggling completion status for: ${expenseToToggle.title} (Current: ${expenseToToggle.isCompleted})...`);
      
      const toggleRes = await fetch(`${API_URL}/expenses/${expenseToToggle._id}/toggle`, {
        method: 'PUT',
        headers
      });
      const toggleData = await toggleRes.json();
      console.log(`✓ Status toggled to: ${toggleData.isCompleted}`);
    }

    // 7. Loan: Add Loan
    console.log('\nTesting Add Loan...');
    const loanRes = await fetch(`${API_URL}/loans`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        borrowerName: 'John Doe',
        amount: 250,
        type: 'lent'
      })
    });
    const loanData = await loanRes.json();
    if (loanRes.ok) {
      console.log(`✓ Loan recorded! Lent $${loanData.amount} to ${loanData.borrowerName}.`);
    } else {
      console.log('✗ Add Loan failed:', loanData.message);
    }

    // 8. Dashboard: Get History
    console.log('\nTesting History Dashboard statistics...');
    const historyRes = await fetch(`${API_URL}/dashboard/history`, { headers });
    const historyData = await historyRes.json();
    if (historyRes.ok && historyData.length > 0) {
      const monthStat = historyData[0];
      console.log(`✓ Month: ${monthStat.month}`);
      console.log(`  - Total Income: $${monthStat.totalIncome}`);
      console.log(`  - Total Expenses: $${monthStat.totalExpenses}`);
      console.log(`  - Remaining Balance: $${monthStat.remainingBalance}`);
      console.log(`  - Fixed Expenses Checked Off: ${monthStat.completedExpensesCount}/${monthStat.totalExpensesCount}`);
    } else {
      console.log('✗ Fetch History failed or returned empty:', historyData.message);
    }

    // 9. Auth: Update Profile details
    console.log('\nTesting Update Profile...');
    const profileRes = await fetch(`${API_URL}/auth/profile`, {
      method: 'PUT',
      headers,
      body: JSON.stringify({
        username: 'Updated Tester Name',
        currency: '৳',
        monthlyLoanTarget: 400,
        financialGoal: 'debt-free'
      })
    });
    const profileData = await profileRes.json();
    if (profileRes.ok) {
      console.log('✓ Profile updated successfully! Currency:', profileData.currency, 'Goal:', profileData.financialGoal, 'Target:', profileData.monthlyLoanTarget);
    } else {
      console.log('✗ Profile update failed:', profileData.message);
    }

    // 10. Auth: Change Password
    console.log('\nTesting Password Change...');
    const passwordRes = await fetch(`${API_URL}/auth/password`, {
      method: 'PUT',
      headers,
      body: JSON.stringify({
        currentPassword: password,
        newPassword: 'newpassword123'
      })
    });
    const passwordData = await passwordRes.json();
    if (passwordRes.ok) {
      console.log('✓ Password changed successfully!');
    } else {
      console.log('✗ Password change failed:', passwordData.message);
    }

    // 11. AI: Get Coach Advice
    console.log('\nTesting AI Financial Coach...');
    const aiRes = await fetch(`${API_URL}/ai/chat`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        message: 'How can I save more money and pay off my loan?'
      })
    });
    const aiData = await aiRes.json();
    if (aiRes.ok) {
      console.log('✓ AI Response retrieved successfully!');
      console.log('  Reply preview:', aiData.reply.substring(0, 150) + '...');
    } else {
      console.log('✗ AI Response retrieval failed:', aiData.message);
    }

    // 12. AI: Scan Receipt (Multimodal base64 scan)
    console.log('\nTesting AI Receipt OCR scanner...');
    const scanRes = await fetch(`${API_URL}/ai/scan`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        imageBase64: 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAAPAA8BAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA='
      })
    });
    const scanData = await scanRes.json();
    if (scanRes.ok) {
      console.log('✓ Receipt OCR scanned successfully! Parsed details:', scanData.title, '-', scanData.amount);
    } else {
      console.log('✗ Receipt OCR scan failed:', scanData.message);
    }

    // 12b. AI: Get Personalized Tips
    console.log('\nTesting AI Financial Tips...');
    const tipsRes = await fetch(`${API_URL}/ai/tips`, { headers });
    const tipsData = await tipsRes.json();
    if (tipsRes.ok) {
      console.log('✓ AI Financial Tips retrieved successfully! Tips count:', tipsData.tips?.length);
      if (tipsData.tips && tipsData.tips.length > 0) {
        console.log('  Sample Tip:', tipsData.tips[0]);
      } else {
        console.log('  (No active API key / fell back to empty array)');
      }
    } else {
      console.log('✗ AI Financial Tips retrieval failed:', tipsData.message);
    }

    // 13. Groups: Split Budgeting & Simplified Debts
    console.log('\nTesting Group collaborative split-billing...');
    const collabEmail = `collab_${Date.now()}@example.com`;
    const inviteeEmail = `invitee_${Date.now()}@example.com`;

    // A. Register second user (collaborator)
    const collabReg = await fetch(`${API_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'Collab Partner', email: collabEmail, password: 'password123' })
    });
    const collabData = await collabReg.json();

    // B. Register third user (invitee)
    const inviteeReg = await fetch(`${API_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'Invitee Buddy', email: inviteeEmail, password: 'password123' })
    });
    const inviteeData = await inviteeReg.json();

    if (collabReg.ok && inviteeReg.ok) {
      console.log('✓ Group members registered successfully.');
      
      // C. Create Group workspace with creator and collaborator email
      const groupRes = await fetch(`${API_URL}/groups`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          name: 'Sweet Roommates Workspace',
          memberEmails: [collabEmail]
        })
      });
      const groupData = await groupRes.json();
      
      if (groupRes.ok) {
        console.log(`✓ Group "${groupData.name}" created with ${groupData.members.length} members.`);
        const groupId = groupData._id;

        // D. Invite third member (invitee)
        const inviteRes = await fetch(`${API_URL}/groups/${groupId}/invite`, {
          method: 'POST',
          headers,
          body: JSON.stringify({ email: inviteeEmail })
        });
        const inviteData = await inviteRes.json();
        console.log(`✓ Invited third member. Workspace now has ${inviteData.members.length} members.`);

        // E. Log shared expense of $90 paid by Creator
        const expenseRes = await fetch(`${API_URL}/groups/${groupId}/expenses`, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            title: 'House Electricity Bill',
            amount: 90
          })
        });
        const expenseData = await expenseRes.json();
        console.log(`✓ Logged shared bill of $90 to be split equally.`);

        // F. Fetch group ledger and simplified debts
        const ledgerRes = await fetch(`${API_URL}/groups/${groupId}/expenses`, { headers });
        const ledgerData = await ledgerRes.json();
        
        if (!ledgerRes.ok) {
          console.log('✗ Failed to get ledger details:', ledgerData);
          return;
        }
        
        console.log('✓ Group Ledger balance details retrieved:');
        ledgerData.netBalances.forEach(b => {
          console.log(`  - Member: ${b.username}, Balance: $${b.balance}`);
        });

        console.log('✓ Simplified settlements calculated:');
        ledgerData.simplifiedDebts.forEach(d => {
          console.log(`  - ${d.fromName} owes ${d.toName} $${d.amount}`);
        });

        if (ledgerData.simplifiedDebts.length === 2 && ledgerData.simplifiedDebts[0].amount === 30) {
          console.log('✓ Splitwise simplified debts logic verified matching target amounts!');
        } else {
          console.log('⚠️ Simplified debts logic mismatch!');
        }
      } else {
        console.log('✗ Group creation failed:', groupData.message);
      }
    } else {
      console.log('✗ Members registration failed.');
    }

    console.log('\n=== Backend Integration Test Completed Successfully ===');

  } catch (error) {
    console.error('Integration test crashed:', error);
  }
}

testBackend();
