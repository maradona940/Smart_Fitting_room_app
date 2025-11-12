# 🎉 Backend & Database Setup - Complete Guide

## ✅ What We've Built

Your Smart Fitting Room System now has:
- ✅ PostgreSQL database with 6 tables
- ✅ Express.js REST API with authentication
- ✅ JWT token-based security
- ✅ Role-based access control (Salesperson & Manager)
- ✅ Complete CRUD operations for all features

---

## 📋 Setup Checklist

### ☑️ Step 1: Database Setup in pgAdmin

1. **Open pgAdmin 4**
2. **Connect to PostgreSQL** (use your password)
3. **Run the ALTER script** (IMPORTANT - Do this first!)
   - Click: Databases → fitting_room_system → Query Tool
   - Open file: `database/alter_remove_checking_out.sql`
   - Click Execute (F5)
   - ✅ Should see: "Successfully removed checking-out status"

### ☑️ Step 2: Configure Environment

1. **Rename the config file:**
   ```
   env.config.example  →  .env.local
   ```

2. **Edit `.env.local`** with your actual values:
   ```env
   DB_HOST=localhost
   DB_PORT=5432
   DB_NAME=fitting_room_system
   DB_USER=postgres
   DB_PASSWORD=YOUR_ACTUAL_PASSWORD_HERE  ← Change this!
   
   JWT_SECRET=mySecretKey123!@#  ← Change to random string
   
   PORT=4000
   NODE_ENV=development
   FRONTEND_URL=http://localhost:3000
   ```

### ☑️ Step 3: Start the Backend Server

Open a **NEW terminal** (keep frontend running in the other one):

```bash
npm run server
```

**Expected output:**
```
🚀 Server running on http://localhost:4000
📊 API endpoints available at http://localhost:4000/api
✅ Database connected at: 2024-11-03 23:27:00
```

---

## 🧪 Test the Backend

### Test 1: Health Check (No Auth Required)
```bash
# In browser or terminal:
http://localhost:4000/api/health
```

Expected: `{ "status": "ok", ... }`

### Test 2: Login & Get Token
Use Postman, Thunder Client, or curl:

```bash
POST http://localhost:4000/api/auth/login
Content-Type: application/json

{
  "username": "sarah_manager",
  "password": "password123"
}
```

**Copy the `token` from the response!**

### Test 3: Get Rooms (Protected)
```bash
GET http://localhost:4000/api/rooms
Authorization: Bearer YOUR_TOKEN_HERE
```

Expected: Array of 6 rooms with live data from database!

---

## 📁 File Structure

```
groupproject/
├── database/
│   ├── setup.sql                    # Initial database schema
│   └── alter_remove_checking_out.sql # ALTER script (run this!)
│
├── server/
│   ├── config/
│   │   └── db.ts                    # PostgreSQL connection
│   ├── controllers/
│   │   ├── authController.ts        # Login, authentication
│   │   ├── roomController.ts        # Room management
│   │   ├── unlockController.ts      # Unlock requests
│   │   └── alertController.ts       # Security alerts
│   ├── middleware/
│   │   └── auth.ts                  # JWT verification
│   ├── routes/
│   │   ├── authRoutes.ts
│   │   ├── roomRoutes.ts
│   │   ├── unlockRoutes.ts
│   │   └── alertRoutes.ts
│   └── index.ts                     # Main server file
│
├── .env.local                       # Environment config (you create this)
└── env.config.example               # Template (rename this)
```

---

## 🔐 Test User Accounts

The database includes 3 pre-configured users:

| Username | Password | Role | Access |
|----------|----------|------|--------|
| `sarah_manager` | `password123` | manager | Full access + approvals |
| `john_sales` | `password123` | salesperson | Request unlock only |
| `mike_sales` | `password123` | salesperson | Request unlock only |

---

## 🚀 Running Both Frontend & Backend

You need **TWO terminal windows**:

### Terminal 1: Frontend (Next.js)
```bash
npm run dev
# Runs on http://localhost:3000
```

### Terminal 2: Backend (Express.js)
```bash
npm run server
# Runs on http://localhost:4000
```

**Both must be running at the same time!**

---

## 🔗 API Endpoints Summary

### Authentication
- `POST /api/auth/login` - Login & get token
- `GET /api/auth/me` - Get current user (protected)

### Rooms
- `GET /api/rooms` - Get all rooms (protected)
- `GET /api/rooms/:id` - Get room details (protected)
- `PATCH /api/rooms/:id/status` - Update status (protected)

### Unlock Requests
- `POST /api/unlock-requests` - Create request (protected)
- `GET /api/unlock-requests` - Get all requests (protected)
- `PATCH /api/unlock-requests/:id/approve` - Approve (manager only)
- `PATCH /api/unlock-requests/:id/reject` - Reject (manager only)

### Alerts
- `GET /api/alerts` - Get all alerts (protected)
- `POST /api/alerts` - Create alert (protected)
- `PATCH /api/alerts/:id/resolve` - Resolve (protected)

**📖 Full API docs:** See `API_DOCUMENTATION.md`

---

## 🐛 Troubleshooting

### ❌ "Database connection failed"
**Problem:** Can't connect to PostgreSQL

**Solutions:**
1. Check PostgreSQL is running (Services → postgresql)
2. Verify password in `.env.local` matches your pgAdmin password
3. Check database name is `fitting_room_system`
4. Try: `psql -U postgres` in terminal to test connection

### ❌ "Port 4000 already in use"
**Problem:** Something else is using port 4000

**Solution:**
Change PORT in `.env.local` to `4001` or `5000`

### ❌ "Cannot find module 'express'"
**Problem:** Dependencies not installed

**Solution:**
```bash
npm install
```

### ❌ "JWT_SECRET is not defined"
**Problem:** Environment variables not loaded

**Solution:**
1. Make sure file is named exactly `.env.local`
2. Check it's in the root folder (same level as package.json)
3. Restart the server after creating `.env.local`

### ❌ "relation 'rooms' does not exist"
**Problem:** Database not set up correctly

**Solution:**
1. Open pgAdmin
2. Check database `fitting_room_system` exists
3. Run setup.sql again if needed
4. Verify tables exist: `SELECT * FROM information_schema.tables WHERE table_schema = 'public';`

---

## ✅ Success Checklist

Before moving to the next step, verify:

- [ ] PostgreSQL is running
- [ ] ALTER script executed successfully (checking-out removed)
- [ ] `.env.local` file exists with correct password
- [ ] Backend server starts without errors
- [ ] Health check returns "ok"
- [ ] Login returns a JWT token
- [ ] Get rooms returns 6 rooms from database

---

## 🎯 What's Next?

Now that backend is working:
1. ✅ **Backend API** - COMPLETE!
2. ⏳ **Frontend Integration** - NEXT STEP
   - Replace mock data with API calls
   - Add JWT token storage
   - Connect login to real authentication
   - Fetch rooms from database
   - Real unlock request flow

**Ready to integrate?** Let me know and I'll update the frontend to use the real API! 🚀

---

## 📚 Additional Resources

- **Database Schema:** `database/setup.sql`
- **API Documentation:** `API_DOCUMENTATION.md`
- **Implementation Notes:** `IMPLEMENTATION_NOTES.md`
- **User Guide:** `USER_GUIDE.md`

---

**Need help?** Check the error message carefully and refer to the troubleshooting section above!
