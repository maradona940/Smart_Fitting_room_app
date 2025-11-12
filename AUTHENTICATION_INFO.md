# 🔐 Authentication Information

## About "Hardcoded" Credentials

The test credentials you see are **NOT hardcoded in the application code**. They are **real user accounts stored in your PostgreSQL database**.

### How It Works

1. **Database Users**: The users exist in the `users` table in your `fitting_room_system` database
2. **Password Hashing**: All passwords are securely hashed using bcrypt (salt rounds: 10)
3. **Real Validation**: Every login attempt queries the database and validates the password hash

### Current Test Users in Database

These are the users currently in your PostgreSQL `users` table:

```sql
SELECT username, role FROM users;
```

| ID | Username | Role | Password (plaintext for testing) |
|----|----------|------|----------------------------------|
| 1  | john_sales | salesperson | password123 |
| 2  | sarah_manager | manager | password123 |
| 3  | mike_sales | salesperson | password123 |

### Password Hash Example

The password `password123` is stored as:
```
$2b$10$rLK5aqv9gaB4RuRcLjnT9urHZD..S4ECRBL5vrimcJG3d4FZim2Ne
```

This is a bcrypt hash that cannot be reversed. The system compares the entered password hash with the stored hash during login.

---

## How to Add New Users

### Option 1: Using pgAdmin (GUI)

1. Open pgAdmin and connect to your database
2. Navigate to `fitting_room_system` → Schemas → public → Tables → users
3. Right-click on `users` → View/Edit Data → All Rows
4. Add a new row with:
   - `username`: your_new_username
   - `password_hash`: (use the script below to generate)
   - `role`: either 'salesperson' or 'manager'

### Option 2: Using a Script

Create and run this script to add a new user:

```javascript
// add-user.cjs
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
require('dotenv').config({ path: '.env.local' });

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'fitting_room_system',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD,
});

async function addUser(username, password, role) {
  const client = await pool.connect();
  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    
    const result = await client.query(
      'INSERT INTO users (username, password_hash, role) VALUES ($1, $2, $3) RETURNING id, username, role',
      [username, hashedPassword, role]
    );
    
    console.log('✅ User created:', result.rows[0]);
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    client.release();
    await pool.end();
  }
}

// Example: Add a new manager
addUser('new_manager', 'securepassword123', 'manager');
```

Run with: `node add-user.cjs`

### Option 3: Direct SQL

```sql
-- First, generate a password hash (use bcrypt with salt rounds 10)
-- Then insert the user:

INSERT INTO users (username, password_hash, role) 
VALUES (
  'new_username', 
  '$2b$10$YOUR_BCRYPT_HASH_HERE',
  'manager'  -- or 'salesperson'
);
```

---

## Changing Passwords

To change a user's password, use the `fix-passwords.cjs` script or create a similar one:

```bash
node fix-passwords.cjs
```

Or update manually in the database with a new bcrypt hash.

---

## Security Notes

### ✅ What IS Secure

- Passwords are hashed with bcrypt (industry standard)
- JWT tokens expire after 24 hours
- Backend validates all credentials against database
- No passwords stored in plaintext

### ⚠️ For Production

Before deploying to production:

1. **Change JWT Secret**: Update `JWT_SECRET` in `.env.local` to a strong random string
2. **Remove Test Users**: Delete the test accounts or change their passwords
3. **Use Environment Variables**: Never commit `.env.local` to version control
4. **Add HTTPS**: Use SSL/TLS for all API communication
5. **Add Rate Limiting**: Prevent brute force attacks on login endpoint
6. **Add Password Requirements**: Enforce strong password policies
7. **Add 2FA**: Consider two-factor authentication for managers

---

## Login Flow

1. User enters username and password on frontend
2. Frontend sends POST request to `http://localhost:4000/api/auth/login`
3. Backend queries database: `SELECT * FROM users WHERE username = ?`
4. Backend compares password hash using `bcrypt.compare()`
5. If valid, backend generates JWT token and returns user data
6. Frontend stores token in localStorage
7. All subsequent API calls include token in Authorization header

---

## Troubleshooting

### "Invalid credentials" even with correct password

1. Check if user exists: `SELECT * FROM users WHERE username = 'your_username';`
2. Verify password hash was generated correctly
3. Run `node fix-passwords.cjs` to reset all passwords to `password123`

### "Failed to connect to server"

1. Ensure backend is running: `npm run server`
2. Check backend is on port 4000: http://localhost:4000
3. Check CORS settings in `server/index.ts`

---

**Remember**: The test credentials (`password123`) are only for development. Always use strong, unique passwords in production!
