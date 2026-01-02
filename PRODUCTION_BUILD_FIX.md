# 🔧 Production Build Fixes - Car Makes/Models Loading

## Issue Fixed
Car makes and models show "Error loading makes" in the built DMG, but work fine in development.

## Root Cause
In packaged Electron apps:
1. Files are bundled into an ASAR archive (read-only)
2. Some files need to be "unpacked" to be accessible
3. Database should be in user data directory (writable)
4. JSON files need correct path resolution

## What Was Fixed

### 1. Database Location (db.js)
**Before:** Database stored in app directory (read-only in DMG)
```javascript
const dbFile = path.join(__dirname, 'tally.db'); // ❌ Won't work in production
```

**After:** Database stored in user data directory (writable)
```javascript
if (process.env.USER_DATA_PATH && process.env.IS_PACKAGED === 'true') {
  // Production: ~/Library/Application Support/Auto City Accounting Pro/database/
  dbFile = path.join(process.env.USER_DATA_PATH, 'database', 'tally.db');
} else {
  // Development: ./backend/tally.db
  dbFile = path.join(__dirname, 'tally.db');
}
```

**Result:** Database is now created in:
- **macOS**: `~/Library/Application Support/Auto City Accounting Pro/database/tally.db`
- **Windows**: `%APPDATA%\Auto City Accounting Pro\database\tally.db`
- **Linux**: `~/.config/Auto City Accounting Pro/database/tally.db`

### 2. Car Data JSON Loading (server.js)
**Before:** Only checked one path
```javascript
const carDataPath = path.join(__dirname, 'car-makes-models.json');
```

**After:** Tries both packed and unpacked paths
```javascript
let carDataPath = path.join(__dirname, 'car-makes-models.json');

// In production, try unpacked path
if (!fs.existsSync(carDataPath)) {
  const unpackedPath = __dirname.replace('app.asar', 'app.asar.unpacked');
  carDataPath = path.join(unpackedPath, 'car-makes-models.json');
}
```

**Result:** Car data loads from app.asar.unpacked in production

### 3. Environment Variables (main.js)
**Added:**
```javascript
env: {
  USER_DATA_PATH: app.getPath('userData'),
  IS_PACKAGED: app.isPackaged ? 'true' : 'false'
}
```

**Result:** Backend knows where to store data and whether it's in production

## Testing the Fixed Build

### Step 1: Clean Build
```bash
# Remove old builds
rm -rf dist

# Remove old database (fresh start)
rm backend/tally.db

# Fresh install
npm install

# Build DMG
npm run dist:mac
```

### Step 2: Test the DMG
```bash
# Open the DMG
open dist/*.dmg

# Install the app
# Drag to Applications folder

# Open the app
open /Applications/Auto\ City\ Accounting\ Pro.app
```

### Step 3: Verify Car Makes/Models

1. **Open the app**
2. **Wait 10 seconds** (car data loads on first run)
3. **Go to Stock Management** (F4)
4. **Scroll to "Vehicle Compatibility"**
5. **Click "Compatible Make(s)" dropdown**
6. **Should see:** Toyota, Honda, Ford, BMW, etc. (50 makes)

### Step 4: Check Database Location

The database is now in a user-writable location:

```bash
# macOS - Check if database was created
ls -la ~/Library/Application\ Support/Auto\ City\ Accounting\ Pro/database/

# Should show:
# tally.db
# tally.db-shm
# tally.db-wal
```

## Debugging Production Issues

### Enable Console Logs in Built App

**Method 1: Open from Terminal**
```bash
# macOS
/Applications/Auto\ City\ Accounting\ Pro.app/Contents/MacOS/Auto\ City\ Accounting\ Pro

# You'll see all console output
```

**Method 2: Check Log Files**
```bash
# macOS - Application logs
cat ~/Library/Logs/Auto\ City\ Accounting\ Pro/log.log
```

**Method 3: Enable DevTools**
Edit `main.js` before building:
```javascript
// Uncomment this line (around line 39)
mainWindow.webContents.openDevTools();
```

### Common Production Issues & Solutions

#### Issue 1: "car-makes-models.json not found"

**Check:**
```bash
# The file should be in app.asar.unpacked
ls /Applications/Auto\ City\ Accounting\ Pro.app/Contents/Resources/app.asar.unpacked/backend/

# Should show:
# car-makes-models.json
# server.js
# db.js
```

**Fix:** Rebuild with correct asarUnpack configuration (already fixed in package.json)

#### Issue 2: "Cannot write to database"

**Symptom:** Database errors, can't save data

**Cause:** App trying to write to read-only app directory

