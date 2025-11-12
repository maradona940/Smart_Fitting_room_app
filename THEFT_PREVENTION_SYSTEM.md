# 🔒 Theft Prevention System - Complete Flow

## Overview

The system prevents customers from leaving the fitting room when items are not scanned out. The door remains locked until all items are scanned out, requiring staff intervention for unlock requests.

## How It Works

### 1. Real-Time Detection During Scan-Out

**When a product is scanned out:**
- System immediately checks if any items are still missing
- If items are missing → Room status changes to `alert`
- Alert is created/updated explaining the door is locked
- Customer cannot exit until all items are scanned

**Location:** `server/controllers/roomController.ts` - `scanProductOut()`

### 2. Exit Prevention at Status Change

**When trying to change room status from `occupied` to `available`:**
- System checks if all scanned-in items have been scanned out
- If items are missing → Status change is **BLOCKED**
- Room status is forced to `alert` instead
- Returns error: "Cannot exit room: Items not scanned out"
- Alert is created explaining the door is locked

**Location:** `server/controllers/roomController.ts` - `updateRoomStatus()`

### 3. AI Anomaly Detection

**When a session ends successfully (all items scanned out):**
- AI model analyzes the session for anomalies
- Checks duration patterns, behavior, and scan patterns
- If anomaly detected → Room status set to `alert`
- Alert created with AI analysis results

**Location:** `server/controllers/roomController.ts` - `updateRoomStatus()` (async anomaly detection)

## Alert Messages

All alert messages now reflect the prevention system:

### Missing Item Alert
```
"Room X locked: Customer cannot exit - N item(s) not scanned out (SKU-XXXX - Item Name). 
System preventing exit until all items are scanned. Staff intervention required."
```

### Unlock Request Reason
```
"Customer unable to exit: Room door locked due to missing item scan. 
Need manager approval to unlock room and investigate. N item(s) not scanned out."
```

## Complete Flow Example

### Scenario: Customer tries to leave with missing item

1. **Customer enters Room 2** → Status: `occupied`
2. **Scans 3 items in** → SKU-0003, SKU-0005, SKU-0007
3. **Scans 2 items out** → SKU-0003, SKU-0005 ✅
4. **Tries to scan out SKU-0007** → Item not found (already missing)
5. **System detects missing item** → Real-time check after scan-out
   - Room status: `alert` 🔴
   - Alert created: "Room 2 locked: Customer cannot exit - 1 item (SKU-0007) not scanned out"
6. **Customer tries to exit** → Attempts to change status to `available`
   - System blocks exit → Returns 403 error
   - Room stays locked in `alert` status
7. **Salesperson sees alert** → Creates unlock request
8. **Manager approves** → Room unlocked, customer can exit
9. **Alert resolved** → System returns to normal

## Training Data Alignment

### Product SKUs in Database
- **Actual Products:** SKU-0001 through SKU-0012 (12 products)
- All training data uses these actual products
- Additional products (SKU-0013 to SKU-0100) generated for diversity
- Training prioritizes actual DB products

### Training Data Generation
- `AI/simulate_data.py` now loads from database first
- Falls back to generating data matching actual DB products
- All product combinations in training exist in actual database
- Training data includes actual product SKUs (SKU-0001 to SKU-0012)

## Real-Time vs Batch Detection

### Real-Time Detection
- ✅ **During scan-out:** Immediately checks for missing items
- ✅ **At exit attempt:** Blocks status change if items missing
- ✅ **Immediate alert:** Room locked instantly when anomaly detected

### Batch Detection (After Session)
- ✅ **AI analysis:** Runs after successful exit (all items scanned)
- ✅ **Pattern detection:** Identifies behavioral anomalies
- ✅ **Training data:** Saves session data for continuous learning

## Database Schema Support

### Sessions Table
- Tracks complete sessions with anomaly flags
- Stores predicted vs actual duration
- Records anomaly scores and risk levels
- Links to room_products for scan tracking

### Room Products Table
- `in_entry_scan`: Item was scanned on entry
- `in_exit_scan`: Item was scanned on exit
- `is_missing`: Item is missing (not scanned out)
- `session_id`: Links to session for training

### Alerts Table
- `session_id`: Links to session
- `alert_type`: 'missing-item' for theft prevention
- `message`: Clear explanation of door lock status

## Testing the Flow

### Test 1: Normal Exit (All Items Scanned)
1. Customer enters room
2. Scans 3 items in
3. Scans all 3 items out
4. Status changes to `available` ✅
5. No alerts created

### Test 2: Theft Prevention (Missing Item)
1. Customer enters room
2. Scans 3 items in
3. Scans only 2 items out
4. Tries to exit → **BLOCKED** ❌
5. Room status: `alert`
6. Alert created: "Room locked: Customer cannot exit"
7. Unlock request needed from manager

### Test 3: Manager Unlock
1. Salesperson creates unlock request
2. Manager sees request
3. Manager approves → Room unlocked
4. Customer can exit
5. Alert resolved

## Integration Points

### Frontend
- Shows alert status on room cards
- Displays unlock request button for salesperson
- Shows unlock request panel for manager
- Real-time updates when room status changes

### Backend
- Prevents exit when items missing
- Creates alerts automatically
- Manages unlock requests
- Saves session data for AI training

### AI Service
- Predicts duration using actual DB products
- Detects anomalies using real session data
- Trains on database products (SKU-0001 to SKU-0012)
- Saves completed sessions to database

---

**The system now fully prevents theft by locking the door when items are missing!** 🔒

