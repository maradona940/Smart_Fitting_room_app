# ⚡ Quick Start Guide - Database & Backend

## 🎯 Complete These Steps in Order

### 1️⃣ Run the ALTER Script in pgAdmin
```
File: database/alter_remove_checking_out.sql
```
1. Open **pgAdmin 4**
2. Connect to PostgreSQL
3. Right-click `fitting_room_system` → **Query Tool**
4. Open `alter_remove_checking_out.sql`
5. Click **Execute (F5)**
6. ✅ See: "Successfully removed checking-out status"

---

### 2️⃣ Setup Environment Variables
```
1. Rename: env.config.example → .env.local
2. Edit .env.local:
   - Change DB_PASSWORD to your PostgreSQL password
   - Change JWT_SECRET to any random string
```

---

### 3️⃣ Start Backend Server
```bash
npm run server
```

**Expected Output:**
```
🚀 Server running on http://localhost:4000
✅ Database connected at: [timestamp]
```

---

### 4️⃣ Test the Backend

**Test in browser:**
```
http://localhost:4000/api/health
```

**Should see:**
```json
{ "status": "ok", "message": "Smart Fitting Room API is running" }
```

---

### 5️⃣ Test Login with Postman/Browser

**POST** `http://localhost:4000/api/auth/login`
```json
{
  "username": "sarah_manager",
  "password": "password123"
}
```

**Should get back a TOKEN** ✅

---

## ✅ Success Criteria

- [ ] ALTER script ran successfully (no "checking-out" status)
- [ ] .env.local file created with your password
- [ ] Backend server starts on port 4000
- [ ] Health check returns "ok"
- [ ] Login returns a JWT token

---

## 🚨 If Something Goes Wrong

**Can't connect to database?**
- Check PostgreSQL is running
- Verify password in .env.local

**Port 4000 in use?**
- Change PORT in .env.local to 4001

**Module not found?**
```bash
npm install
```

---

## 📂 Files Created

✅ Database:
- `database/setup.sql` - Initial schema (already ran)
- `database/alter_remove_checking_out.sql` - **RUN THIS FIRST!**

✅ Backend:
- `server/` folder - Complete Express.js API
- `env.config.example` - Rename to `.env.local`

✅ Documentation:
- `BACKEND_COMPLETE_GUIDE.md` - Full setup guide
- `API_DOCUMENTATION.md` - All API endpoints
- `DATABASE_SETUP_INSTRUCTIONS.md` - Database details

---

## 🎯 What You Should Do Now

1. **Run the ALTER script** in pgAdmin (Step 1)
2. **Create .env.local** file (Step 2)  
3. **Start the server** with `npm run server` (Step 3)
4. **Tell me if it works!** 

Once backend is running, I'll integrate the frontend to use the real database! 🚀
