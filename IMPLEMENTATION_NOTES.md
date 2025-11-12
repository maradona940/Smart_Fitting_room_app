# Smart Fitting Room System - Implementation Notes

## ✅ Completed Features

### 1. **Authentication System**
- **Login Page** (`/login`) with role-based access
- Two user roles:
  - **Salesperson**: Can view rooms, request unlock
  - **Manager**: Can approve/reject unlock requests + all salesperson features
- Session stored in localStorage
- Auto-redirect to login if not authenticated

### 2. **Enhanced Product Tracking**
- ✅ **Scanned In** status with checkmark (green tick)
- ✅ **Scanned Out** status with checkmark
- ⚠️ **MISSING** status - Shows when item is scanned in AND out during an alert
- Visual indicators:
  - Green checkmark = Action completed
  - Red X = Not scanned
  - Gray X = Not yet scanned out (normal)
  - Red "MISSING" badge = Item left the room without authorization

### 3. **Unlock Request System**
- **Salesperson Flow**:
  - Clicks "Request Unlock" on alert rooms
  - Request sent to manager queue with reason
  - Toast notification confirms submission
  
- **Manager Flow**:
  - Sees "Unlock Requests Panel" in dashboard
  - Can **Approve** (unlocks room immediately) or **Reject** requests
  - Real-time updates across the system

### 4. **Role-Based UI**
- **Salesperson Dashboard**:
  - Fitting rooms grid
  - Alerts panel
  - "Request Unlock" button on alert rooms

- **Manager Dashboard**:
  - Fitting rooms grid  
  - **Unlock Requests Panel** (exclusive)
  - Alerts panel
  - "Unlock" button (immediate action)

### 5. **Visual Enhancements**
- Beautiful gradient background (blue theme)
- Glass morphism header with backdrop blur
- User info display (username + role)
- Logout button
- Professional card-based design

## 🎯 How to Use

### Login
1. Navigate to `http://localhost:3000/login`
2. Enter any username/password
3. Select role: **Salesperson** or **Manager**
4. Click Login

### Test Scenarios

#### Scenario 1: Salesperson Requesting Unlock
1. Login as **Salesperson**
2. Find **Room 5** (Alert status - Item count mismatch)
3. Click "Request Unlock" button
4. Request submitted to manager queue
5. Toast confirms submission

#### Scenario 2: Manager Approving Unlock
1. Login as **Manager**
2. See "Unlock Requests Panel" on right side
3. Click "Approve Unlock" on pending request
4. Room 5 status changes to "Available"
5. Toast confirms unlock

#### Scenario 3: Viewing Product Details
1. Click "View Details" on any occupied room (2, 3, 4, or 5)
2. Modal shows:
   - Customer RFID card
   - Duration in room
   - **Product list with scan status**:
     - Room 2: All items present (scanned in, not out)
     - Room 3: All items present
     - Room 4: All items checked out (scanned in + out)
     - Room 5: **1 item MISSING** (T-Shirt scanned out during alert)

## 📊 Mock Data Structure

### Rooms
- **Room 1, 6**: Available
- **Room 2**: Occupied (3 items, 8 min)
- **Room 3**: Occupied (5 items, 12 min)
- **Room 4**: Checking Out (2 items, 15 min - both scanned out)
- **Room 5**: ⚠️ Alert (4 items, 25 min - 1 missing)

### Product Tracking Example (Room 5)
```javascript
{
  name: "T-Shirt",
  scannedIn: true,    // ✓ Entered room
  scannedOut: true,   // ✓ Left room (PROBLEM!)
  // Result: Shows "MISSING" badge in alert room
}
```

## 🚀 Next Steps: Database & Backend Integration

### Phase 1: Backend API Setup

#### Recommended Tech Stack
- **Framework**: Node.js + Express or Next.js API Routes
- **Database**: PostgreSQL or MongoDB
- **Real-time**: Socket.io or Pusher for live updates
- **Auth**: JWT tokens or NextAuth.js

#### Required API Endpoints

```typescript
// Authentication
POST   /api/auth/login
POST   /api/auth/logout
GET    /api/auth/me

// Rooms
GET    /api/rooms
GET    /api/rooms/:id
PATCH  /api/rooms/:id/status

// Products
GET    /api/rooms/:id/products
POST   /api/products/scan-in
POST   /api/products/scan-out

// Unlock Requests
GET    /api/unlock-requests
POST   /api/unlock-requests
PATCH  /api/unlock-requests/:id/approve
PATCH  /api/unlock-requests/:id/reject

// Alerts
GET    /api/alerts
POST   /api/alerts
PATCH  /api/alerts/:id/resolve
```

### Phase 2: Database Schema

#### Users Table
```sql
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(100) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(20) NOT NULL,  -- 'salesperson' or 'manager'
  created_at TIMESTAMP DEFAULT NOW()
);
```

#### Rooms Table
```sql
CREATE TABLE rooms (
  id SERIAL PRIMARY KEY,
  room_number INTEGER UNIQUE NOT NULL,
  status VARCHAR(20) NOT NULL,  -- 'available', 'occupied', 'alert', 'checking-out'
  customer_rfid VARCHAR(50),
  entry_time TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);
```

#### Products Table
```sql
CREATE TABLE products (
  id SERIAL PRIMARY KEY,
  sku VARCHAR(50) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  size VARCHAR(20),
  color VARCHAR(50),
  created_at TIMESTAMP DEFAULT NOW()
);
```

