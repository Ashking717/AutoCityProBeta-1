# 🔧 Troubleshooting Common Issues

## Issue 1: Dashboard Shows Data When Empty

### Problem:
Dashboard displays sales data (₹1,000, etc.) even though you haven't entered any sales.

### Cause:
The database file (`backend/tally.db`) contains test/sample data from development.

### Solution:

**Option 1: Quick Fix - Delete and Restart**
```bash
# Delete the database
rm backend/tally.db

# Restart the app
npm start
```
The app will create a fresh, empty database automatically.

**Option 2: Use the Cleanup Script**
```bash
# Run the cleanup script (creates backup first)
./cleanup-database.sh

# Then restart
npm start
```

**Option 3: Manual Cleanup (Keep Structure)**
```bash
# Open Node console
node

# Run this code:
const Database = require('better-sqlite3');
const db = new Database('./backend/tally.db');

// Clear all data but keep structure
db.exec('DELETE FROM sales');
db.exec('DELETE FROM sale_items');
db.exec('DELETE FROM purchases');
db.exec('DELETE FROM purchase_items');
db.exec('DELETE FROM vouchers');
db.exec('DELETE FROM stock_transactions');
db.exec('DELETE FROM customers');

console.log('✅ Data cleared!');
db.close();
process.exit();
```

### Verify the Fix:
1. Restart the app
2. Check Dashboard - should show:
   - Total Ledgers: 0 (or only default ones)
   - Stock Items: 0
   - Sales (30 days): ₹0
   - Low Stock: 0

---

## Issue 2: Car Makes/Models Show "Error loading makes"

### Problem:
When adding stock items, the vehicle compatibility dropdown shows "Error loading makes" instead of loading car manufacturers.

### Cause:
The car makes/models haven't been populated in the database yet.

### Solutions:

**Solution 1: Wait for First Load**
The app automatically populates car data on first run, but it takes ~5 seconds.
1. Restart the app
2. Wait 5-10 seconds
3. Go to Stock section
4. The makes should load

**Solution 2: Check Backend Logs**
```bash
npm start
```
Look for:
```
✅ Car database already populated (50 makes)
```

If you see:
```
📥 Populating car database with makes and models...
✅ Successfully populated X makes and Y models
```
Wait for this to complete, then refresh the page.

**Solution 3: Force Repopulate**
```bash
# Delete car data
rm backend/tally.db

# Restart (will repopulate)
npm start
```

**Solution 4: Check Network/API**
Open browser console (F12) and check for errors:
```javascript
// Should see in console:
🚗 Loading vehicle makes...
✅ Loaded makes: 50
✅ Populated dropdown with 50 makes
```

If you see network errors:
- Check that backend is running on port 5001
- Check for CORS errors
- Try restarting both frontend and backend

### Manual Fix - Populate via Script:
```bash
# Run the import script
node import-car-data.js
```

This will populate:
- 50 car makes (Toyota, Honda, Ford, etc.)
- 1000+ models

### Verify the Fix:
1. Go to Stock Management
2. Scroll to "Vehicle Compatibility"
3. Click "Compatible Make(s)" dropdown
4. Should show 50+ makes (Toyota, Honda, etc.)
5. Select a make (e.g., Toyota)
6. "Compatible Model(s)" should populate with models (Camry, Corolla, etc.)

---

## Issue 3: Network Errors / API Not Responding

### Symptoms:
- "Failed to fetch" errors
- Console errors about localhost:5001
- Data not loading

### Solution:
```bash
# 1. Stop the app (Ctrl+C)

# 2. Check if port is in use
lsof -i :5001
# If something is using it:
kill -9 <PID>

# 3. Restart cleanly
npm start
```

### Verify:
```bash
# Backend should show:
✅ Auto City Accounting Server running on http://localhost:5001

# Test API:
curl http://localhost:5001/api/dashboard/stats
```

---

## Issue 4: Better-sqlite3 Build Error

### Error:
```
Error: Cannot find module 'better-sqlite3'
```

### Solution:
```bash
# Rebuild native module
npm rebuild better-sqlite3 --build-from-source

# Or fresh install
rm -rf node_modules package-lock.json
npm install
```

---

## Issue 5: Database Locked

### Error:
```
SQLITE_BUSY: database is locked
```

### Solution:
```bash
# Stop all instances
pkill -f "electron"
pkill -f "node.*server.js"

# Delete lock files
rm backend/tally.db-shm
rm backend/tally.db-wal

# Restart
npm start
```

---

## Quick Diagnostics

### Check Everything is Working:
```bash
# 1. Backend running?
curl http://localhost:5001/api/dashboard/stats

# 2. Database exists?
ls -lh backend/tally.db

# 3. Car makes loaded?
curl http://localhost:5001/api/car-makes

# 4. Node modules installed?
ls node_modules | wc -l
# Should show 100+ packages
```

### Clean Slate (Nuclear Option):
```bash
# Remove everything
rm -rf node_modules package-lock.json dist backend/tally.db

# Fresh install
npm install

# Start clean
npm start
```

---

## Common Workflow Issues

### Creating First Stock Item:
1. Go to Stock Management (F4)
2. Fill in Item Name (required)
3. Select Category
4. Select Compatible Makes (Ctrl+Click for multiple)
5. Models will auto-populate
6. Fill in Opening Qty, Sale Rate
7. Click "Save Item"

### Making First Sale:
1. Go to Sales/POS (F5)
2. Select "Item Type: Goods"
3. Pick stock item from dropdown
4. Quantity and rate pre-fill
5. Click "Add to Cart"
6. Click "Complete Sale"

### Why No Data Shows:
- Dashboard shows ₹0 because no sales yet ✅ (this is correct!)
- Stock Items shows 0 because no items added ✅ (this is correct!)
- The test data (₹1,000) is from old database ❌ (should be deleted)

---

## Getting Help

### Check Logs:
**Backend logs (in terminal):**
```
✅ Database connected
✅ Database tables initialized
✅ Car makes/models API endpoints registered
✅ Auto City Accounting Server running
```

**Frontend logs (browser console F12):**
```
✅ Auto City Accounting - Frontend Loaded
🚗 Loading vehicle makes...
✅ Loaded makes: 50
```

### Still Having Issues?

1. Check all logs above
2. Make sure both frontend and backend are running
3. Try the cleanup script
4. Try fresh install
5. Check browser console for errors

---

## Prevention

### Best Practices:
1. **Always backup before major changes:**
   ```bash
   cp backend/tally.db backend/tally.db.backup
   ```

2. **Keep dependencies updated:**
   ```bash
   npm update
   ```

3. **Clear console before diagnosing:**
   ```bash
   clear  # or Ctrl+L
   npm start
   ```

4. **Use one terminal per process:**
   - Terminal 1: Backend (runs automatically with `npm start`)
   - Terminal 2: Available for commands/scripts

---

## Summary

| Issue | Quick Fix | Time |
|-------|-----------|------|
| Old data in dashboard | `rm backend/tally.db && npm start` | 1 min |
| Car makes not loading | Wait 10 seconds, refresh | 10 sec |
| Network errors | Stop (Ctrl+C), restart | 30 sec |
| Build errors | `npm rebuild better-sqlite3` | 2 min |
| Database locked | Stop all, remove .shm/.wal files | 1 min |

Most issues = Just restart! 🔄
