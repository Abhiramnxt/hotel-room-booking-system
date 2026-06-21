const BASE_URL = process.env.TEST_PORT ? `http://localhost:${process.env.TEST_PORT}` : 'http://localhost:3000';

async function verifyPasswordDisplay() {
  console.log('=== STARTING GUEST TEMPORARY PASSWORD DISPLAY VERIFICATION ===');

  try {
    // 1. Create a Front Desk guest account
    console.log('\n[Step 1] Creating Front Desk Guest Account...');
    const guestData = {
      full_name: "Front Desk Password Display Guest",
      mobile_number: "+919876543201",
      email: `fd_temp_pass_${Date.now()}@gmail.com`,
      stay_duration: "2 Nights"
    };

    const createRes = await fetch(`${BASE_URL}/api/auth/guest-accounts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(guestData)
    });

    if (!createRes.ok) {
      const errTxt = await createRes.text();
      throw new Error(`Failed to create guest account: ${errTxt}`);
    }

    const createJson = await createRes.json();
    const account = createJson.account;
    console.log(`Account Created! Guest ID: ${account.guest_id_str}, Username: ${account.username}`);
    console.log(`Password Hash in DB: "${account.password_hash}"`);
    console.log(`first_login_password_changed: ${account.first_login_password_changed}`);

    // Verify it is not hashed
    if (!account.password_hash.startsWith('Temp@') || account.password_hash.length === 64) {
      throw new Error(`Expected temporary password to start with "Temp@" and not be hashed (length 64), but got "${account.password_hash}"`);
    }
    if (account.first_login_password_changed !== false && account.first_login_password_changed !== 0) {
      throw new Error(`Expected first_login_password_changed to be false for a newly created Front Desk account, but got ${account.first_login_password_changed}`);
    }
    console.log('✅ Verified Front Desk newly provisioned account has unhashed password and needs reset.');

    // 2. Regenerate Credentials
    console.log('\n[Step 2] Regenerating Credentials...');
    const regenRes = await fetch(`${BASE_URL}/api/auth/regenerate-credentials`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ account_id: account.account_id })
    });

    if (!regenRes.ok) {
      const errTxt = await regenRes.text();
      throw new Error(`Regenerating credentials failed: ${errTxt}`);
    }

    const regenJson = await regenRes.json();
    const regeneratedAccount = regenJson.account;
    console.log(`Regenerated Password: "${regeneratedAccount.password_hash}"`);
    console.log(`first_login_password_changed: ${regeneratedAccount.first_login_password_changed}`);

    // Verify regenerated password is plain text and needs reset
    if (!regeneratedAccount.password_hash.startsWith('Temp@') || regeneratedAccount.password_hash.length === 64) {
      throw new Error(`Expected regenerated temporary password to start with "Temp@", but got "${regeneratedAccount.password_hash}"`);
    }
    
    // Now verify the database actually stores first_login_password_changed = 0 by fetching the list
    console.log('\n[Step 3] Querying DB accounts list to verify state persistence...');
    const listRes = await fetch(`${BASE_URL}/api/auth/guest-accounts`);
    if (!listRes.ok) throw new Error(`Failed to fetch guest accounts: ${listRes.statusText}`);
    const listJson = await listRes.json();
    const fetchedAcc = listJson.accounts.find(a => a.account_id === account.account_id);
    
    console.log(`Fetched Account - password: "${fetchedAcc.password_hash}", first_login_password_changed: ${fetchedAcc.first_login_password_changed}`);
    if (fetchedAcc.first_login_password_changed !== false && fetchedAcc.first_login_password_changed !== 0) {
      throw new Error(`Expected first_login_password_changed to be false/0 in DB after regeneration, but got ${fetchedAcc.first_login_password_changed}`);
    }
    console.log('✅ Verified first_login_password_changed is properly reset to false in the database upon regeneration.');

    // 4. Create a Self-Registered guest account
    console.log('\n[Step 4] Creating Self-Registered Guest Account...');
    const selfRegisterData = {
      full_name: "Self Registered Password Display Guest",
      mobile_number: "+919876543202",
      email: `self_reg_temp_pass_${Date.now()}@gmail.com`,
      password: "customSecretPassword123",
      confirm_password: "customSecretPassword123",
      gender: "Male",
      city: "Bangalore",
      preferred_room_type: "Deluxe Suite"
    };

    const registerRes = await fetch(`${BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(selfRegisterData)
    });

    if (!registerRes.ok) {
      const errTxt = await registerRes.text();
      throw new Error(`Failed to self-register: ${errTxt}`);
    }

    const registerJson = await registerRes.json();
    const selfAccount = registerJson.account;
    console.log(`Self Account Created! Username: ${selfAccount.username}`);
    console.log(`Password Hash in DB: "${selfAccount.password_hash}"`);
    console.log(`first_login_password_changed: ${selfAccount.first_login_password_changed}`);

    // Verify it is a 64-character hash
    if (selfAccount.password_hash.length !== 64) {
      throw new Error(`Expected self-registered password to be hashed to 64 chars, but got "${selfAccount.password_hash}" (length ${selfAccount.password_hash.length})`);
    }
    if (selfAccount.first_login_password_changed !== true && selfAccount.first_login_password_changed !== 1) {
      throw new Error(`Expected first_login_password_changed to be true for self-registered account, but got ${selfAccount.first_login_password_changed}`);
    }
    console.log('✅ Verified self-registered guest account has a SHA-256 hashed password and does not need a reset.');

    console.log('\n=== GUEST TEMPORARY PASSWORD DISPLAY VERIFICATION SUCCESSFUL! ALL TESTS PASSED ===');
  } catch (err) {
    console.error('\n❌ GUEST TEMPORARY PASSWORD DISPLAY VERIFICATION FAILED:', err);
    process.exit(1);
  }
}

verifyPasswordDisplay();
