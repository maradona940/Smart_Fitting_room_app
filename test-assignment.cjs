// Test script for the new room assignment endpoint
const API_BASE_URL = process.env.API_URL || 'http://localhost:4000';

// Test credentials
const TEST_USER = {
  username: 'john_sales',
  password: 'password123'
};

async function testAssignment() {
  try {
    console.log('🧪 Testing Room Assignment Endpoint\n');

    // Step 1: Login
    console.log('1️⃣ Logging in...');
    const loginRes = await fetch(`${API_BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(TEST_USER),
    });

    if (!loginRes.ok) {
      const error = await loginRes.json();
      throw new Error(`Login failed: ${error.error}`);
    }

    const loginData = await loginRes.json();
    const token = loginData.token;
    console.log('✅ Logged in successfully\n');

    // Step 2: Assign room with customer card and products
    console.log('2️⃣ Assigning room with customer card and products...');
    const assignData = {
      customerCardId: 'RFID-TEST-001',
      productIds: ['SKU-0001', 'SKU-0003', 'SKU-0005'] // Summer Dress, Cotton Shirt, Denim Jeans
    };

    const assignRes = await fetch(`${API_BASE_URL}/api/rooms/assign`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(assignData),
    });

    if (!assignRes.ok) {
      const error = await assignRes.json();
      throw new Error(`Assignment failed: ${error.error || error.detail}`);
    }

    const assignResult = await assignRes.json();
    console.log('✅ Room assigned successfully!');
    console.log(`   Room: ${assignResult.room.number}`);
    console.log(`   Status: ${assignResult.room.status}`);
    console.log(`   Customer Card: ${assignResult.room.customerCard}`);
    console.log(`   Predicted Duration: ${assignResult.session.predictedDurationMinutes} minutes`);
    console.log(`   Session ID: ${assignResult.session.sessionId}`);
    console.log(`   AI Message: ${assignResult.ai.message}\n`);

    // Step 3: Get room details to verify
    console.log('3️⃣ Fetching room details to verify assignment...');
    const detailsRes = await fetch(`${API_BASE_URL}/api/rooms/${assignResult.room.id}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      },
    });

    if (!detailsRes.ok) {
      throw new Error('Failed to fetch room details');
    }

    const details = await detailsRes.json();
    console.log('✅ Room details fetched:');
    console.log(`   Products in room: ${details.products.length}`);
    console.log(`   Predicted Duration: ${details.ai?.predictedDurationMinutes || 'N/A'} minutes`);
    details.products.forEach(p => {
      console.log(`     - ${p.name} (${p.code}) - Scanned In: ${p.scannedIn}`);
    });

    console.log('\n✨ Test completed successfully!');
    console.log('\n📋 Next steps:');
    console.log('   - Room should now show as "occupied" in the dashboard');
    console.log('   - View room details to see predicted duration');
    console.log('   - Scan products out to test automatic room availability');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    process.exit(1);
  }
}

testAssignment();

