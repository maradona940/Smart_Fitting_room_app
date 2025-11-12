const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: '.env.local' });

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'fitting_room_system',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD,
});

async function setupDatabase() {
  const client = await pool.connect();
  
  try {
    console.log('📊 Starting database setup...\n');
    
    // Read the SQL setup script
    const sqlFilePath = path.join(__dirname, 'database', 'setup_database.sql');
    const sql = fs.readFileSync(sqlFilePath, 'utf8');
    
    // Execute the SQL script
    await client.query(sql);
    
    console.log('✅ Database setup completed successfully!\n');
    
    // Verify tables were created
    const tablesResult = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name
    `);
    
    console.log('📋 Tables created:');
    tablesResult.rows.forEach(row => console.log(`   - ${row.table_name}`));
    
    // Show summary
    const usersCount = await client.query('SELECT COUNT(*) FROM users');
    const roomsCount = await client.query('SELECT COUNT(*) FROM rooms');
    const productsCount = await client.query('SELECT COUNT(*) FROM products');
    
    console.log('\n📈 Sample data:');
    console.log(`   - Users: ${usersCount.rows[0].count}`);
    console.log(`   - Rooms: ${roomsCount.rows[0].count}`);
    console.log(`   - Products: ${productsCount.rows[0].count}`);
    
    console.log('\n🎉 Database is ready! You can now start the server with:');
    console.log('   npm run server\n');
    
  } catch (error) {
    console.error('❌ Error setting up database:', error.message);
    console.log('\nPlease check:');
    console.log('1. PostgreSQL is running');
    console.log('2. Database "fitting_room_system" exists');
    console.log('3. Credentials in .env.local are correct');
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

setupDatabase();
