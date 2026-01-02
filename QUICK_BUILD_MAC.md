# 🚀 Quick Build for macOS DMG

## Super Simple Method

### 1. Open Terminal in project folder
```bash
cd /path/to/AutoCityApp_Complete
```

### 2. Run the build script
```bash
./build-mac.sh
```

**That's it!** The script will:
- Install dependencies
- Build the DMG
- Show you where the file is

---

## Manual Method (3 Commands)

```bash
# 1. Install dependencies
npm install

# 2. Build DMG
npm run dist:mac

# 3. Find your DMG
ls -lh dist/*.dmg
```

---

## What You'll Get

After successful build:
```
dist/Auto City Accounting Pro-1.0.0-universal.dmg
```

**Universal DMG** = Works on both Intel and Apple Silicon Macs!

---

## Build Time

- **First build**: ~5-10 minutes
- **Next builds**: ~2-5 minutes

---

## Testing Your Build

```bash
# Open the DMG
open dist/*.dmg

# Or open the app directly
open dist/mac/Auto\ City\ Accounting\ Pro.app
```

---

## Troubleshooting

### Build fails?

**Quick fix:**
```bash
rm -rf node_modules package-lock.json
npm install
npm run dist:mac
```

**Still failing?**
See `BUILD_MAC_DMG.md` for detailed troubleshooting.

---

## File Size

Expect: **150-200 MB** for universal DMG

---

## Distribution

1. Build succeeds ✅
2. Share the DMG file 📦
3. Users drag to Applications 🖱️
4. Ready to use! 🎉

---

## Need Help?

Read the full guide: `BUILD_MAC_DMG.md`