#### Room Products (Junction Table)
```sql
CREATE TABLE room_products (
  id SERIAL PRIMARY KEY,
  room_id INTEGER REFERENCES rooms(id),
  product_id INTEGER REFERENCES products(id),
  scanned_in_at TIMESTAMP,
  scanned_out_at TIMESTAMP,
  is_missing BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW()
);
```

#### Unlock Requests Table
```sql
CREATE TABLE unlock_requests (
  id SERIAL PRIMARY KEY,
  room_id INTEGER REFERENCES rooms(id),
  requested_by INTEGER REFERENCES users(id),
  reason TEXT,
  status VARCHAR(20) DEFAULT 'pending',  -- 'pending', 'approved', 'rejected'
  approved_by INTEGER REFERENCES users(id),
  requested_at TIMESTAMP DEFAULT NOW(),
  resolved_at TIMESTAMP
);
```

#### Alerts Table
```sql
CREATE TABLE alerts (
  id SERIAL PRIMARY KEY,
  room_id INTEGER REFERENCES rooms(id),
  type VARCHAR(50) NOT NULL,
  severity VARCHAR(20) NOT NULL,
  message TEXT NOT NULL,
  resolved BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW(),
  resolved_at TIMESTAMP
);
```

### Phase 3: RFID Integration

#### Hardware Requirements
- **RFID Readers**: At room entrance/exit
- **RFID Tags**: On each clothing item
- **Controller**: Arduino/Raspberry Pi to bridge RFID → Server

#### Integration Points
1. **Entrance Scanner**:
   ```javascript
   // When customer enters with RFID card
   POST /api/rooms/enter
   {
     customerRfid: "RFID-8472",
     roomNumber: 2
   }
   ```

2. **Product Scan In**:
   ```javascript
   // When items brought into room
   POST /api/products/scan-in
   {
     roomId: 2,
     productSku: "SKU-1234"
   }
   ```

3. **Product Scan Out**:
   ```javascript
   // When items leave room
   POST /api/products/scan-out
   {
     roomId: 2,
     productSku: "SKU-1234"
   }
   ```

4. **Alert Trigger**:
   ```javascript
   // Auto-trigger if mismatch detected
   POST /api/alerts
   {
     roomId: 2,
     type: "missing-item",
     severity: "high",
     message: "Product RFID mismatch: 1 item not scanned on exit"
   }
   ```

### Phase 4: Real-time Updates

#### Socket.io Integration
```typescript
// Server-side
io.on('connection', (socket) => {
  socket.on('room:update', (roomData) => {
    io.emit('room:updated', roomData);
  });
  
  socket.on('unlock:requested', (requestData) => {
    io.emit('unlock:new-request', requestData);
  });
});

// Client-side (React)
useEffect(() => {
  socket.on('room:updated', (data) => {
    setRooms(prev => updateRoom(prev, data));
  });
  
  socket.on('unlock:new-request', (data) => {
    setUnlockRequests(prev => [data, ...prev]);
  });
}, []);
```

## 🔐 Security Considerations

1. **Password Hashing**: Use bcrypt for password storage
2. **JWT Tokens**: Secure token-based auth instead of localStorage
3. **RFID Encryption**: Encrypt RFID data in transit
4. **Role Validation**: Server-side role checks for all manager actions
5. **Rate Limiting**: Prevent spam unlock requests
6. **Audit Logs**: Track all unlock approvals/rejections

## 📝 Current File Structure

```
groupproject/
├── app/
│   ├── login/
│   │   └── page.tsx          # Login page
│   ├── page.tsx               # Main dashboard (role-based)
│   ├── layout.tsx             # Root layout
│   └── globals.css            # Global styles
├── components/
│   ├── ui/                    # Base UI components
│   ├── FittingRoomCard.tsx    # Room status card
│   ├── AlertsPanel.tsx        # Security alerts
│   ├── RoomDetailsModal.tsx   # Product details modal
│   ├── SystemStats.tsx        # Dashboard statistics
│   └── UnlockRequestsPanel.tsx # Manager unlock requests
└── lib/
    └── utils.ts               # Helper functions
```

## 🎨 Design Decisions

1. **LocalStorage Auth**: Quick prototype, replace with JWT + httpOnly cookies
2. **Mock Data**: In-memory state, ready to swap with API calls
3. **Role-based Rendering**: Conditional UI based on user.role
4. **Request/Approval Flow**: Separation of concerns (salesperson can't unlock directly)
5. **Visual Status Indicators**: Color-coded + icons for quick scanning

## 🐛 Known Limitations (Pre-Backend)

- [ ] No persistent data (refreshing page loses state)
- [ ] No real RFID scanning (mock data only)
- [ ] No real-time updates between multiple users
- [ ] Basic authentication (no password validation)
- [ ] No session timeout/expiry

## 💡 Feature Ideas for Future

- [ ] SMS/Email notifications for managers on unlock requests
- [ ] Analytics dashboard (avg time in room, popular items, etc.)
- [ ] Customer history tracking
- [ ] Inventory management integration
- [ ] Mobile app for staff
- [ ] Camera integration for security
- [ ] Multi-store support

---

**Ready for backend integration!** The frontend is fully functional with mock data and can be connected to a real backend by replacing the state management with API calls.
