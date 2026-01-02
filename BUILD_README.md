# Quick Start - Building Auto City Accounting Pro

## For Windows Users (Easiest Method)

1. **Double-click `build.bat`** - This will automatically:
   - Check for Node.js
   - Install dependencies
   - Let you choose what to build
   - Create the installer and/or portable version

2. **Find your files** in the `dist` folder after building completes

## For Advanced Users

### Prerequisites
- Node.js 18+ installed
- 2GB+ free disk space
- Windows 10/11 (for Windows builds)

### Quick Commands

```bash
# 1. Install dependencies (first time only)
npm install

# 2. Build Windows installer
npm run dist:win

# 3. Find output in dist/ folder
```

## What Gets Built?

### Windows Installer (`Auto City Accounting Pro-Setup-1.0.0.exe`)
- Professional NSIS installer
- Creates desktop and start menu shortcuts
- Includes uninstaller
- ~150-200MB file size

### Portable Version (`dist/win-unpacked/`)
- No installation required
- Can run from USB drive
- Same functionality as installed version

## Files Included in Build

The build process packages:
- ✅ Main application (Electron)
- ✅ Frontend UI (HTML/CSS/JS)
- ✅ Backend server (Express.js)
- ✅ Database (SQLite)
- ✅ All dependencies

## Common Issues

### "Node.js not found"
→ Install Node.js from https://nodejs.org/

### "Build failed"
→ Try running as Administrator
→ Disable antivirus temporarily
→ Make sure you have enough disk space

### "Icon not found" warning
→ This is optional - build will still work
→ Add icon.ico to assets/ folder to fix

## Distribution

After building:

1. **For Customers**: Share the `.exe` installer
2. **For Testing**: Use the portable version (win-unpacked folder)
3. **File Sharing**: Upload to Google Drive, Dropbox, etc.

## Size Expectations

- Installer: ~150-200 MB (normal for Electron apps)
- Installed app: ~300-400 MB
- Portable version: ~300-400 MB (unpacked)

This size is due to bundled Node.js and Chromium runtime.

## Need Help?

See `BUILD_GUIDE.md` for detailed instructions and troubleshooting.

---

**Last Updated**: December 2024
**App Version**: 1.0.0