**Check:**
```bash
# Database should NOT be here (read-only):
ls /Applications/Auto\ City\ Accounting\ Pro.app/Contents/Resources/

# Database SHOULD be here (writable):
ls ~/Library/Application\ Support/Auto\ City\ Accounting\ Pro/database/
```

**Fix:** Already fixed in db.js - database uses USER_DATA_PATH

#### Issue 3: Car data doesn't load on first run

**Solution:** 
1. Quit the app completely
2. Delete the database:
   ```bash
   rm -rf ~/Library/Application\ Support/Auto\ City\ Accounting\ Pro/
   ```
3. Restart the app
4. Wait 10-15 seconds for car data to populate

## Build Configuration Summary

### package.json - Key Settings:
```json
{
  "build": {
    "asar": true,
    "asarUnpack": [
      "backend/**/*",    // ← Backend needs to be unpacked
      "data/**/*"
    ],
    "files": [
      "backend/**/*",
      "!backend/*.db",   // ← Don't include dev database
      "!backend/*.db-shm",
      "!backend/*.db-wal"
    ]
  }
}
```

### What Gets Unpacked:
```
app.asar.unpacked/
├── backend/
│   ├── server.js
│   ├── db.js
│   ├── car-makes-models.json  ✅ Accessible
│   └── models/
└── data/
```

### What Gets Packed (ASAR):
```
app.asar/
├── main.js
├── preload.js
└── frontend/
    ├── index.html
    ├── app.js
    └── style.css
```

## Production File Locations

### In the Built App:
```
/Applications/Auto City Accounting Pro.app/
├── Contents/
│   ├── MacOS/
│   │   └── Auto City Accounting Pro  (executable)
│   └── Resources/
│       ├── app.asar  (packed files)
│       └── app.asar.unpacked/
│           └── backend/
│               ├── server.js
│               ├── db.js
│               └── car-makes-models.json  ← Here!
```

### In User Data:
```
~/Library/Application Support/Auto City Accounting Pro/
└── database/
    ├── tally.db      ← Database here!
    ├── tally.db-shm
    └── tally.db-wal
```

## Testing Checklist

After building the DMG, test:

- [ ] DMG opens and installs correctly
- [ ] App launches without errors
- [ ] Dashboard loads (may show ₹0 - that's correct!)
- [ ] Go to Stock Management
- [ ] Car makes dropdown populates (wait 10 sec)
- [ ] Select a make (e.g., Toyota)
- [ ] Models dropdown populates (Camry, Corolla, etc.)
- [ ] Can add a stock item
- [ ] Can make a sale
- [ ] Database persists after app restart
- [ ] Quit and reopen - data is still there

## Complete Build & Test Workflow

```bash
# 1. Clean everything
rm -rf dist node_modules backend/tally.db

# 2. Fresh install
npm install

# 3. Test in development first
npm start
# Verify car makes/models work
# Ctrl+C to stop

# 4. Build DMG
npm run dist:mac

# 5. Test the DMG
open dist/*.dmg

# 6. Install to Applications

# 7. Test from Terminal (see logs)
/Applications/Auto\ City\ Accounting\ Pro.app/Contents/MacOS/Auto\ City\ Accounting\ Pro

# 8. Verify database location
ls -la ~/Library/Application\ Support/Auto\ City\ Accounting\ Pro/database/

# 9. Test all features
# - Stock management
# - Sales/POS
# - Reports
# - Vouchers
```

## Success Indicators

✅ **App opens without errors**
✅ **Backend server starts** (see logs)
✅ **Database created** in user data directory
✅ **Car data populates** (50 makes, 1000+ models)
✅ **Dropdown works** in Stock Management
✅ **Can add items** with vehicle compatibility
✅ **Data persists** after restart

## If It Still Doesn't Work

1. **Check Console Logs:**
   - Run app from terminal
   - Look for "car-makes-models.json not found" errors
   - Check database path in logs

2. **Verify Files Are Unpacked:**
   ```bash
   ls -la /Applications/Auto\ City\ Accounting\ Pro.app/Contents/Resources/app.asar.unpacked/backend/
   ```

3. **Clean User Data:**
   ```bash
   rm -rf ~/Library/Application\ Support/Auto\ City\ Accounting\ Pro/
   ```

4. **Rebuild:**
   ```bash
   rm -rf dist
   npm run dist:mac
   ```

5. **Test in Development First:**
   ```bash
   npm start
   # If it works here but not in production, it's a packaging issue
   ```

## Summary

The fixes ensure:
1. ✅ Database is in writable location (user data)
2. ✅ Car data JSON is accessible (unpacked)
3. ✅ Paths work in both dev and production
4. ✅ Backend knows its environment
5. ✅ First-run import works correctly

Your DMG should now work perfectly! 🎉
