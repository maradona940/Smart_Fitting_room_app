const http = require('http');

async function testInvalidLogin() {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({ 
      username: 'randomuser', 
      password: 'wrongpassword123' 
    });
    
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
        resolve({
          statusCode: res.statusCode,
          body: JSON.parse(body)
        });
      });
    });
    
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

async function run() {
  console.log('🧪 Testing Login Validation\n');
  console.log('Attempting login with INVALID credentials:');
  console.log('  Username: randomuser');
  console.log('  Password: wrongpassword123\n');
  
  const result = await testInvalidLogin();
  
  if (result.statusCode === 401) {
    console.log('✅ PERFECT! Login correctly rejected invalid credentials');
    console.log(`   Status: ${result.statusCode}`);
    console.log(`   Error: ${result.body.error}\n`);
    console.log('🎯 Your authentication is working correctly!');
    console.log('   ✓ Only valid database users can login');
    console.log('   ✓ Invalid credentials are rejected');
  } else {
    console.log('❌ PROBLEM: Invalid credentials were accepted!');
    console.log(`   Status: ${result.statusCode}`);
    console.log(`   Response:`, result.body);
  }
}

run().catch(console.error);
