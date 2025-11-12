-- Smart Fitting Room System - Complete Database Setup Script
-- Run this to create all tables and sample data

-- Drop existing tables if they exist (be careful with this in production!)
DROP TABLE IF EXISTS alerts CASCADE;
DROP TABLE IF EXISTS unlock_requests CASCADE;
DROP TABLE IF EXISTS room_products CASCADE;
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
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create Products Table
CREATE TABLE products (
  id SERIAL PRIMARY KEY,
  sku VARCHAR(50) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  size VARCHAR(20),
  color VARCHAR(50),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create Room Products Junction Table
CREATE TABLE room_products (
  id SERIAL PRIMARY KEY,
  room_id INTEGER REFERENCES rooms(id) ON DELETE CASCADE,
  product_id INTEGER REFERENCES products(id) ON DELETE CASCADE,
  scanned_in_at TIMESTAMP,
  scanned_out_at TIMESTAMP,
  is_missing BOOLEAN DEFAULT FALSE,
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
('john_sales', '$2a$10$XQZ8z/YGz.kCCjJQQZ7HF.YvJ8LY8TqZc5CXQsP2Y8BqZYXy8Xb5S', 'salesperson'),
('sarah_manager', '$2a$10$XQZ8z/YGz.kCCjJQQZ7HF.YvJ8LY8TqZc5CXQsP2Y8BqZYXy8Xb5S', 'manager'),
('mike_sales', '$2a$10$XQZ8z/YGz.kCCjJQQZ7HF.YvJ8LY8TqZc5CXQsP2Y8BqZYXy8Xb5S', 'salesperson');

-- Insert Sample Rooms (2 fitting rooms)
INSERT INTO rooms (room_number, status) VALUES
(1, 'available'),
(2, 'available');

-- Insert Sample Products
INSERT INTO products (sku, name, size, color) VALUES
('DRESS-001', 'Summer Dress', 'M', 'Blue'),
('DRESS-002', 'Summer Dress', 'L', 'Blue'),
('SHIRT-001', 'Cotton Shirt', 'M', 'White'),
('SHIRT-002', 'Cotton Shirt', 'L', 'White'),
('PANTS-001', 'Denim Jeans', '32', 'Blue'),
('PANTS-002', 'Denim Jeans', '34', 'Blue'),
('JACKET-001', 'Leather Jacket', 'M', 'Black'),
('JACKET-002', 'Leather Jacket', 'L', 'Black'),
('SKIRT-001', 'Pleated Skirt', 'S', 'Red'),
('SKIRT-002', 'Pleated Skirt', 'M', 'Red'),
('TOP-001', 'Blouse', 'M', 'Pink'),
('TOP-002', 'Blouse', 'L', 'Pink');

-- Create indexes for better performance
CREATE INDEX idx_rooms_status ON rooms(status);
CREATE INDEX idx_room_products_room_id ON room_products(room_id);
CREATE INDEX idx_unlock_requests_status ON unlock_requests(status);
CREATE INDEX idx_alerts_room_id ON alerts(room_id);
CREATE INDEX idx_alerts_resolved ON alerts(resolved);

-- Add unique constraint to prevent duplicate room-product entries
CREATE UNIQUE INDEX idx_room_products_unique ON room_products(room_id, product_id);

-- Success message
SELECT 'Database setup completed successfully! All tables created with sample data.' as result;

-- Display summary
SELECT 'Users created: ' || COUNT(*) as summary FROM users
UNION ALL
SELECT 'Rooms created: ' || COUNT(*) FROM rooms
UNION ALL
SELECT 'Products created: ' || COUNT(*) FROM products;
