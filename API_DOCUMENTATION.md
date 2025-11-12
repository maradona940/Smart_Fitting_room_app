# 🔌 Smart Fitting Room API Documentation

Base URL: `http://localhost:4000/api`

## 🔐 Authentication

All protected routes require JWT token in the Authorization header:
```
Authorization: Bearer YOUR_JWT_TOKEN
```

---

## 📋 API Endpoints

### 1. Authentication

#### POST `/auth/login`
Login and get JWT token

**Request:**
```json
{
  "username": "sarah_manager",
  "password": "password123"
}
```

**Response:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 2,
    "username": "sarah_manager",
    "role": "manager"
  }
}
```

#### GET `/auth/me`
Get current user info (Protected)

**Response:**
```json
{
  "id": 2,
  "username": "sarah_manager",
  "role": "manager",
  "created_at": "2024-..."
}
```

---

### 2. Rooms

#### GET `/rooms`
Get all fitting rooms (Protected)

**Response:**
```json
[
  {
    "id": "1",
    "number": 1,
    "status": "available",
    "itemCount": 0,
    "duration": 0,
    "customerCard": null,
    "alert": null
  },
  {
    "id": "2",
    "number": 2,
    "status": "occupied",
    "itemCount": 3,
    "duration": 8,
    "customerCard": "RFID-8472",
    "alert": null
  }
]
```

**Status Values:** `available`, `occupied`, `alert`

#### GET `/rooms/:id`
Get detailed room information (Protected)

**Response:**
```json
{
  "id": "2",
  "number": 2,
  "status": "occupied",
  "itemCount": 3,
  "duration": 8,
  "customerCard": "RFID-8472",
  "entryTime": "2024-11-03T20:00:00Z",
  "products": [
    {
      "id": "1",
      "code": "SKU-1234",
      "name": "Cotton Blend Dress Shirt",
      "size": "M",
      "color": "Blue",
      "scannedIn": true,
      "scannedOut": false,
      "isMissing": false
    }
  ]
}
```

#### PATCH `/rooms/:id/status`
Update room status (Protected)

**Request:**
```json
{
  "status": "available"
}
```

**Response:**
```json
{
  "message": "Room status updated",
  "room": { ... }
}
```

---

### 3. Unlock Requests

#### POST `/unlock-requests`
Create a new unlock request (Protected)

**Request:**
```json
{
  "roomId": "5",
  "reason": "Item count mismatch detected"
}
```

**Response:**
```json
{
  "message": "Unlock request created",
  "request": {
    "id": "1",
    "roomNumber": 5,
    "requestedBy": "john_sales",
    "requestTime": "2024-11-03T20:00:00Z",
    "reason": "Item count mismatch detected",
    "status": "pending"
  }
}
```

#### GET `/unlock-requests`
Get all unlock requests (Protected)

**Response:**
```json
[
  {
    "id": "1",
    "roomNumber": 5,
    "requestedBy": "john_sales",
    "requestTime": "2024-11-03T20:00:00Z",
    "reason": "Item count mismatch detected",
    "status": "pending"
  }
]
```

#### PATCH `/unlock-requests/:id/approve`
Approve unlock request (Manager Only)

**Response:**
```json
{
  "message": "Unlock request approved and room unlocked"
}
```

**Note:** This endpoint also unlocks the room and clears all products.

#### PATCH `/unlock-requests/:id/reject`
Reject unlock request (Manager Only)

**Response:**
```json
{
  "message": "Unlock request rejected"
}
```

---

### 4. Alerts

#### GET `/alerts`
Get all security alerts (Protected)

**Response:**
```json
[
  {
    "id": "1",
    "type": "missing-item",
    "severity": "high",
    "roomNumber": 5,
    "message": "Product RFID mismatch: 1 item not scanned on exit",
    "timestamp": "2024-11-03T20:00:00Z",
    "resolved": false
  }
]
```

**Alert Types:** `missing-item`, `time-exceeded`, `forced-entry`, `scan-discrepancy`

**Severity:** `high`, `medium`, `low`

#### POST `/alerts`
Create a new alert (Protected)

**Request:**
```json
{
  "roomId": "5",
  "type": "missing-item",
  "severity": "high",
  "message": "Product RFID mismatch: 1 item not scanned on exit"
}
```

**Response:**
```json
{
  "message": "Alert created",
  "alert": { ... }
}
```

#### PATCH `/alerts/:id/resolve`
Mark alert as resolved (Protected)

**Response:**
```json
{
  "message": "Alert resolved successfully"
}
```

---

### 5. Health Check

#### GET `/health`
Check if API is running (Public)

**Response:**
```json
{
  "status": "ok",
  "message": "Smart Fitting Room API is running"
}
```

---

## 🔒 Authorization Levels

### Public Routes
- `POST /auth/login`
- `GET /health`

### Authenticated Routes (Any Role)
- `GET /auth/me`
- `GET /rooms`
- `GET /rooms/:id`
- `PATCH /rooms/:id/status`
- `POST /unlock-requests`
- `GET /unlock-requests`
- `GET /alerts`
- `POST /alerts`
- `PATCH /alerts/:id/resolve`

### Manager Only Routes
- `PATCH /unlock-requests/:id/approve`
- `PATCH /unlock-requests/:id/reject`

---

## 📝 Error Responses

All errors follow this format:

```json
{
  "error": "Error message description"
}
```

### Common Status Codes
- `200` - Success
- `201` - Created
- `400` - Bad Request (validation error)
- `401` - Unauthorized (missing/invalid token)
- `403` - Forbidden (insufficient permissions)
- `404` - Not Found
- `500` - Server Error

---

## 🧪 Testing with Postman

1. **Login** → Copy the `token` from response
2. **Set Authorization** → Bearer Token → Paste token
3. **Make requests** to protected endpoints

### Sample Postman Collection

```json
{
  "info": { "name": "Smart Fitting Room API" },
  "item": [
    {
      "name": "Login",
      "request": {
        "method": "POST",
        "url": "{{base_url}}/auth/login",
        "body": {
          "mode": "raw",
          "raw": "{\"username\":\"sarah_manager\",\"password\":\"password123\"}"
        }
      }
    }
  ]
}
```

---

## 🔄 Real-time Updates (Future)

For real-time functionality, consider adding Socket.io:
- New unlock requests trigger manager notifications
- Room status changes update all connected clients
- Alert creation broadcasts to all staff

---

## 📊 Database Schema Reference

See `database/setup.sql` for complete schema including:
- `users` - Authentication and roles
- `rooms` - Fitting room status
- `products` - Inventory items
- `room_products` - Junction table for tracking
- `unlock_requests` - Access control
- `alerts` - Security notifications
