import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

// Validate required environment variables
const requiredEnvVars = ['DB_PASSWORD', 'JWT_SECRET'];
const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingVars.length > 0) {
  console.error('❌ Missing required environment variables:', missingVars.join(', '));
  console.error('Please ensure .env.local file exists and contains all required variables.');
  if (process.env.NODE_ENV !== 'production') {
    console.error('See DATABASE_SETUP_INSTRUCTIONS.md for setup guidance.');
  }
}

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'fitting_room_system',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

pool.on('connect', () => {
  console.log('✅ Database connection pool created');
});

pool.on('error', (err) => {
  console.error('❌ Unexpected database error:', err);
  console.error('Error details:', {
    code: err.code,
    message: err.message,
    name: err.name
  });
  // Don't exit in production, let the application handle it
  if (process.env.NODE_ENV !== 'production') {
    console.error('⚠️  Exiting due to database error in development mode');
    process.exit(-1);
  }
});

export default pool;
