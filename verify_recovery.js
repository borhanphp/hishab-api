const testEmail = `recovery_test_${Date.now()}@example.com`;
const testUsername = 'recovery_test_user';
const initialPassword = 'oldpassword123';
const newPassword = 'newpassword123';
const TEST_PORT = process.env.TEST_PORT || '5001';
const BASE_URL = `http://localhost:${TEST_PORT}/api/auth`;

async function runTest() {
  console.log('--- Starting Password Recovery Integration Test ---');
  try {
    // 1. Register User
    console.log(`\n1. Registering user with email: ${testEmail}...`);
    const regRes = await fetch(`${BASE_URL}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: testUsername,
        email: testEmail,
        password: initialPassword
      })
    });
    
    const regData = await regRes.json();
    if (!regRes.ok) {
      throw new Error(`Registration failed: ${JSON.stringify(regData)}`);
    }
    console.log(`Registration successful. User ID: ${regData._id}`);

    // 2. Request Password Reset (Forgot Password)
    console.log('\n2. Requesting password reset...');
    const forgotRes = await fetch(`${BASE_URL}/forgot-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: testEmail })
    });

    const forgotData = await forgotRes.json();
    if (!forgotRes.ok) {
      throw new Error(`Forgot password request failed: ${JSON.stringify(forgotData)}`);
    }
    
    const resetToken = forgotData.token;
    console.log(`Forgot password request successful. Received token: ${resetToken}`);
    if (!resetToken) {
      throw new Error('Forgot password response did not include reset token');
    }

    // 3. Reset Password using the token
    console.log(`\n3. Resetting password using token: ${resetToken}...`);
    const resetRes = await fetch(`${BASE_URL}/reset-password/${resetToken}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: newPassword })
    });

    const resetData = await resetRes.json();
    if (!resetRes.ok) {
      throw new Error(`Password reset failed: ${JSON.stringify(resetData)}`);
    }
    console.log('Password reset successful.');

    // 4. Try logging in with the old password (should fail)
    console.log('\n4. Verifying old password fails to log in...');
    const oldLoginRes = await fetch(`${BASE_URL}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testEmail,
        password: initialPassword
      })
    });

    if (oldLoginRes.ok) {
      throw new Error('Old password login should have failed but succeeded');
    }
    console.log('Old password login failed as expected.');

    // 5. Try logging in with the new password (should succeed)
    console.log('\n5. Verifying new password logs in successfully...');
    const newLoginRes = await fetch(`${BASE_URL}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testEmail,
        password: newPassword
      })
    });

    const newLoginData = await newLoginRes.json();
    if (!newLoginRes.ok) {
      throw new Error(`New password login failed: ${JSON.stringify(newLoginData)}`);
    }
    console.log(`New password login successful. Token received: ${newLoginData.token ? 'YES' : 'NO'}`);
    
    console.log('\n======================================');
    console.log('PASSWORD RECOVERY TEST PASSED SUCCESSFULLY!');
    console.log('======================================');
  } catch (error) {
    console.error('\nTest failed with error:', error.message);
    process.exit(1);
  }
}

runTest();
