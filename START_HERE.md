# Auto City Accounting Pro - Build Package

Welcome! This package contains everything you need to build a Windows executable and installer for your Auto City Accounting Pro application.

## 📦 What's Included

```
AutoCityApp/
├── 🔧 Build Scripts (Double-click these!)
│   ├── build.bat                    ← Main build script (START HERE!)
│   ├── install-dependencies.bat     ← Install required packages
│   └── check-build-ready.bat        ← Check if ready to build
│
├── 📚 Documentation
│   ├── BUILD_README.md              ← Quick start guide
│   ├── BUILD_GUIDE.md               ← Detailed build instructions
│   ├── ICON_GUIDE.md                ← How to add app icon
│   └── LICENSE.txt                  ← App license
│
├── 📁 Application Files
│   ├── frontend/                    ← UI files
│   ├── backend/                     ← Server and database
│   ├── main.js                      ← Electron main process
│   ├── package.json                 ← App configuration
│   └── assets/                      ← Put icon.ico here!
│
└── 📖 Original Files
    └── README.md                    ← Original project readme
```

---

## 🚀 Quick Start (3 Steps)

### Step 1: Install Node.js (if not installed)
- Download from: https://nodejs.org/
- Choose the **LTS** version
- Install with default settings
- Restart your computer

### Step 2: Prepare Your Icon (Optional)
1. Create or find a square image (PNG/JPG)
2. Convert to `.ico` format at https://convertio.co/png-ico/
3. Name it `icon.ico`
4. Put it in the `assets` folder

### Step 3: Build the Application
1. **Double-click `build.bat`**
2. Choose option 1 (Windows Installer)
3. Wait 5-10 minutes
4. Find your installer in the `dist` folder!

---

## 📋 Detailed Instructions

### Option A: Automatic Build (Recommended)

**For first-time build:**
1. Double-click `install-dependencies.bat` (only needed once)
   - Wait for installation to complete (5-10 minutes)
   
2. Double-click `build.bat`
   - Choose what to build
   - Wait for completion
   
3. Your files will be in the `dist` folder:
   - `Auto City Accounting Pro-Setup-1.0.0.exe` (Installer)
   - `win-unpacked/` (Portable version)

### Option B: Manual Build (Advanced)

```bash
# 1. Open Command Prompt in this folder
# 2. Install dependencies
npm install

# 3. Build for Windows
npm run dist:win

# 4. Check the dist folder
```

---

## 🎯 What Gets Built

### Windows Installer (NSIS)
- **File**: `Auto City Accounting Pro-Setup-1.0.0.exe`
- **Size**: ~150-200 MB
- **Features**:
  - ✅ Desktop shortcut
  - ✅ Start menu entry
  - ✅ Uninstaller included
  - ✅ Custom install location
  - ✅ Runs after installation

### Portable Version
- **Location**: `dist/win-unpacked/`
- **Size**: ~300-400 MB
- **Use Case**:
  - No installation required
  - Run from USB drive
  - Testing purposes

---

## 🔍 Troubleshooting

### ❌ "Node.js is not installed"
**Fix**: Install Node.js from https://nodejs.org/

### ❌ "npm install failed"
**Try**:
1. Run as Administrator
2. Check internet connection
3. Temporarily disable antivirus

### ❌ "Icon not found"
**Fix**: 
- Build will still work!
- Add icon.ico to assets folder (see ICON_GUIDE.md)

### ❌ "Better-sqlite3 error"
**Fix**:
```bash
npm rebuild
npm run postinstall
```

### ❌ "Build takes too long"
**Normal**: First build takes 10-15 minutes
**Subsequent builds**: 3-5 minutes

### ❌ "Installer won't run"
**Fix**:
- Right-click → Properties → Unblock
- Run as Administrator
- Check Windows Defender settings

---

## 📊 Build Process Explained

1. **Dependencies Installation** (First time only)
   - Downloads Electron, Electron Builder, and all packages
   - ~500MB download
   - Takes 5-10 minutes

2. **Building Process**
   - Compiles application
   - Bundles all files
   - Creates installer
   - Takes 5-15 minutes

3. **Output**
   - Creates `dist` folder
   - Generates installer and/or portable version
   - Ready to distribute!

---

## 🎨 Customization

### Change App Version
Edit `package.json`:
```json
{
  "version": "2.0.0"  ← Change this
}
```

### Change App Name
Edit `package.json`:
```json
{
  "build": {
    "productName": "Your App Name"  ← Change this
  }
}
```

### Add/Remove Files
Edit `package.json` → `build` → `files` array

---

## 📤 Distribution

### For End Users (Customers)
Share: `Auto City Accounting Pro-Setup-1.0.0.exe`
- Professional installer
- Easy to use
- Recommended method

### For Portable Use
Zip the `win-unpacked` folder
- No installation needed
- Can run from anywhere
- Good for testing

### File Sharing Options
- Email (if under 25MB)
- Google Drive
- Dropbox
- WeTransfer
- Company server

---

## 📝 Important Notes

### File Sizes
- **Installer**: ~150-200 MB (normal for Electron)
- **Installed app**: ~300-400 MB
- **Why so large?**: Includes Node.js + Chromium runtime

### System Requirements
**For Building:**
- Windows 10/11
- Node.js 18+
- 2GB free disk space
- Internet connection (first time)

**For Running:**
- Windows 10/11
- 4GB RAM recommended
- 500MB free disk space

### Security
- Windows may warn about "Unknown Publisher"
- This is normal for unsigned apps
- Consider code signing for production

---

## 🆘 Need Help?

1. **Check Documentation**
   - `BUILD_README.md` - Quick start
   - `BUILD_GUIDE.md` - Detailed guide
   - `ICON_GUIDE.md` - Icon instructions

2. **Run Diagnostic**
   - Double-click `check-build-ready.bat`
   - See what's missing

3. **Common Resources**
   - Electron Builder: https://www.electron.build/
   - Node.js: https://nodejs.org/
   - Icon Converter: https://convertio.co/png-ico/

---

## ✅ Checklist

Before building, make sure you have:
- [ ] Node.js installed
- [ ] Internet connection (first time)
- [ ] 2GB+ free disk space
- [ ] App icon (optional but recommended)
- [ ] Antivirus disabled/configured (if issues)

---

## 🎉 Success!

After building, you should have:
- ✅ Windows installer (.exe)
- ✅ Portable version (folder)
- ✅ Ready to distribute!

**Next Steps:**
1. Test the installer on a clean machine
2. Get user feedback
3. Iterate and improve
4. Consider code signing for production

---

## 📞 Support

For build issues:
- Check the troubleshooting section above
- Review error messages carefully
- Try clean install (`install-dependencies.bat`)

For app functionality:
- See original `README.md`

---

**Version**: 1.0.0  
**Last Updated**: December 2024  
**Build System**: Electron Builder + NSIS

Good luck with your build! 🚀
