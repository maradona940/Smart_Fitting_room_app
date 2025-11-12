# 🧪 Testing Guide - Smart Fitting Room System

## ✅ System Status

Your application is now **fully operational** and connected to your PostgreSQL database!

---

## 🌐 Server URLs

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:4000
- **API Documentation**: http://localhost:4000/ (shows all endpoints)

---

## 🔐 Test Credentials

All users can login with these credentials from **your PostgreSQL database**:

| Username | Password | Role |
|----------|----------|------|
| `sarah_manager` | `password123` | Manager |
| `john_sales` | `password123` | Salesperson |
| `mike_sales` | `password123` | Salesperson |

---

## 🧪 Verified Tests

### ✅ Database Connection
- Connected to: `fitting_room_system` database
- Tables: users, rooms, products, room_products, unlock_requests, alerts
- All data properly seeded

### ✅ Login Validation
All login attempts are validated against your PostgreSQL database:
- ✅ Valid credentials → Returns JWT token
- ✅ Invalid password → Rejected
- ✅ Non-existent user → Rejected

---

## 🔍 Manual Testing

### Test 1: View API Documentation
```bash
# Open in browser
http://localhost:4000/
```
Should show all available endpoints and test credentials.

### Test 2: Login via API
```bash
POST http://localhost:4000/api/auth/login
Content-Type: application/json

{
  "username": "sarah_manager",
  "password": "password123"
}
```

**Expected Response:**
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

### Test 3: Get Rooms (Protected Route)
```bash
GET http://localhost:4000/api/rooms
Authorization: Bearer YOUR_TOKEN_HERE
```

### Test 4: Frontend Login
1. Go to http://localhost:3000
2. Login with:
   - Username: `sarah_manager`
   - Password: `password123`
3. Should see the dashboard with 8 fitting rooms

---

## 🛠️ Quick Test Scripts

Run these commands to verify everything:

```bash
# Test database connection
node test-db-connection.cjs

# Test login endpoint
node test-login.cjs
```

---

## 📊 Database Information

**Database**: `fitting_room_system` (PostgreSQL)

**Tables Created:**
- `users` - 3 users (john_sales, sarah_manager, mike_sales)
- `rooms` - 8 fitting rooms
- `products` - 12 sample products
- `room_products` - Junction table for room-product relationships
- `unlock_requests` - Tracks unlock requests from salespersons
- `alerts` - System alerts (item mismatch, long duration, etc.)

---

## 🎯 What's Working

✅ Backend API running on port 4000  
✅ Frontend running on port 3000  
✅ PostgreSQL database connected  
✅ Login validates against database  
✅ JWT authentication working  
✅ All API endpoints operational  
✅ CORS configured for frontend  

---

## 🚀 Next Steps

1. **Test the frontend**: Open http://localhost:3000 and login
2. **Monitor rooms**: View all 8 fitting rooms on the dashboard
3. **Test alerts**: Create alerts for occupied rooms
4. **Test unlock requests**: Salespersons can request unlocks, managers can approve

---

## 📝 Notes

- All passwords are properly hashed using bcrypt
- JWT tokens expire after 24 hours
- Database credentials are stored in `.env.local`
- Both servers must be running for full functionality

---

**Last Updated**: November 4, 2025  
**Status**: ✅ All systems operational
