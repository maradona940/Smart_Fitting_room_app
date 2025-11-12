import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './routes/authRoutes.js';
import roomRoutes from './routes/roomRoutes.js';
import unlockRoutes from './routes/unlockRoutes.js';
import alertRoutes from './routes/alertRoutes.js';
import aiRoutes from './routes/aiRoutes.js';
import pool from './config/db.js';

dotenv.config({ path: '.env.local' });

const app = express();
const PORT = process.env.PORT || 4000;

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/rooms', roomRoutes);
app.use('/api/unlock-requests', unlockRoutes);
app.use('/api/alerts', alertRoutes);
app.use('/api/ai', aiRoutes);

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: '🎯 Smart Fitting Room API',
    version: '1.0.0',
    status: 'running',
    endpoints: {
      health: 'GET /api/health',
      auth: {
        login: 'POST /api/auth/login',
        me: 'GET /api/auth/me'
      },
      rooms: {
        list: 'GET /api/rooms',
        details: 'GET /api/rooms/:id',
        updateStatus: 'PATCH /api/rooms/:id/status',
        assignCustomer: 'POST /api/rooms/:id/assign-customer',
        assignWithProducts: 'POST /api/rooms/assign',
        scanProductIn: 'POST /api/rooms/:id/scan-in',
        scanProductOut: 'POST /api/rooms/:id/scan-out',
        addProduct: 'POST /api/rooms/:id/add-product',
        searchProducts: 'GET /api/rooms/products/search?q=query',
        pendingScanOut: 'GET /api/rooms/pending-scan-out?customerCardId=ID&roomId=ID'
      },
      unlockRequests: {
        list: 'GET /api/unlock-requests',
        create: 'POST /api/unlock-requests',
        approve: 'PATCH /api/unlock-requests/:id/approve',
        reject: 'PATCH /api/unlock-requests/:id/reject'
      },
      alerts: {
        list: 'GET /api/alerts',
        create: 'POST /api/alerts',
        resolve: 'PATCH /api/alerts/:id/resolve'
      },
      ai: {
        health: 'GET /api/ai/health',
        assignRoom: 'POST /api/ai/assign-room',
        roomsStatus: 'GET /api/ai/rooms/status',
        predictDuration: 'POST /api/ai/predict-duration',
        detectAnomaly: 'POST /api/ai/detect-anomaly'
      }
    }
  });
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Smart Fitting Room API is running' });
});

// Error handling middleware
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// Validate critical environment variables on startup
const validateEnvironment = () => {
  const required = ['JWT_SECRET', 'DB_PASSWORD'];
  const missing = required.filter(key => !process.env[key]);
  
  if (missing.length > 0) {
    console.error('❌ Missing required environment variables:', missing.join(', '));
    console.error('Please check your .env.local file.');
    process.exit(1);
  }
  
  console.log('✅ Environment variables validated');
};

// Start server
app.listen(PORT, () => {
  validateEnvironment();
  
  const host = process.env.HOST || 'localhost';
  console.log(`🚀 Server running on http://${host}:${PORT}`);
  console.log(`📊 API endpoints available at http://${host}:${PORT}/api`);
  if (process.env.FRONTEND_URL) {
    console.log(`🌐 Frontend URL: ${process.env.FRONTEND_URL}`);
  }
  
  // Test database connection with better error handling
  pool.query('SELECT NOW()', (err, result) => {
    if (err) {
      console.error('❌ Database connection test failed:', err.message);
      console.error('Error code:', err.code);
      if (err.code === '28P01') {
        console.error('💡 Hint: Check your DB_PASSWORD in .env.local');
      } else if (err.code === '3D000') {
        console.error('💡 Hint: Check your DB_NAME in .env.local');
      } else if (err.code === 'ECONNREFUSED') {
        console.error('💡 Hint: Ensure PostgreSQL is running and DB_HOST is correct');
      }
    } else {
      console.log('✅ Database connected at:', result.rows[0].now);
    }
  });
});

export default app;
