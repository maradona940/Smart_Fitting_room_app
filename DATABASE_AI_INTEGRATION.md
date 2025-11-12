# Database & AI Integration Guide

## Overview

The Smart Fitting Room System now has a fully integrated database schema that supports both system operations and AI/ML training. All data flows through PostgreSQL, ensuring consistency and enabling continuous model improvement.

## Database Schema Enhancements

### Enhanced Products Table
- **category**: Item category (T-Shirt, Pants, Jacket, Dress, etc.)
- **material**: Material type (cotton, polyester, denim, leather, etc.)
- **price**: Item price for training
- **complexity_score**: 0-10 scale for fitting complexity
- **has_zipper**: Boolean flag
- **has_buttons**: Boolean flag

### New Sessions Table
Tracks complete fitting room sessions for AI training:
- **session_id**: Unique session identifier (UUID)
- **room_id**: Reference to room
- **entry_time**: When customer entered
- **exit_time**: When customer left
- **duration_minutes**: Actual duration
- **predicted_duration_minutes**: AI prediction
- **is_anomaly**: Whether session was flagged as anomalous
- **anomaly_score**: 0.0-1.0 anomaly probability
- **risk_level**: 'low', 'medium', 'high'
- **status**: 'active', 'completed', 'abandoned'

### Enhanced Room Products Table
- **session_id**: Links products to sessions
- **in_entry_scan**: Item was scanned on entry
- **in_exit_scan**: Item was scanned on exit

## Setup Instructions

### Step 1: Run Enhanced Database Setup

You have two options:

#### Option A: Fresh Setup (Recommended for new installations)
```sql
-- Run in pgAdmin or psql
\i database/setup_database_enhanced.sql
```

#### Option B: Migrate Existing Database
```sql
-- Run in pgAdmin or psql
\i database/migrate_to_enhanced.sql
```

### Step 2: Install Python Dependencies for AI Service

```bash
cd AI
pip install -r requirements.txt
```

The AI service now requires:
- `psycopg2` or `psycopg2-binary` - PostgreSQL database adapter
- `python-decouple` - Environment variable management

### Step 3: Configure AI Service Environment

Create a `.env` file in the `AI/` directory:
```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=fitting_room_system
DB_USER=postgres
DB_PASSWORD=your_postgres_password
```

### Step 4: Sync Existing AI Data (Optional)

If you have existing JSON/CSV training data:
```bash
cd AI
python db_integration.py
```

This will sync your existing AI training data to the database.

## How It Works

### AI Training Flow

1. **Data Collection**: Every completed session is automatically saved to the `sessions` table
2. **Training**: AI models train on historical sessions from the database
3. **Prediction**: Models use product features from the database for predictions
4. **Continuous Learning**: New sessions improve model accuracy over time

### Data Flow

```
System Operations → Database → AI Training
     ↓                    ↓          ↓
Room Assignments    Sessions Table  Model Training
Product Scans       Products Table  Predictions
Customer Entry      Room Products   Anomaly Detection
```

### AI Service Integration

The AI service (`AI/api.py`) now:
- Loads item database from PostgreSQL on startup
- Loads historical sessions from database for training
- Saves completed sessions to database automatically
- Falls back to JSON/CSV files if database is unavailable

## Training the Models

### Using Database Data

```bash
cd AI
python train.py
```

The training script will:
1. Load data from database (if available)
2. Fall back to JSON/CSV files if needed
3. Train duration prediction model
4. Train anomaly detection model
5. Save trained models to `models/` directory

### Training Data Requirements

- **Minimum**: 100+ completed sessions for basic training
- **Recommended**: 1000+ sessions for accurate predictions
- **Optimal**: 5000+ sessions for production-grade models

## API Endpoints

### Duration Prediction
```python
POST /api/ai/predict-duration
{
  "item_ids": ["SKU-001", "SKU-002"],
  "entry_time": "2024-01-15T14:30:00"
}
```

### Anomaly Detection
```python
POST /api/ai/detect-anomaly
{
  "session_id": "uuid",
  "room_id": "room_1",
  "actual_duration": 15.5,
  "predicted_duration": 12.0,
  "entry_scans": ["SKU-001", "SKU-002"],
  "exit_scans": ["SKU-001"],
  "entry_time": "2024-01-15T14:30:00"
}
```

The anomaly detection endpoint automatically saves session data to the database.

## Database Queries for AI

### Get All Sessions for Training
```sql
SELECT * FROM sessions 
WHERE status = 'completed'
ORDER BY entry_time DESC
LIMIT 10000;
```

### Get Product Features
```sql
SELECT sku, category, material, price, complexity_score, 
       has_zipper, has_buttons
FROM products;
```

### Get Session with Scans
```sql
SELECT 
    s.*,
    array_agg(DISTINCT p.sku) FILTER (WHERE rp.in_entry_scan) as entry_scans,
    array_agg(DISTINCT p.sku) FILTER (WHERE rp.in_exit_scan) as exit_scans
FROM sessions s
LEFT JOIN room_products rp ON s.session_id = rp.session_id
LEFT JOIN products p ON rp.product_id = p.id
WHERE s.session_id = 'your-session-id'
GROUP BY s.id;
```

## Benefits

1. **Consistency**: All data in one place (PostgreSQL)
2. **Persistence**: Training data never lost
3. **Real-time**: Models can retrain on new data automatically
4. **Integrated**: System operations feed directly into AI training
5. **Scalable**: Database handles large datasets efficiently

## Troubleshooting

### AI Service Can't Connect to Database
- Check `.env` file in `AI/` directory
- Verify PostgreSQL is running
- Test connection: `python -c "from db_integration import get_db_connection; get_db_connection()"`

### No Training Data Available
- Run `python db_integration.py` to sync existing data
- Or use `simulate_data.py` to generate sample data
- Ensure sessions are being saved (check `sessions` table)

### Models Not Loading
- Run `python train.py` to train models
- Check that `models/duration_model.pkl` and `models/anomaly_model.pkl` exist

## Next Steps

1. Run the enhanced database setup
2. Configure AI service environment
3. Train models on existing or generated data
4. Start the AI service
5. System will automatically collect training data as it runs

---

*The system is now fully integrated with database-driven AI training and prediction!*

