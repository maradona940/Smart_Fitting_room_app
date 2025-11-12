const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'fitting_room_system',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD,
});

async function testConnection() {
  const client = await pool.connect();
  
  try {
    console.log('🔍 Testing Database Connection...\n');
    
    // Test connection
    const timeResult = await client.query('SELECT NOW()');
    console.log('✅ Connected to PostgreSQL');
    console.log(`   Current time: ${timeResult.rows[0].now}\n`);
    
    // Check database name
    const dbResult = await client.query('SELECT current_database()');
    console.log(`📊 Database: ${dbResult.rows[0].current_database}\n`);
    
    // List all tables
    const tablesResult = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name
    `);
    
    console.log('📋 Tables in database:');
    tablesResult.rows.forEach(row => console.log(`   ✓ ${row.table_name}`));
    console.log('');
    
    // Check users
    const usersResult = await client.query('SELECT id, username, role FROM users ORDER BY id');
    console.log('👥 Users in database:');
    usersResult.rows.forEach(user => {
      console.log(`   ${user.id}. ${user.username} (${user.role})`);
    });
    console.log('');
    
    // Check rooms
    const roomsResult = await client.query('SELECT COUNT(*) FROM rooms');
    console.log(`🚪 Total Rooms: ${roomsResult.rows[0].count}`);
    
    // Check products
    const productsResult = await client.query('SELECT COUNT(*) FROM products');
    console.log(`📦 Total Products: ${productsResult.rows[0].count}\n`);
    
    // Test password hash for one user
    const userCheck = await client.query(
      'SELECT username, password_hash, role FROM users WHERE username = $1',
      ['sarah_manager']
    );
    
    if (userCheck.rows.length > 0) {
      const user = userCheck.rows[0];
      console.log('🔐 Sample User Check (sarah_manager):');
      console.log(`   Username: ${user.username}`);
      console.log(`   Role: ${user.role}`);
      console.log(`   Password Hash: ${user.password_hash.substring(0, 30)}...`);
      console.log(`   ✅ User exists and ready for login\n`);
    }
    
    console.log('✅ Database is properly configured!');
    console.log('\n🎯 You can test login at: http://localhost:4000/api/auth/login');
    console.log('   POST with body: { "username": "sarah_manager", "password": "password123" }\n');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    client.release();
    await pool.end();
  }
}

testConnection();
