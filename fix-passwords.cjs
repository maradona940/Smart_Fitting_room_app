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

async function fixPasswords() {
  const client = await pool.connect();
  
  try {
    console.log('🔐 Fixing password hashes in the database...\n');
    
    // Hash the password: password123
    const password = 'password123';
    const hashedPassword = await bcrypt.hash(password, 10);
    
    console.log('Generated hash for "password123"');
    console.log(`Hash: ${hashedPassword}\n`);
    
    // Update all users with the correct hash
    const users = ['john_sales', 'sarah_manager', 'mike_sales'];
    
    for (const username of users) {
      const result = await client.query(
        'UPDATE users SET password_hash = $1 WHERE username = $2 RETURNING id, username, role',
        [hashedPassword, username]
      );
      
      if (result.rows.length > 0) {
        const user = result.rows[0];
        console.log(`✅ Updated: ${user.username} (${user.role})`);
      }
    }
    
    console.log('\n✅ All passwords updated successfully!');
    console.log('🔑 Password for all users: password123\n');
    
    // Verify by listing users
    const usersResult = await client.query('SELECT username, role FROM users ORDER BY username');
    console.log('👥 Updated Users:');
    usersResult.rows.forEach(user => {
      console.log(`   - ${user.username} (${user.role}) - password: password123`);
    });
    
    console.log('\n🎯 Now you can login with these credentials!');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    client.release();
    await pool.end();
  }
}

fixPasswords();
