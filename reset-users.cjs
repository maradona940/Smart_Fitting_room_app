const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
require('dotenv').config({ path: '.env.local' });

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'fitting_room_system',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD,
});

async function resetUsers() {
  const client = await pool.connect();
  
  try {
    console.log('🗑️  Deleting all existing users...\n');
    
    // Delete all users
    const deleteResult = await client.query('DELETE FROM users');
    console.log(`✅ Deleted ${deleteResult.rowCount} user(s)\n`);
    
    console.log('🔐 Creating new users with password: password123\n');
    
    // Hash the password: password123
    const password = 'password123';
    const hashedPassword = await bcrypt.hash(password, 10);
    
    console.log('Generated hash for "password123"');
    console.log(`Hash: ${hashedPassword}\n`);
    
    // Create users
    const users = [
      { username: 'john_sales', role: 'salesperson' },
      { username: 'sarah_manager', role: 'manager' },
      { username: 'mike_sales', role: 'salesperson' }
    ];
    
    const createdUsers = [];
    
    for (const user of users) {
      const result = await client.query(
        'INSERT INTO users (username, password_hash, role) VALUES ($1, $2, $3) RETURNING id, username, role',
        [user.username, hashedPassword, user.role]
      );
      
      if (result.rows.length > 0) {
        const created = result.rows[0];
        createdUsers.push(created);
        console.log(`✅ Created: ${created.username} (${created.role}) - ID: ${created.id}`);
      }
    }
    
    console.log('\n✅ All users created successfully!');
    console.log('\n🔑 Login Credentials:');
    console.log('   Password for all users: password123\n');
    
    console.log('👥 Available Users:');
    createdUsers.forEach(user => {
      console.log(`   - ${user.username} (${user.role})`);
    });
    
    console.log('\n🎯 You can now login with these credentials!');
    console.log('   Example: username: sarah_manager, password: password123\n');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.code) {
      console.error('   Error code:', error.code);
    }
  } finally {
    client.release();
    await pool.end();
  }
}

resetUsers();

