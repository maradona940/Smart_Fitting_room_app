# 🎯 Complete Setup Guide - Smart Fitting Room System

This comprehensive guide covers setting up and running the entire Smart Fitting Room System from scratch, including the database, backend API, AI service, and frontend application.

---

## 📋 Table of Contents

1. [System Overview](#system-overview)
2. [Prerequisites](#prerequisites)
3. [Database Setup](#database-setup)
4. [Backend Setup](#backend-setup)
5. [AI Service Setup](#ai-service-setup)
6. [Frontend Setup](#frontend-setup)
7. [Running the Complete System](#running-the-complete-system)
8. [Assigning Customers to Rooms](#assigning-customers-to-rooms)
9. [Customer Checkout/Leave Process](#customer-checkoutleave-process)
10. [Troubleshooting](#troubleshooting)

---

## 🏗️ System Overview

The Smart Fitting Room System consists of four main components:

1. **PostgreSQL Database** - Stores all data (rooms, products, users, sessions, alerts)
2. **Backend API (Node.js/Express)** - RESTful API server on port 4000
3. **AI Service (Python/FastAPI)** - ML-powered room assignment and anomaly detection on port 8000
4. **Frontend (Next.js)** - Web dashboard on port 3000

**Architecture Flow:**
```
Frontend (3000) → Backend API (4000) → Database (PostgreSQL)
                           ↓
                    AI Service (8000)
```

---

## ✅ Prerequisites

Before starting, ensure you have the following installed:

### Required Software

1. **Node.js** (v18 or higher)
   ```bash
   node --version  # Should show v18+
   npm --version
   ```

2. **Python** (v3.8 or higher)
   ```bash
   python --version  # Should show 3.8+
   pip3 --version
   ```

3. **PostgreSQL** (v12 or higher)
   ```bash
   psql --version
   ```

4. **pgAdmin 4** (optional, for database management)

5. **Git** (optional, if cloning from repository)

---

## 🗄️ Database Setup

### Step 1: Install and Start PostgreSQL

**On Linux:**
```bash
sudo systemctl start postgresql
sudo systemctl enable postgresql
```

**On macOS:**
```bash
brew services start postgresql
```

**On Windows:**
- Start PostgreSQL service from Services panel

### Step 2: Create Database

1. Open **pgAdmin 4** or use command line:
   ```bash
   psql -U postgres
   ```

2. Create the database:
   ```sql
   CREATE DATABASE fitting_room_system;
   ```

3. Exit psql:
   ```sql
   \q
   ```

### Step 3: Run Database Setup Script

**Important:** Use the **Enhanced** setup script for full AI functionality (includes `sessions` table).

1. In **pgAdmin 4**:
   - Right-click on `fitting_room_system` database
   - Select **Query Tool**
   - Open file: `database/setup_database_enhanced.sql` (recommended for AI features)
   - Click **Execute (F5)**

2. **OR** via command line:
   ```bash
   psql -U postgres -d fitting_room_system -f database/setup_database_enhanced.sql
   ```

   **Alternative:** If you already ran `setup_database.sql`, you can migrate:
   ```bash
   psql -U postgres -d fitting_room_system -f database/migrate_to_enhanced.sql
   ```

3. Verify tables were created:
   ```sql
   SELECT table_name 
   FROM information_schema.tables 
   WHERE table_schema = 'public';
   ```
   
   You should see: `users`, `rooms`, `products`, `room_products`, `sessions`, `unlock_requests`, `alerts`
   
   **Note:** The `sessions` table is required for AI functionality.

### Step 4: Run ALTER Script (Important!)

This removes the "checking-out" status and ensures proper room statuses:

1. In **pgAdmin 4**:
   - Query Tool → Open `database/alter_remove_checking_out.sql`
   - Execute (F5)

2. **OR** via command line:
   ```bash
   psql -U postgres -d fitting_room_system -f database/alter_remove_checking_out.sql
   ```

3. Verify status values:
   ```sql
   SELECT DISTINCT status FROM rooms;
   ```
   
   Should only show: `available`, `occupied`, `alert`

### Step 5: Verify Sample Data

```sql
-- Check users
SELECT username, role FROM users;

-- Check rooms (should be 2 rooms)
SELECT room_number, status FROM rooms;

-- Check products
SELECT COUNT(*) FROM products;
```

**Default Test Users:**
- Username: `sarah_manager` | Password: `password123` | Role: Manager
- Username: `john_sales` | Password: `password123` | Role: Salesperson
- Username: `mike_sales` | Password: `password123` | Role: Salesperson

---

## 🔧 Backend Setup

### Step 1: Install Dependencies

```bash
cd /home/tricenc/Desktop/Fitting\ Room
npm install
```

### Step 2: Configure Environment Variables

1. Create `.env.local` file in the root directory:
   ```bash
   touch .env.local
   ```

2. Add the following configuration:
   ```env
   # Database Configuration
   DB_HOST=localhost
   DB_PORT=5432
   DB_NAME=fitting_room_system
   DB_USER=postgres
   DB_PASSWORD=YOUR_POSTGRES_PASSWORD_HERE

   # JWT Authentication
   JWT_SECRET=your-super-secret-jwt-key-change-this-to-random-string

   # Server Configuration
   PORT=4000
   NODE_ENV=development
   HOST=localhost

   # Frontend URL (for CORS)
   FRONTEND_URL=http://localhost:3000

   # AI Service URL
   AI_SERVICE_URL=http://localhost:8000
   ```

3. **Important:** Replace `YOUR_POSTGRES_PASSWORD_HERE` with your actual PostgreSQL password.

### Step 3: Test Database Connection

```bash
node test-db-connection.cjs
```

Expected output:
```
✅ Database connection successful!
```

### Step 4: Start Backend Server

```bash
npm run server
```

**Expected Output:**
```
✅ Environment variables validated
🚀 Server running on http://localhost:4000
📊 API endpoints available at http://localhost:4000/api
✅ Database connected at: [timestamp]
```

**Keep this terminal open!** The backend must be running for the system to work.

### Step 5: Verify Backend is Running

Open browser or use curl:
```bash
curl http://localhost:4000/api/health
```

Should return:
```json
{"status":"ok","message":"Smart Fitting Room API is running"}
```

---

## 🤖 AI Service Setup

### Step 1: Navigate to AI Directory

```bash
cd /home/tricenc/Desktop/Fitting\ Room/AI
```

### Step 2: Create Python Virtual Environment

```bash
python3 -m venv venv
```

### Step 3: Activate Virtual Environment

**Linux/macOS:**
```bash
source venv/bin/activate
```

**Windows:**
```bash
venv\Scripts\activate
```

### Step 4: Install Python Dependencies

```bash
pip install -r requirements.txt
```

### Step 5: Configure AI Service Database Connection

The AI service connects to the same PostgreSQL database. Create `AI/.env` file:

```bash
cd AI
touch .env
```

Add to `AI/.env`:
```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=fitting_room_system
DB_USER=postgres
DB_PASSWORD=YOUR_POSTGRES_PASSWORD_HERE
```

### Step 6: Generate Mock Data (First Time Only)

This creates training data for the ML models:

```bash
python simulate_data.py
```

**Expected Output:**
```
✓ Generated item database with X items
✓ Generated historical sessions data
```

This creates:
- `data/item_database.json`
- `data/historical_sessions.csv`

### Step 7: Train AI Models (First Time Only)

Train the duration prediction and anomaly detection models:

```bash
python train.py
```

**Expected Output:**
```
Training duration model...
✓ Duration model trained and saved
Training anomaly model...
✓ Anomaly model trained and saved
```

This creates:
- `models/duration_model.pkl`
- `models/anomaly_model.pkl`

### Step 8: Start AI Service

```bash
uvicorn api:app --host 0.0.0.0 --port 8000 --reload
```

**Expected Output:**
```
INFO:     Uvicorn running on http://0.0.0.0:8000
INFO:     Application startup complete.
✓ RoomManager initialized for 2 rooms.
✓ Loaded X items from database.
✓ Loaded X historical sessions from database.
```

**Keep this terminal open!** The AI service must be running.

### Step 9: Verify AI Service is Running

**Option 1: Browser**
```
http://localhost:8000
```

**Option 2: Interactive API Docs**
```
http://localhost:8000/docs
```

**Option 3: Health Check**
```bash
curl http://localhost:8000/
```

---

## 🖥️ Frontend Setup

### Step 1: Navigate to Project Root

```bash
cd /home/tricenc/Desktop/Fitting\ Room
```

### Step 2: Configure Frontend Environment (Optional)

If you need to change the backend URL, create `.env.local` in the root:

```env
NEXT_PUBLIC_API_URL=http://localhost:4000
```

### Step 3: Start Frontend Development Server

**In a NEW terminal window:**
```bash
cd /home/tricenc/Desktop/Fitting\ Room
npm run dev
```

**Expected Output:**
```
▲ Next.js 16.0.1
- Local:        http://localhost:3000
- Ready in XXXms
```

**Keep this terminal open!**

### Step 4: Access Frontend

Open browser:
```
http://localhost:3000
```

---

## 🚀 Running the Complete System

You need **THREE terminal windows** running simultaneously:

### Terminal 1: Backend API (Port 4000)
```bash
cd /home/tricenc/Desktop/Fitting\ Room
npm run server
```

### Terminal 2: AI Service (Port 8000)
```bash
cd /home/tricenc/Desktop/Fitting\ Room/AI
source venv/bin/activate  # Linux/macOS
# OR
venv\Scripts\activate     # Windows
uvicorn api:app --host 0.0.0.0 --port 8000 --reload
```

### Terminal 3: Frontend (Port 3000)
```bash
cd /home/tricenc/Desktop/Fitting\ Room
npm run dev
```

### System Status Checklist

✅ **Database:** PostgreSQL running, `fitting_room_system` database exists  
✅ **Backend:** `http://localhost:4000/api/health` returns OK  
✅ **AI Service:** `http://localhost:8000` returns welcome message  
✅ **Frontend:** `http://localhost:3000` loads dashboard  

---

## 👤 Assigning Customers to Rooms

### Method 1: Using the Unified Assignment Endpoint (Recommended)

This method uses AI to intelligently assign the best room and predict session duration.

**Endpoint:** `POST /api/rooms/assign`

**Request Body:**
```json
{
  "customerCardId": "RFID-12345",
  "productIds": ["DRESS-001", "SHIRT-001", "PANTS-001"]
}
```

**Example using curl:**
```bash
curl -X POST http://localhost:4000/api/rooms/assign \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "customerCardId": "RFID-12345",
    "productIds": ["DRESS-001", "SHIRT-001"]
  }'
```

**Response:**
```json
{
  "message": "Customer assigned to Room 1",
  "room": {
    "id": "1",
    "number": 1,
    "status": "occupied",
    "customerCard": "RFID-12345",
    "entryTime": "2024-01-15T10:30:00Z"
  },
  "session": {
    "sessionId": "uuid-here",
    "predictedDurationMinutes": 18.5
  },
  "ai": {
    "assignedRoomId": "room_1",
    "predictedDurationMinutes": 18.5,
    "status": "assigned",
    "message": "Please proceed to room_1."
  }
}
```

**What Happens:**
1. AI service predicts how long the session will take based on items
2. AI service selects the best available room (minimizes wait time)
3. Backend creates a session record in the database
4. Room status changes to `occupied`
5. Products are added to `room_products` with `scanned_in_at` timestamp
6. Entry time is recorded

### Method 2: Manual Assignment (Legacy)

**Endpoint:** `POST /api/rooms/:id/assign-customer`

**Request Body:**
```json
{
  "customerRfid": "RFID-12345"
}
```

**Note:** This method doesn't use AI and doesn't handle products. Use Method 1 for full functionality.

### Method 3: Via Frontend Dashboard

1. Log in at `http://localhost:3000/login`
2. Use credentials: `sarah_manager` / `password123`
3. Navigate to room assignment interface
4. Select customer RFID card
5. Scan or select products
6. Click "Assign Room"

---

## 🚪 Customer Checkout/Leave Process

### Overview

The checkout process is **automatic and secure**. Customers cannot leave until all items are scanned out.

**Key Security Feature:** The system uses the customer card ID to:
1. **Verify identity** - Only the assigned customer can scan out items
2. **Identify items** - The system knows which items belong to which customer
3. **Prevent fraud** - Customers cannot scan out items from other customers' sessions

### Step-by-Step Checkout Flow

#### Step 1: Get Pending Items (Using Customer Card ID)

**Before scanning out, you can query which items need to be scanned out using the customer's card ID:**

**Endpoint:** `GET /api/rooms/pending-scan-out?customerCardId=RFID-12345`

**Example:**
```bash
curl -X GET "http://localhost:4000/api/rooms/pending-scan-out?customerCardId=RFID-12345" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Response:**
```json
{
  "message": "Found 2 item(s) pending scan-out",
  "itemsByRoom": [
    {
      "roomNumber": 1,
      "customerCardId": "RFID-12345",
      "items": [
        {
          "id": "1",
          "sku": "DRESS-001",
          "name": "Summer Dress",
          "size": "M",
          "color": "Blue",
          "scannedInAt": "2024-01-15T10:30:00Z",
          "sessionId": "uuid-here"
        },
        {
          "id": "2",
          "sku": "SHIRT-001",
          "name": "Cotton Shirt",
          "size": "M",
          "color": "White",
          "scannedInAt": "2024-01-15T10:30:00Z",
          "sessionId": "uuid-here"
        }
      ]
    }
  ],
  "totalItems": 2
}
```

**Why this is useful:** The system knows exactly which items the customer took based on their card ID. This allows you to:
- Display a list of items that need to be scanned out
- Verify all items are present before allowing exit
- Provide a better customer experience

#### Step 2: Scan Products Out

As the customer exits, scan each product they're returning. **The customer card ID is used to verify the customer is authorized to scan out items from that room:**

**Endpoint:** `POST /api/rooms/:id/scan-out`

**Request Body:**
```json
{
  "productSku": "DRESS-001",
  "customerCardId": "RFID-12345"
}
```

**Security:** The `customerCardId` is **recommended** (and validated if provided). It ensures:
- Only the assigned customer can scan out items
- Products are verified against the customer's session
- Prevents customers from scanning out items from other sessions

**Example:**
```bash
curl -X POST http://localhost:4000/api/rooms/1/scan-out \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "productSku": "DRESS-001",
    "customerCardId": "RFID-12345"
  }'
```

**If customer card ID doesn't match:**
```json
{
  "error": "Customer card ID mismatch",
  "message": "The customer card ID does not match the customer assigned to this room. Only the assigned customer can scan out items.",
  "expectedCardId": "RFID-12345",
  "providedCardId": "RFID-99999"
}
```

**If product belongs to different customer's session:**
```json
{
  "error": "Product belongs to different session",
  "message": "This product (DRESS-001 - Summer Dress) belongs to a different customer session and cannot be scanned out by the current customer."
}
```

**Response (if items still remain):**
```json
{
  "message": "Product scanned out",
  "product": {...},
  "itemsRemaining": 2,
  "canExit": false,
  "roomAvailable": false
}
```

**Response (when all items scanned):**
```json
{
  "message": "Product scanned out. All items scanned - running final checks and room will be available shortly",
  "product": {...},
  "itemsRemaining": 0,
  "canExit": true,
  "roomAvailable": true
}
```

#### Step 3: System Validates All Items

After each scan-out, the system:
1. Verifies the customer card ID matches the room's assigned customer (if provided)
2. Verifies the product belongs to the customer's session
3. Checks if any items remain unscanned for this customer
4. If items missing → Room status set to `alert`, door locked
5. If all items scanned → Proceeds to anomaly detection

#### Step 4: Anomaly Detection (Automatic)

When all items are scanned out:
1. AI service analyzes the session for anomalies:
   - Duration vs predicted duration
   - Missing items
   - Behavioral patterns
2. If anomaly detected → Room stays in `alert` status
3. If no anomaly → Room automatically becomes `available`

#### Step 5: Room Status Update

**No Missing Items & No Anomaly:**
- Room status: `occupied` → `available`
- `customer_rfid`: Cleared
- `entry_time`: Cleared
- `session_id`: Cleared
- Session status: `completed`

**Missing Items or Anomaly:**
- Room status: `occupied` → `alert`
- Alert created in database
- Staff intervention required

### Manual Checkout (Staff Override)

If staff needs to manually release a room:

**Endpoint:** `PATCH /api/rooms/:id/status`

**Request Body:**
```json
{
  "status": "available"
}
```

**Security Check:** The system will **prevent** this if items are not scanned out:
```json
{
  "error": "Cannot exit room: Items not scanned out",
  "message": "2 item(s) must be scanned out before customer can exit",
  "missingItems": [
    {"sku": "DRESS-001", "name": "Summer Dress"},
    {"sku": "SHIRT-001", "name": "Cotton Shirt"}
  ]
}
```

### Complete Checkout Example Workflow

```bash
# 1. Customer enters with 2 items
POST /api/rooms/assign
# Body: {"customerCardId": "RFID-12345", "productIds": ["DRESS-001", "SHIRT-001"]}
# Room 1 becomes occupied

# 2. Get list of items that need to be scanned out (using card ID)
GET /api/rooms/pending-scan-out?customerCardId=RFID-12345
# Response: Shows 2 items (DRESS-001, SHIRT-001) that need to be scanned out

# 3. Customer scans out first item (with card ID verification)
POST /api/rooms/1/scan-out
# Body: {"productSku": "DRESS-001", "customerCardId": "RFID-12345"}
# Response: itemsRemaining: 1, canExit: false

# 4. Customer scans out second item
POST /api/rooms/1/scan-out
# Body: {"productSku": "SHIRT-001", "customerCardId": "RFID-12345"}
# Response: itemsRemaining: 0, canExit: true, roomAvailable: true

# 5. System automatically:
#    - Verifies all items belong to this customer's session
#    - Runs anomaly detection
#    - Updates session to "completed"
#    - Sets room status to "available"
#    - Clears customer data
```

### Why Customer Card ID is Important

**The system uses the customer card ID to maintain a complete audit trail:**

1. **When assigning:** Card ID links customer to room and products
2. **During checkout:** Card ID verifies the customer is authorized to scan out items
3. **Security:** Prevents customers from scanning out items from other customers' sessions
4. **Session tracking:** All products are linked to a session ID, which is linked to the customer card ID

**Best Practice:** Always provide `customerCardId` when scanning out to ensure proper security and tracking.

---

## 🔍 Troubleshooting

### Database Connection Issues

**Error:** `Database connection failed`

**Solutions:**
1. Verify PostgreSQL is running:
   ```bash
   sudo systemctl status postgresql  # Linux
   brew services list                # macOS
   ```

2. Check password in `.env.local` matches PostgreSQL password

3. Verify database exists:
   ```bash
   psql -U postgres -l | grep fitting_room_system
   ```

4. Test connection manually:
   ```bash
   psql -U postgres -d fitting_room_system
   ```

### Backend Server Issues

**Error:** `Port 4000 already in use`

**Solution:**
1. Find process using port:
   ```bash
   lsof -i :4000  # Linux/macOS
   netstat -ano | findstr :4000  # Windows
   ```

2. Kill process or change PORT in `.env.local`

**Error:** `JWT_SECRET is not defined`

**Solution:**
1. Ensure `.env.local` exists in root directory
2. Verify JWT_SECRET is set
3. Restart backend server

**Error:** `Cannot find module 'express'`

**Solution:**
```bash
npm install
```

### AI Service Issues

**Error:** `Duration model not found. Run train.py first.`

**Solution:**
```bash
cd AI
python train.py
```

**Error:** `Item database not found`

**Solution:**
```bash
cd AI
python simulate_data.py
```

**Error:** `AI service connection refused`

**Solutions:**
1. Verify AI service is running on port 8000
2. Check `AI_SERVICE_URL` in `.env.local` matches
3. Test AI service directly:
   ```bash
   curl http://localhost:8000/
   ```

### Frontend Issues

**Error:** `Cannot connect to backend`

**Solution:**
1. Verify backend is running on port 4000
2. Check `NEXT_PUBLIC_API_URL` in `.env.local` (if set)
3. Check browser console for CORS errors

**Error:** `Login fails`

**Solution:**
1. Verify database users exist:
   ```sql
   SELECT username FROM users;
   ```
2. Default password is `password123`
3. Check backend logs for authentication errors

### Room Assignment Issues

**Error:** `Room is not available`

**Solution:**
1. Check room status:
   ```sql
   SELECT room_number, status FROM rooms;
   ```
2. Rooms must be `available` to assign
3. If stuck in `alert`, manually set to `available`:
   ```sql
   UPDATE rooms SET status = 'available' WHERE room_number = 1;
   ```

**Error:** `AI service error during assignment`

**Solution:**
1. Verify AI service is running
2. Check AI service logs
3. Verify models are trained (`models/duration_model.pkl` exists)

### Checkout Issues

**Error:** `Cannot exit room: Items not scanned out`

**Solution:**
1. This is **intentional security** - all items must be scanned out
2. Check which items are missing:
   ```sql
   SELECT p.sku, p.name 
   FROM room_products rp
   JOIN products p ON rp.product_id = p.id
   WHERE rp.room_id = 1 
     AND rp.scanned_in_at IS NOT NULL 
     AND rp.scanned_out_at IS NULL;
   ```
3. Scan out all items before allowing exit

**Error:** `Room stuck in alert status`

**Solution:**
1. Check alerts:
   ```sql
   SELECT * FROM alerts WHERE room_id = 1 AND resolved = false;
   ```
2. Resolve alert or manually set room to available (after investigation):
   ```sql
   UPDATE rooms SET status = 'available' WHERE id = 1;
   ```

---

## 📚 Additional Resources

- **API Documentation:** `API_DOCUMENTATION.md`
- **Database Schema:** `database/setup_database.sql`
- **AI Service Docs:** `AI/README.md`
- **Backend Guide:** `BACKEND_COMPLETE_GUIDE.md`
- **Quick Start:** `QUICK_START.md`

---

## ✅ System Verification Checklist

After setup, verify everything works:

- [ ] Database connects successfully
- [ ] Backend API responds to `/api/health`
- [ ] AI service responds to `/`
- [ ] Frontend loads at `http://localhost:3000`
- [ ] Can log in with test credentials
- [ ] Can view rooms list
- [ ] Can assign customer to room
- [ ] Can scan products in/out
- [ ] Room automatically becomes available after checkout
- [ ] Alerts are created for missing items

---

## 🎯 Quick Reference Commands

### Start Everything
```bash
# Terminal 1: Backend
cd /home/tricenc/Desktop/Fitting\ Room && npm run server

# Terminal 2: AI Service
cd /home/tricenc/Desktop/Fitting\ Room/AI && source venv/bin/activate && uvicorn api:app --host 0.0.0.0 --port 8000 --reload

# Terminal 3: Frontend
cd /home/tricenc/Desktop/Fitting\ Room && npm run dev
```

### Test Database
```bash
psql -U postgres -d fitting_room_system -c "SELECT COUNT(*) FROM rooms;"
```

### Test Backend
```bash
curl http://localhost:4000/api/health
```

### Test AI Service
```bash
curl http://localhost:8000/
```

### Reset Database (Careful!)
```bash
psql -U postgres -d fitting_room_system -f database/setup_database_enhanced.sql
```

---

**Need help?** Check the troubleshooting section or review the specific documentation files for each component.

