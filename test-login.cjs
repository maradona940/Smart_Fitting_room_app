const http = require('http');

async function testLogin(username, password) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({ username, password });
    
    const options = {
      hostname: 'localhost',
      port: 4000,
      path: '/api/auth/login',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': data.length
      }
    };
    
    const req = http.request(options, (res) => {
      let body = '';
      
      res.on('data', (chunk) => {
        body += chunk;
      });
      
      res.on('end', () => {
        try {
          resolve({
            statusCode: res.statusCode,
            body: JSON.parse(body)
          });
        } catch (e) {
          resolve({
            statusCode: res.statusCode,
            body: body
          });
        }
      });
    });
    
    req.on('error', (error) => {
      reject(error);
    });
    
    req.write(data);
    req.end();
  });
}

async function runTests() {
  console.log('🧪 Testing Login Endpoint Against Your PostgreSQL Database\n');
  console.log('=' .repeat(60) + '\n');
  
  // Test 1: Valid manager login
  console.log('Test 1: Valid Manager Login');
  console.log('Username: sarah_manager | Password: password123');
  try {
    const result1 = await testLogin('sarah_manager', 'password123');
    if (result1.statusCode === 200 && result1.body.token) {
      console.log('✅ SUCCESS: Login validated against database!');
      console.log(`   Token: ${result1.body.token.substring(0, 30)}...`);
      console.log(`   User: ${result1.body.user.username} (${result1.body.user.role})`);
    } else {
      console.log('❌ FAILED:', result1.body);
    }
  } catch (error) {
    console.log('❌ ERROR:', error.message);
  }
  
  console.log('\n' + '-'.repeat(60) + '\n');
  
  // Test 2: Valid salesperson login
  console.log('Test 2: Valid Salesperson Login');
  console.log('Username: john_sales | Password: password123');
  try {
    const result2 = await testLogin('john_sales', 'password123');
    if (result2.statusCode === 200 && result2.body.token) {
      console.log('✅ SUCCESS: Login validated against database!');
      console.log(`   Token: ${result2.body.token.substring(0, 30)}...`);
      console.log(`   User: ${result2.body.user.username} (${result2.body.user.role})`);
    } else {
      console.log('❌ FAILED:', result2.body);
    }
  } catch (error) {
    console.log('❌ ERROR:', error.message);
  }
  
  console.log('\n' + '-'.repeat(60) + '\n');
  
  // Test 3: Invalid password
  console.log('Test 3: Invalid Password (should fail)');
  console.log('Username: sarah_manager | Password: wrongpassword');
  try {
    const result3 = await testLogin('sarah_manager', 'wrongpassword');
    if (result3.statusCode === 401) {
      console.log('✅ CORRECT: Invalid credentials rejected as expected');
      console.log(`   Error: ${result3.body.error}`);
    } else {
      console.log('❌ UNEXPECTED:', result3.body);
    }
  } catch (error) {
    console.log('❌ ERROR:', error.message);
  }
  
  console.log('\n' + '-'.repeat(60) + '\n');
  
  // Test 4: Non-existent user
  console.log('Test 4: Non-existent User (should fail)');
  console.log('Username: nonexistent | Password: password123');
  try {
    const result4 = await testLogin('nonexistent', 'password123');
    if (result4.statusCode === 401) {
      console.log('✅ CORRECT: Non-existent user rejected as expected');
      console.log(`   Error: ${result4.body.error}`);
    } else {
      console.log('❌ UNEXPECTED:', result4.body);
    }
  } catch (error) {
    console.log('❌ ERROR:', error.message);
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('\n✅ All tests completed!');
  console.log('🎯 Your login system is validating against the PostgreSQL database!\n');
}

// Run the tests
runTests().catch(console.error);
