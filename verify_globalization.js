const testEmail = `global_test_${Date.now()}@example.com`;
const testUsername = 'global_test_user';
const testPassword = 'password123';
const TEST_PORT = process.env.TEST_PORT || '5000';
const BASE_AUTH_URL = `http://localhost:${TEST_PORT}/api/auth`;
const BASE_AI_URL = `http://localhost:${TEST_PORT}/api/ai`;

async function runTest() {
  console.log('=== Starting Hishab Globalization integration test ===');
  try {
    // 1. Register User
    console.log(`\n1. Registering user with email: ${testEmail}...`);
    const regRes = await fetch(`${BASE_AUTH_URL}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: testUsername,
        email: testEmail,
        password: testPassword
      })
    });
    
    const regData = await regRes.json();
    if (!regRes.ok) {
      throw new Error(`Registration failed: ${JSON.stringify(regData)}`);
    }
    console.log(`Registration successful. Token: ${regData.token ? 'YES' : 'NO'}`);
    const token = regData.token;

    // 2. Fetch User Profile
    console.log('\n2. Fetching profile (GET /api/auth/me) to verify default language...');
    const meRes = await fetch(`${BASE_AUTH_URL}/me`, {
      method: 'GET',
      headers: { 
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json' 
      }
    });
    const meData = await meRes.json();
    if (!meRes.ok) {
      throw new Error(`Fetch profile failed: ${JSON.stringify(meData)}`);
    }
    console.log(`✓ Default language is: "${meData.language}" (Expected: "en")`);
    if (meData.language !== 'en') {
      throw new Error(`Expected default language to be 'en', but got '${meData.language}'`);
    }

    // 3. Update User Profile Language (PUT /api/auth/profile) to 'bn' (Bengali)
    console.log('\n3. Updating user language to Bengali ("bn")...');
    const updateRes = await fetch(`${BASE_AUTH_URL}/profile`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        language: 'bn',
        currency: '৳'
      })
    });
    const updateData = await updateRes.json();
    if (!updateRes.ok) {
      throw new Error(`Profile update failed: ${JSON.stringify(updateData)}`);
    }
    console.log(`✓ Profile update response contains language: "${updateData.language}"`);
    console.log(`✓ Profile update response contains currency: "${updateData.currency}"`);
    if (updateData.language !== 'bn') {
      throw new Error(`Expected language to be 'bn', but got '${updateData.language}'`);
    }

    // 4. Test Mock AI Coach chat response in Bengali (since no keys are set)
    console.log('\n4. Testing Mock AI Coach chat response in Bengali...');
    const aiRes = await fetch(`${BASE_AI_URL}/chat`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        message: 'Hello AI Coach, can I get a summary or some advice?'
      })
    });
    const aiData = await aiRes.json();
    if (!aiRes.ok) {
      throw new Error(`AI Coach request failed: ${JSON.stringify(aiData)}`);
    }
    console.log('\nAI Coach Response (Bengali Mock fallback):');
    console.log('-------------------------------------------');
    console.log(aiData.reply);
    console.log('-------------------------------------------');

    // Simple assertion: response should contain Bengali keywords (e.g., "হ্যালো", "সঞ্চয়" or "ঋণ")
    if (!aiData.reply.includes('হ্যালো') && !aiData.reply.includes('সঞ্চয়') && !aiData.reply.includes('আয়')) {
      throw new Error('AI Coach response does not seem to be in Bengali!');
    }
    console.log('✓ Verified: AI Coach successfully responded in Bengali!');

    console.log('\n=============================================');
    console.log('GLOBALIZATION BACKEND TEST PASSED SUCCESSFULLY!');
    console.log('=============================================');
  } catch (error) {
    console.error('\nTest failed with error:', error.message);
    process.exit(1);
  }
}

runTest();
