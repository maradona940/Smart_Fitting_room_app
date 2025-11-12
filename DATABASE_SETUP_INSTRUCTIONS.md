# 🗄️ Database Setup Instructions

## Step 1: Run the ALTER Script First!

Since you already created the database with the initial setup, **run this first** to remove "checking-out" status:

1. Open **pgAdmin 4**
2. Connect to your PostgreSQL server
3. Right-click on **fitting_room_system** database → **Query Tool**
4. Open the file: `database/alter_remove_checking_out.sql`
5. Click **Execute** (F5)
6. You should see: "Successfully removed checking-out status"

## Step 2: Configure Environment Variables

1. **Rename the file**: 
   - From: `env.config.example`
   - To: `.env.local`

2. **Edit `.env.local`** and update these values:
   ```env
   DB_PASSWORD=your_actual_postgres_password
   JWT_SECRET=change_this_to_a_random_string_abc123xyz
   ```

## Step 3: Verify Database Setup

Run this query in pgAdmin to check everything:

```sql
-- Check all tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public';

-- Check room statuses (should only be: available, occupied, alert)
SELECT DISTINCT status FROM rooms;

-- Check sample data
SELECT 
    r.room_number, 
    r.status, 
    COUNT(rp.id) as products
FROM rooms r
LEFT JOIN room_products rp ON r.id = rp.room_id
GROUP BY r.room_number, r.status
ORDER BY r.room_number;
```

## Step 4: Test Login Credentials

The database includes 3 test users:

| Username | Password | Role |
|----------|----------|------|
| `john_sales` | `password123` | salesperson |
| `sarah_manager` | `password123` | manager |
| `mike_sales` | `password123` | salesperson |

## Step 5: Start the Backend Server

```bash
npm run server
```

You should see:
```
🚀 Server running on http://localhost:4000
✅ Database connected at: [timestamp]
```

## Step 6: Test the API

Open your browser or Postman and test:

### Health Check
```
GET http://localhost:4000/api/health
```

### Login
```
POST http://localhost:4000/api/auth/login
Content-Type: application/json

{
  "username": "sarah_manager",
  "password": "password123"
}
```

Response should include a `token` - copy this for next steps!

### Get Rooms (Protected Route)
```
GET http://localhost:4000/api/rooms
Authorization: Bearer YOUR_TOKEN_HERE
```

## Troubleshooting

### Error: "Database connection failed"
- Check PostgreSQL is running
- Verify password in `.env.local`
- Make sure database name is `fitting_room_system`

### Error: "Port 4000 already in use"
- Change PORT in `.env.local` to 4001 or another free port

### Error: "Cannot find module"
- Run: `npm install`

## What's Next?

Once the backend is running:
1. Keep the backend server running (`npm run server`)
2. In a **new terminal**, start the frontend (`npm run dev`)
3. Both will run together:
   - Frontend: http://localhost:3000
   - Backend: http://localhost:4000

We'll integrate them next!
