const API_URL = 'http://localhost:5000/api';

async function verifySocialFinance() {
  console.log('=== Starting Integration Tests for Social Finance (Phase 4) ===\n');

  try {
    const timestamp = Date.now();
    const emails = [
      `user_a_${timestamp}@example.com`,
      `user_b_${timestamp}@example.com`,
      `user_c_${timestamp}@example.com`
    ];
    const password = 'password123';
    const users = [];

    // 1. Register 3 Users (A, B, C)
    for (let i = 0; i < 3; i++) {
      const username = `User ${String.fromCharCode(65 + i)}`;
      console.log(`Registering ${username}: ${emails[i]}`);
      
      const regRes = await fetch(`${API_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, email: emails[i], password })
      });
      
      const regData = await regRes.json();
      if (!regRes.ok) {
        console.log(`✗ Registration failed for User ${i}:`, regData.message);
        process.exit(1);
      }
      
      users.push({
        id: regData._id,
        username,
        token: regData.token,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${regData.token}`
        }
      });
    }
    console.log('✓ Registered all 3 test users successfully.');

    // 2. User A creates a Friend Group
    console.log('\nUser A creating a Friend Group...');
    const createGroupRes = await fetch(`${API_URL}/social/groups`, {
      method: 'POST',
      headers: users[0].headers,
      body: JSON.stringify({ name: 'Budget Bros' })
    });
    const groupData = await createGroupRes.json();
    if (createGroupRes.ok && groupData.inviteCode) {
      console.log(`✓ Group "${groupData.name}" created successfully. Invite Code: ${groupData.inviteCode}`);
    } else {
      console.log('✗ Failed to create group:', groupData);
      process.exit(1);
    }
    const inviteCode = groupData.inviteCode;
    const groupId = groupData._id;

    // 3. User B joins the Friend Group
    console.log('\nUser B joining the group using invite code...');
    const joinBRes = await fetch(`${API_URL}/social/groups/join`, {
      method: 'POST',
      headers: users[1].headers,
      body: JSON.stringify({ inviteCode })
    });
    const joinBData = await joinBRes.json();
    if (joinBRes.ok && joinBData.members.length === 2) {
      console.log('✓ User B joined group successfully. Member count:', joinBData.members.length);
    } else {
      console.log('✗ User B failed to join group:', joinBData);
      process.exit(1);
    }

    // 4. User C joins the Friend Group
    console.log('\nUser C joining the group using invite code...');
    const joinCRes = await fetch(`${API_URL}/social/groups/join`, {
      method: 'POST',
      headers: users[2].headers,
      body: JSON.stringify({ inviteCode })
    });
    const joinCData = await joinCRes.json();
    if (joinCRes.ok && joinCData.members.length === 3) {
      console.log('✓ User C joined group successfully. Member count:', joinCData.members.length);
    } else {
      console.log('✗ User C failed to join group:', joinCData);
      process.exit(1);
    }

    // 5. User B joins "No Coffee Challenge"
    console.log('\nUser B joining No Coffee Challenge...');
    const joinChallengeRes = await fetch(`${API_URL}/social/challenges/join`, {
      method: 'POST',
      headers: users[1].headers,
      body: JSON.stringify({ type: 'coffee' })
    });
    const challengeData = await joinChallengeRes.json();
    if (joinChallengeRes.ok && challengeData.type === 'coffee') {
      console.log(`✓ Joined challenge successfully: "${challengeData.name}" (Target: $${challengeData.targetAmount})`);
    } else {
      console.log('✗ Failed to join challenge:', challengeData);
      process.exit(1);
    }
    const challengeId = challengeData._id;

    // 6. User B logs progress in active challenge
    console.log('\nUser B logging $5.00 savings progress on active challenge...');
    const logRes = await fetch(`${API_URL}/social/challenges/${challengeId}/log`, {
      method: 'POST',
      headers: users[1].headers,
      body: JSON.stringify({ amount: 5 })
    });
    const logData = await logRes.json();
    if (logRes.ok && logData.currentAmount === 5 && logData.streakDays === 1) {
      console.log(`✓ Savings logged successfully. Current Amount: $${logData.currentAmount}, Streak: ${logData.streakDays} day(s)`);
    } else {
      console.log('✗ Failed to log progress on challenge:', logData);
      process.exit(1);
    }

    // 7. User B creates a savings goal
    console.log('\nUser B creating a savings goal ("Japan Trip 2027")...');
    const goalRes = await fetch(`${API_URL}/savings`, {
      method: 'POST',
      headers: users[1].headers,
      body: JSON.stringify({
        name: 'Japan Trip 2027',
        targetAmount: 1000,
        currentAmount: 720
      })
    });
    const goalData = await goalRes.json();
    if (goalRes.ok) {
      console.log(`✓ Savings goal created: "${goalData.name}" ($${goalData.currentAmount} / $${goalData.targetAmount})`);
    } else {
      console.log('✗ Failed to create savings goal:', goalData);
      process.exit(1);
    }
    const goalId = goalData._id;

    // 8. User B toggles goal to Public
    console.log('\nUser B toggling savings goal to Public...');
    const toggleRes = await fetch(`${API_URL}/savings/${goalId}`, {
      method: 'PUT',
      headers: users[1].headers,
      body: JSON.stringify({ isPublic: true })
    });
    const toggleData = await toggleRes.json();
    if (toggleRes.ok && toggleData.isPublic === true) {
      console.log('✓ Goal visibility marked: Public to Friends');
    } else {
      console.log('✗ Failed to toggle goal visibility:', toggleData);
      process.exit(1);
    }

    // 9. User A cheers User B's public goal
    console.log('\nUser A cheering User B\'s public goal...');
    const cheer1Res = await fetch(`${API_URL}/social/goals/${goalId}/cheer`, {
      method: 'POST',
      headers: users[0].headers
    });
    const cheer1Data = await cheer1Res.json();
    if (cheer1Res.ok && cheer1Data.cheered === true && cheer1Data.count === 1) {
      console.log('✓ Goal cheered successfully. Cheers count:', cheer1Data.count);
    } else {
      console.log('✗ User A failed to cheer goal:', cheer1Data);
      process.exit(1);
    }

    // 10. User A cheers goal again (Uncheer check)
    console.log('\nUser A cheering again to test uncheering...');
    const cheer2Res = await fetch(`${API_URL}/social/goals/${goalId}/cheer`, {
      method: 'POST',
      headers: users[0].headers
    });
    const cheer2Data = await cheer2Res.json();
    if (cheer2Res.ok && cheer2Data.cheered === false && cheer2Data.count === 0) {
      console.log('✓ Goal uncheered successfully (toggled off). Cheers count:', cheer2Data.count);
    } else {
      console.log('✗ Toggle uncheer check failed:', cheer2Data);
      process.exit(1);
    }

    // Cheer one more time to test leaderboard inclusion
    await fetch(`${API_URL}/social/goals/${goalId}/cheer`, { method: 'POST', headers: users[0].headers });

    // 11. Retrieve Friend Group Leaderboard
    console.log('\nRetrieving Leaderboard for "Budget Bros" group...');
    const lbRes = await fetch(`${API_URL}/social/groups/${groupId}/leaderboard`, {
      method: 'GET',
      headers: users[0].headers
    });
    const lbData = await lbRes.json();
    if (lbRes.ok && lbData.leaderboard.length === 3) {
      console.log(`✓ Leaderboard fetched. Group: "${lbData.groupName}". Members count: ${lbData.leaderboard.length}`);
      
      // Print Rankings
      console.log('Rankings:');
      lbData.leaderboard.forEach((member, index) => {
        console.log(`  Rank ${index + 1}: ${member.username} | Health Score: ${member.healthScore} | Streak: ${member.savingsStreak}mo | Spending Control: ${member.spendingControl}%`);
        if (member.publicGoals.length > 0) {
          member.publicGoals.forEach(g => {
            console.log(`    - [Public Goal] "${g.name}" completed ${g.percent}% | Cheers received: ${g.cheersCount} | Cheered by me: ${g.hasCheered}`);
          });
        }
      });

      // Verify User B's public goal in User A's leaderboard query
      const userBMember = lbData.leaderboard.find(m => m.userId === users[1].id);
      if (userBMember && userBMember.publicGoals.length === 1 && userBMember.publicGoals[0].cheersCount === 1) {
        console.log('\n✓ Leaderboard public goal details and cheers counts verified successfully.');
      } else {
        console.log('✗ Leaderboard public goals detail mismatch:', userBMember);
        process.exit(1);
      }
    } else {
      console.log('✗ Failed to retrieve leaderboard details:', lbData);
      process.exit(1);
    }

    console.log('\n=== All Phase 4 Social Finance Features Verified Successfully! ===');
    process.exit(0);
  } catch (error) {
    console.error('Integration test crashed:', error);
    process.exit(1);
  }
}

verifySocialFinance();
