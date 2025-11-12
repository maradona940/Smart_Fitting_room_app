#!/usr/bin/env node
/**
 * Comprehensive Database Integration Test
 * Tests all database operations used by the API
 */

const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'fitting_room_system',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD,
});

let testsPassed = 0;
let testsFailed = 0;

function test(name, fn) {
  return async () => {
    try {
      await fn();
      testsPassed++;
      console.log(`✅ ${name}`);
    } catch (error) {
      testsFailed++;
      console.error(`❌ ${name}: ${error.message}`);
    }
  };
}

async function runTests() {
  console.log('🧪 Testing Database Integration\n');

  // Test 1: Connection
  await test('Database connection', async () => {
    const result = await pool.query('SELECT NOW()');
    if (!result.rows[0]) throw new Error('No result from database');
  })();

  // Test 2: Tables exist
  await test('All tables exist', async () => {
    const tables = ['users', 'rooms', 'products', 'room_products', 'unlock_requests', 'alerts'];
    for (const table of tables) {
      const result = await pool.query(
        `SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = $1
        )`,
        [table]
      );
      if (!result.rows[0].exists) {
        throw new Error(`Table ${table} does not exist`);
      }
    }
  })();

  // Test 3: Users can be queried
  await test('Users table query', async () => {
    const result = await pool.query('SELECT id, username, role FROM users LIMIT 1');
    if (result.rows.length === 0) throw new Error('No users found');
  })();

  // Test 4: Rooms can be queried
  await test('Rooms table query', async () => {
    const result = await pool.query('SELECT id, room_number, status FROM rooms LIMIT 1');
    if (result.rows.length === 0) throw new Error('No rooms found');
  })();

  // Test 5: Products can be queried
  await test('Products table query', async () => {
    const result = await pool.query('SELECT id, sku, name FROM products LIMIT 1');
    if (result.rows.length === 0) throw new Error('No products found');
  })();

  // Test 6: Product search works
  await test('Product search query', async () => {
    const result = await pool.query(
      'SELECT id, sku, name FROM products WHERE sku ILIKE $1 OR name ILIKE $1 LIMIT 5',
      ['%dress%']
    );
    // Should work even if no results
  })();

  // Test 7: Room details with products join
  await test('Room details with products join', async () => {
    const result = await pool.query(`
      SELECT 
        r.id,
        r.room_number,
        r.status,
        COUNT(rp.id) as item_count
      FROM rooms r
      LEFT JOIN room_products rp ON r.id = rp.room_id AND rp.scanned_out_at IS NULL
      GROUP BY r.id
      LIMIT 1
    `);
    if (result.rows.length === 0) throw new Error('No rooms found');
  })();

  // Test 8: Room products query
  await test('Room products query', async () => {
    const result = await pool.query(`
      SELECT 
        p.id,
        p.sku,
        p.name,
        rp.scanned_in_at IS NOT NULL as scanned_in,
        rp.scanned_out_at IS NOT NULL as scanned_out
      FROM room_products rp
      JOIN products p ON rp.product_id = p.id
      LIMIT 1
    `);
    // Should work even if no room_products exist yet
  })();

  // Test 9: Alerts query
  await test('Alerts query with room join', async () => {
    const result = await pool.query(`
      SELECT 
        a.id,
        a.alert_type,
        a.severity,
        r.room_number
      FROM alerts a
      JOIN rooms r ON a.room_id = r.id
      LIMIT 1
    `);
    // Should work even if no alerts exist
  })();

  // Test 10: Unlock requests query
  await test('Unlock requests query', async () => {
    const result = await pool.query(`
      SELECT 
        ur.id,
        ur.status,
        r.room_number,
        u.username as requested_by
      FROM unlock_requests ur
      JOIN rooms r ON ur.room_id = r.id
      LEFT JOIN users u ON ur.requested_by = u.id
      LIMIT 1
    `);
    // Should work even if no requests exist
  })();

  // Test 11: User authentication query
  await test('User authentication query', async () => {
    const result = await pool.query(
      'SELECT id, username, password_hash, role FROM users WHERE username = $1',
      ['sarah_manager']
    );
    if (result.rows.length === 0) throw new Error('Test user not found');
  })();

  // Test 12: Room status update
  await test('Room status update', async () => {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      
      // Get a room
      const roomResult = await client.query('SELECT id, status FROM rooms LIMIT 1');
      if (roomResult.rows.length === 0) {
        throw new Error('No rooms available for test');
      }
      
      const roomId = roomResult.rows[0].id;
      const originalStatus = roomResult.rows[0].status;
      
      // Update status
      await client.query(
        'UPDATE rooms SET status = $1, updated_at = NOW() WHERE id = $2',
        ['available', roomId]
      );
      
      // Restore original status
      await client.query(
        'UPDATE rooms SET status = $1, updated_at = NOW() WHERE id = $2',
        [originalStatus, roomId]
      );
      
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  })();

  // Summary
  console.log('\n📊 Test Summary:');
  console.log(`   ✅ Passed: ${testsPassed}`);
  console.log(`   ❌ Failed: ${testsFailed}`);
  console.log(`   📈 Total: ${testsPassed + testsFailed}\n`);

  if (testsFailed === 0) {
    console.log('🎉 All database integration tests passed!');
    process.exit(0);
  } else {
    console.error('⚠️  Some tests failed. Please check the database setup.');
    process.exit(1);
  }
}

runTests()
  .catch(error => {
    console.error('❌ Test runner error:', error);
    process.exit(1);
  })
  .finally(() => {
    pool.end();
  });

