# Smart Fitting Room System - Quick Start Guide

## 🚀 Getting Started

### Start the Application
The dev server is already running at: **http://localhost:3000**

### First Time Login
1. Go to **http://localhost:3000/login**
2. **Enter any username/password** (demo mode - all credentials work)
3. **Select your role**:
   - 👤 **Salesperson** - Request unlock access
   - 👨‍💼 **Manager** - Approve/reject unlock requests

## 👤 Salesperson Features

### What You Can Do:
✅ View all fitting rooms and their status
✅ Check product details in occupied rooms
✅ **Request unlock** for alert rooms
✅ View and resolve security alerts

### How to Request Unlock:
1. Find **Room 5** (shows red "ALERT" badge)
2. Click the **"Request Unlock"** button
3. Your request is sent to the manager
4. You'll see a confirmation toast

## 👨‍💼 Manager Features

### What You Can Do:
✅ Everything a salesperson can do, PLUS:
✅ **See unlock requests panel** on the right
✅ **Approve or reject** unlock requests
✅ Directly unlock rooms (immediate action)

### How to Approve Unlock Request:
1. Check the **"Unlock Requests"** panel (right side)
2. See pending requests with details
3. Click **"Approve Unlock"** (green button)
4. Room unlocks immediately and becomes available

## 🎯 Test the System

### Try This Flow:
1. **Login as Salesperson**
   - Request unlock for Room 5
   
2. **Logout and Login as Manager**
   - See the unlock request in the panel
   - Approve it
   - Watch Room 5 become "Available"

3. **Click "View Details" on any room**
   - Room 2: See 3 items all present
   - Room 5: See **1 MISSING item** (red badge)
   - Notice the checkmarks:
     - ✅ Green = Scanned in/out
     - ❌ Red = Not scanned
     - ⚠️ MISSING = Item left without authorization

## 📊 Room Status Guide

| Status | Color | Meaning |
|--------|-------|---------|
| **AVAILABLE** | 🟢 Green | Room is empty and ready |
| **OCCUPIED** | 🔵 Blue | Customer is trying on items |
| **CHECKING OUT** | 🟡 Amber | Customer is leaving, scanning items out |
| **ALERT** | 🔴 Red | Security issue detected (missing items) |

## 🔍 Product Tracking Explained

### Scan Status Indicators:
- ✅ **Scanned In** (Green checkmark) - Item entered the room
- ✅ **Scanned Out** (Green checkmark) - Item left the room
- ❌ **Not Scanned** (Red X) - Action hasn't happened
- ⚠️ **MISSING** (Red badge) - Item scanned out during alert = potential theft

### Example: Room 5 (Alert Room)
- **Sports Jacket**: ✅ In, ❌ Out (Present in room)
- **Running Shoes**: ✅ In, ❌ Out (Present in room)
- **Athletic Pants**: ✅ In, ❌ Out (Present in room)
- **T-Shirt**: ✅ In, ✅ Out, ⚠️ **MISSING** (Left without authorization!)

## 🎨 UI Features

### Header
- Displays your **username** and **role**
- **Refresh** button to reload data
- **Logout** button to return to login

### Dashboard Stats
- **Total Rooms**: 6
- **Available**: Real-time count
- **Occupied**: Real-time count  
- **Active Alerts**: Unresolved security issues

### Color Coding
- 🟢 **Green** = Good (available, completed)
- 🔵 **Blue** = In progress (occupied)
- 🟡 **Amber** = Warning (checking out, pending)
- 🔴 **Red** = Alert (security issue, critical)

## 🔐 Security Features

### Unlock Request System
- **Salesperson** cannot unlock directly (security)
- **Manager** must approve all unlock requests
- **Audit trail** shows who requested, when, and why
- **Real-time notifications** via toast messages

### Alert System
- Automatic detection of missing items
- Severity levels: High, Medium, Low
- Resolution tracking
- Time-stamped for audit purposes

## 💡 Tips

1. **Mock Data**: All data is currently in-memory. Refreshing the page resets everything.
2. **Multiple Roles**: Test both Salesperson and Manager views by logging out and back in.
3. **Real-time**: Changes appear immediately (unlock approvals, alert resolutions).
4. **Mobile Ready**: The UI is responsive and works on tablets/phones.

## 🆘 Common Questions

**Q: Why can't I unlock Room 5 as a salesperson?**
A: Security feature! Salespersons can only REQUEST unlock. Managers must approve.

**Q: Where did my data go after refresh?**
A: Currently using mock data. Once backend is integrated, data will persist.

**Q: How do I see missing items?**
A: Click "View Details" on Room 5 (Alert status). The T-Shirt shows as MISSING.

**Q: Can I use real credentials?**
A: Not yet. Demo mode accepts any username/password. Backend integration will add real auth.

---

**Enjoy testing the Smart Fitting Room System!** 🎉

For technical details and backend integration plans, see `IMPLEMENTATION_NOTES.md`
