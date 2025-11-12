-- Smart Fitting Room System - Enhanced Database Setup Script
-- This schema supports both system operations and AI/ML training
-- Run this to create all tables with AI training capabilities

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

-- Insert Sample Users
-- Password for all users: password123
INSERT INTO users (username, password_hash, role) VALUES
('john_sales', '$2b$10$x/AigX38DRZzSkYsJzcp4egixwEQIB6dLPS7QErVgkTyu1Y3.vC1e', 'salesperson'),
('sarah_manager', '$2b$10$x/AigX38DRZzSkYsJzcp4egixwEQIB6dLPS7QErVgkTyu1Y3.vC1e', 'manager'),
('mike_sales', '$2b$10$x/AigX38DRZzSkYsJzcp4egixwEQIB6dLPS7QErVgkTyu1Y3.vC1e', 'salesperson');

-- Insert Sample Rooms (2 fitting rooms)
INSERT INTO rooms (room_number, status) VALUES
(1, 'available'),
(2, 'available');

-- Insert Sample Products (Enhanced with AI features)
INSERT INTO products (sku, name, size, color, category, material, price, complexity_score, has_zipper, has_buttons) VALUES
-- Dresses
('SKU-0001', 'Summer Dress', 'M', 'Blue', 'Dress', 'cotton', 49.99, 6, FALSE, TRUE),
('SKU-0002', 'Summer Dress', 'L', 'Blue', 'Dress', 'cotton', 49.99, 6, FALSE, TRUE),
-- Shirts
('SKU-0003', 'Cotton Shirt', 'M', 'White', 'T-Shirt', 'cotton', 29.99, 4, FALSE, TRUE),
('SKU-0004', 'Cotton Shirt', 'L', 'White', 'T-Shirt', 'cotton', 29.99, 4, FALSE, TRUE),
-- Pants
('SKU-0005', 'Denim Jeans', 'L', 'Blue', 'Pants', 'denim', 79.99, 5, FALSE, TRUE),
('SKU-0006', 'Denim Jeans', 'S', 'Blue', 'Pants', 'denim', 79.99, 5, FALSE, TRUE),
-- Jackets
('SKU-0007', 'Leather Jacket', 'M', 'Black', 'Jacket', 'leather', 199.99, 8, TRUE, TRUE),
('SKU-0008', 'Leather Jacket', 'L', 'Black', 'Jacket', 'leather', 199.99, 8, TRUE, TRUE),
-- Skirts
('SKU-0009', 'Pleated Skirt', 'S', 'Red', 'Skirt', 'polyester', 39.99, 5, FALSE, FALSE),
('SKU-0010', 'Pleated Skirt', 'M', 'Red', 'Skirt', 'polyester', 39.99, 5, FALSE, FALSE),
-- Tops
('SKU-0011', 'Blouse', 'M', 'Pink', 'T-Shirt', 'silk', 59.99, 7, FALSE, TRUE),
('SKU-0012', 'Blouse', 'L', 'Pink', 'T-Shirt', 'silk', 59.99, 7, FALSE, TRUE);

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

-- ============================================================================
-- SAMPLE THEFT SCENARIO DATA
-- ============================================================================
-- This demonstrates a complete theft detection flow:
-- 1. Room 2 has an anomaly (missing items)
-- 2. Alert is created for the security issue
-- 3. Salesperson requests unlock
-- 4. Manager can approve/reject the request

-- Update Room 2 to show alert status (theft scenario)
UPDATE rooms 
SET 
    status = 'alert',
    customer_rfid = 'RFID-8472',
    entry_time = NOW() - INTERVAL '15 minutes',
    session_id = 'session-theft-demo-001'
WHERE room_number = 2;

-- Create a session for the theft scenario
INSERT INTO sessions (
    session_id, room_id, customer_rfid, entry_time, exit_time,
    duration_minutes, predicted_duration_minutes,
    is_anomaly, anomaly_score, risk_level, status
) VALUES (
    'session-theft-demo-001',
    (SELECT id FROM rooms WHERE room_number = 2),
    'RFID-8472',
    NOW() - INTERVAL '15 minutes',
    NOW() - INTERVAL '2 minutes',
    13.0,  -- Actual duration
    10.0,  -- Predicted duration
    TRUE,  -- Anomaly detected
    0.95,  -- High anomaly score
    'high',
    'completed'
);

-- Add products to Room 2 (theft scenario)
-- Customer took 3 items, but only 2 were scanned out (1 item missing)
INSERT INTO room_products (session_id, room_id, product_id, scanned_in_at, scanned_out_at, is_missing, in_entry_scan, in_exit_scan) VALUES
-- Item 1: Scanned in and out (normal)
(
    'session-theft-demo-001',
    (SELECT id FROM rooms WHERE room_number = 2),
    (SELECT id FROM products WHERE sku = 'SKU-0003'),
    NOW() - INTERVAL '15 minutes',
    NOW() - INTERVAL '2 minutes',
    FALSE,
    TRUE,
    TRUE
),
-- Item 2: Scanned in and out (normal)
(
    'session-theft-demo-001',
    (SELECT id FROM rooms WHERE room_number = 2),
    (SELECT id FROM products WHERE sku = 'SKU-0005'),
    NOW() - INTERVAL '15 minutes',
    NOW() - INTERVAL '2 minutes',
    FALSE,
    TRUE,
    TRUE
),
-- Item 3: Scanned in but NOT scanned out (MISSING - THEFT!)
(
    'session-theft-demo-001',
    (SELECT id FROM rooms WHERE room_number = 2),
    (SELECT id FROM products WHERE sku = 'SKU-0007'),
    NOW() - INTERVAL '15 minutes',
    NULL,
    TRUE,  -- Marked as missing
    TRUE,
    FALSE  -- Not scanned out
);

-- Create an alert for the missing item
-- NOTE: System prevents customer from leaving when items are not scanned out
-- The room door remains locked until all items are scanned out
INSERT INTO alerts (room_id, session_id, alert_type, severity, message, resolved) VALUES (
    (SELECT id FROM rooms WHERE room_number = 2),
    'session-theft-demo-001',
    'missing-item',
    'high',
    'Room 2 locked: Customer cannot exit - 1 item (SKU-0007 - Leather Jacket) not scanned out. System preventing exit until all items are scanned. Staff intervention required.',
    FALSE
);

-- NOTE: Removed fake unlock request - no mocked data
-- Unlock requests should only be created by real staff when they actually need to unlock a room
-- CREATE AN UNLOCK REQUEST FROM SALESPERSON (john_sales) FOR ROOM 2
-- This is needed because the door is locked and customer is stuck inside
-- INSERT INTO unlock_requests (room_id, requested_by, reason, status, requested_at) VALUES (
--     (SELECT id FROM rooms WHERE room_number = 2),
--     (SELECT id FROM users WHERE username = 'john_sales'),
--     'Customer unable to exit: Room door locked due to missing item scan. Need manager approval to unlock room and investigate. 1 item (SKU-0007) not scanned out.',
--     'pending',
--     NOW() - INTERVAL '5 minutes'
-- );

-- ============================================================================
-- END SAMPLE THEFT SCENARIO DATA
-- ============================================================================

-- Success message
SELECT 'Enhanced database setup completed successfully! All tables created with AI training support.' as result;

-- Display summary
SELECT 'Users created: ' || COUNT(*) as summary FROM users
UNION ALL
SELECT 'Rooms created: ' || COUNT(*) FROM rooms
UNION ALL
SELECT 'Products created: ' || COUNT(*) FROM products;

