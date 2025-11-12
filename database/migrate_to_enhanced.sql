-- Migration script to upgrade existing database to enhanced schema
-- This script adds AI training features to existing database

-- Add new columns to products table if they don't exist
DO $$ 
BEGIN
    -- Add category column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='products' AND column_name='category') THEN
        ALTER TABLE products ADD COLUMN category VARCHAR(50);
    END IF;
    
    -- Add material column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='products' AND column_name='material') THEN
        ALTER TABLE products ADD COLUMN material VARCHAR(50);
    END IF;
    
    -- Add price column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='products' AND column_name='price') THEN
        ALTER TABLE products ADD COLUMN price DECIMAL(10, 2);
    END IF;
    
    -- Add complexity_score column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='products' AND column_name='complexity_score') THEN
        ALTER TABLE products ADD COLUMN complexity_score INTEGER DEFAULT 5 
            CHECK (complexity_score >= 0 AND complexity_score <= 10);
    END IF;
    
    -- Add has_zipper column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='products' AND column_name='has_zipper') THEN
        ALTER TABLE products ADD COLUMN has_zipper BOOLEAN DEFAULT FALSE;
    END IF;
    
    -- Add has_buttons column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='products' AND column_name='has_buttons') THEN
        ALTER TABLE products ADD COLUMN has_buttons BOOLEAN DEFAULT FALSE;
    END IF;
    
    -- Add updated_at column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='products' AND column_name='updated_at') THEN
        ALTER TABLE products ADD COLUMN updated_at TIMESTAMP DEFAULT NOW();
    END IF;
END $$;

-- Create sessions table if it doesn't exist
CREATE TABLE IF NOT EXISTS sessions (
  id SERIAL PRIMARY KEY,
  session_id VARCHAR(255) UNIQUE NOT NULL,
  room_id INTEGER REFERENCES rooms(id) ON DELETE SET NULL,
  customer_rfid VARCHAR(50),
  entry_time TIMESTAMP NOT NULL,
  exit_time TIMESTAMP,
  duration_minutes DECIMAL(10, 2),
  predicted_duration_minutes DECIMAL(10, 2),
  is_anomaly BOOLEAN DEFAULT FALSE,
  anomaly_score DECIMAL(5, 3),
  risk_level VARCHAR(20),
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'completed', 'abandoned')),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Add session_id to rooms table if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='rooms' AND column_name='session_id') THEN
        ALTER TABLE rooms ADD COLUMN session_id VARCHAR(255);
    END IF;
END $$;

-- Add session_id and scan tracking columns to room_products if they don't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='room_products' AND column_name='session_id') THEN
        ALTER TABLE room_products ADD COLUMN session_id VARCHAR(255);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='room_products' AND column_name='in_entry_scan') THEN
        ALTER TABLE room_products ADD COLUMN in_entry_scan BOOLEAN DEFAULT FALSE;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='room_products' AND column_name='in_exit_scan') THEN
        ALTER TABLE room_products ADD COLUMN in_exit_scan BOOLEAN DEFAULT FALSE;
    END IF;
END $$;

-- Add session_id to alerts table if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='alerts' AND column_name='session_id') THEN
        ALTER TABLE alerts ADD COLUMN session_id VARCHAR(255) REFERENCES sessions(session_id) ON DELETE SET NULL;
    END IF;
END $$;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_sessions_session_id ON sessions(session_id);
CREATE INDEX IF NOT EXISTS idx_sessions_room_id ON sessions(room_id);
CREATE INDEX IF NOT EXISTS idx_sessions_entry_time ON sessions(entry_time);
CREATE INDEX IF NOT EXISTS idx_sessions_status ON sessions(status);
CREATE INDEX IF NOT EXISTS idx_sessions_is_anomaly ON sessions(is_anomaly);
CREATE INDEX IF NOT EXISTS idx_rooms_session_id ON rooms(session_id);
CREATE INDEX IF NOT EXISTS idx_room_products_session_id ON room_products(session_id);
CREATE INDEX IF NOT EXISTS idx_alerts_session_id ON alerts(session_id);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);

-- Update existing products with default values
UPDATE products 
SET 
    category = CASE 
        WHEN name ILIKE '%dress%' THEN 'Dress'
        WHEN name ILIKE '%shirt%' OR name ILIKE '%blouse%' OR name ILIKE '%top%' THEN 'T-Shirt'
        WHEN name ILIKE '%pant%' OR name ILIKE '%jean%' THEN 'Pants'
        WHEN name ILIKE '%jacket%' THEN 'Jacket'
        WHEN name ILIKE '%skirt%' THEN 'Skirt'
        ELSE 'Unknown'
    END,
    material = CASE 
        WHEN name ILIKE '%leather%' THEN 'leather'
        WHEN name ILIKE '%cotton%' THEN 'cotton'
        WHEN name ILIKE '%denim%' THEN 'denim'
        WHEN name ILIKE '%silk%' THEN 'silk'
        ELSE 'cotton'
    END,
    price = 49.99,
    complexity_score = CASE 
        WHEN name ILIKE '%jacket%' THEN 8
        WHEN name ILIKE '%dress%' THEN 6
        WHEN name ILIKE '%silk%' THEN 7
        ELSE 5
    END,
    has_buttons = name ILIKE '%shirt%' OR name ILIKE '%blouse%',
    has_zipper = name ILIKE '%jacket%',
    updated_at = NOW()
WHERE category IS NULL OR material IS NULL OR price IS NULL;

SELECT 'Migration completed successfully! Database now supports AI training features.' as result;

