-- Smart Fitting Room System - Database Tables Setup
-- Run this script to create all required tables
-- Note: This will DROP existing tables if they exist, so be careful!

-- Drop existing tables if they exist (be careful in production!)
DROP TABLE IF EXISTS alerts CASCADE;
DROP TABLE IF EXISTS unlock_requests CASCADE;
DROP TABLE IF EXISTS room_products CASCADE;
DROP TABLE IF EXISTS sessions CASCADE;
DROP TABLE IF EXISTS products CASCADE;
DROP TABLE IF EXISTS rooms CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- Create Users Table
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(100) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(20) NOT NULL CHECK (role IN ('salesperson', 'manager')),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create Rooms Table
CREATE TABLE rooms (
  id SERIAL PRIMARY KEY,
  room_number INTEGER UNIQUE NOT NULL,
  status VARCHAR(20) NOT NULL CHECK (status IN ('available', 'occupied', 'alert')),
  customer_rfid VARCHAR(50),
  entry_time TIMESTAMP,
  session_id VARCHAR(255), -- Link to current session
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create Products Table (Enhanced with AI training features)
CREATE TABLE products (
  id SERIAL PRIMARY KEY,
  sku VARCHAR(50) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  size VARCHAR(20),
  color VARCHAR(50),
  -- AI Training Features
  category VARCHAR(50), -- e.g., 'T-Shirt', 'Pants', 'Jacket', 'Dress', 'Skirt', 'Sweater', 'Shoes', 'Accessory'
  material VARCHAR(50), -- e.g., 'cotton', 'polyester', 'denim', 'wool', 'silk', 'leather', 'spandex'
  price DECIMAL(10, 2), -- Price for training
  complexity_score INTEGER DEFAULT 5 CHECK (complexity_score >= 0 AND complexity_score <= 10), -- 0-10 scale
  has_zipper BOOLEAN DEFAULT FALSE,
  has_buttons BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create Sessions Table (For AI Training and Anomaly Detection)
CREATE TABLE sessions (
  id SERIAL PRIMARY KEY,
  session_id VARCHAR(255) UNIQUE NOT NULL, -- UUID for tracking
  room_id INTEGER REFERENCES rooms(id) ON DELETE SET NULL,
  customer_rfid VARCHAR(50),
  entry_time TIMESTAMP NOT NULL,
  exit_time TIMESTAMP,
  duration_minutes DECIMAL(10, 2), -- Actual duration
  predicted_duration_minutes DECIMAL(10, 2), -- AI prediction
  -- Anomaly Detection Results
  is_anomaly BOOLEAN DEFAULT FALSE,
  anomaly_score DECIMAL(5, 3), -- 0.0 to 1.0
  risk_level VARCHAR(20), -- 'low', 'medium', 'high'
  -- Session Status
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'completed', 'abandoned')),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create Room Products Junction Table (Enhanced for AI training)
CREATE TABLE room_products (
  id SERIAL PRIMARY KEY,
  session_id VARCHAR(255), -- Link to session for AI training
  room_id INTEGER REFERENCES rooms(id) ON DELETE CASCADE,
  product_id INTEGER REFERENCES products(id) ON DELETE CASCADE,
  -- Scan tracking
  scanned_in_at TIMESTAMP,
  scanned_out_at TIMESTAMP,
  is_missing BOOLEAN DEFAULT FALSE,
  -- For AI: Track which items were in entry vs exit scans
  in_entry_scan BOOLEAN DEFAULT FALSE,
  in_exit_scan BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create Unlock Requests Table
CREATE TABLE unlock_requests (
  id SERIAL PRIMARY KEY,
  room_id INTEGER REFERENCES rooms(id) ON DELETE CASCADE,
  requested_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  reason TEXT,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  approved_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  requested_at TIMESTAMP DEFAULT NOW(),
  resolved_at TIMESTAMP
);

-- Create Alerts Table
CREATE TABLE alerts (
  id SERIAL PRIMARY KEY,
  room_id INTEGER REFERENCES rooms(id) ON DELETE CASCADE,
  session_id VARCHAR(255) REFERENCES sessions(session_id) ON DELETE SET NULL,
  alert_type VARCHAR(50) NOT NULL,
  severity VARCHAR(20) NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  message TEXT NOT NULL,
  resolved BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW(),
  resolved_at TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX idx_rooms_status ON rooms(status);
CREATE INDEX idx_rooms_session_id ON rooms(session_id);
CREATE INDEX idx_room_products_room_id ON room_products(room_id);
CREATE INDEX idx_room_products_session_id ON room_products(session_id);
CREATE INDEX idx_sessions_session_id ON sessions(session_id);
CREATE INDEX idx_sessions_room_id ON sessions(room_id);
CREATE INDEX idx_sessions_entry_time ON sessions(entry_time);
CREATE INDEX idx_sessions_status ON sessions(status);
CREATE INDEX idx_sessions_is_anomaly ON sessions(is_anomaly);
CREATE INDEX idx_unlock_requests_status ON unlock_requests(status);
CREATE INDEX idx_alerts_room_id ON alerts(room_id);
CREATE INDEX idx_alerts_session_id ON alerts(session_id);
CREATE INDEX idx_alerts_resolved ON alerts(resolved);
CREATE INDEX idx_products_category ON products(category);
CREATE INDEX idx_products_sku ON products(sku);

-- Add unique constraint to prevent duplicate room-product entries per session
CREATE UNIQUE INDEX idx_room_products_unique ON room_products(room_id, product_id, session_id) 
WHERE session_id IS NOT NULL;

-- Success message
SELECT 'Database tables created successfully! You can now add your sample data.' as result;

