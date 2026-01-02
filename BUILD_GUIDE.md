# Auto City Accounting Pro - Build Guide

This guide will help you build an executable (.exe) and installer package for Windows.

## Prerequisites

1. **Node.js** (v18 or higher)
   - Download from: https://nodejs.org/
   - Verify installation: `node --version` and `npm --version`

2. **Git** (optional, for version control)
   - Download from: https://git-scm.com/

## Step-by-Step Build Instructions

### Step 1: Install Dependencies

Open a terminal/command prompt in the AutoCityApp folder and run:

```bash
npm install
```

This will install:
- Electron
- Electron Builder
- All application dependencies

### Step 2: Create Required Assets

Before building, ensure you have the following assets in the `assets` folder:

- `assets/icon.ico` - Windows icon (256x256 or 512x512 recommended)
- `LICENSE.txt` - License file for the installer

If you don't have these files, the build will use defaults or skip them.

### Step 3: Build the Application

#### Option A: Build Installer Only (Recommended)
```bash
npm run dist:win
```

This creates:
- `dist/Auto City Accounting Pro-Setup-1.0.0.exe` - NSIS installer

#### Option B: Build Portable + Installer
```bash
npm run dist
```

This creates:
- NSIS installer
- Unpacked application files

#### Option C: Build for Testing (No Installer)
```bash
npm run pack
```

This creates an unpacked directory for testing without creating an installer.

### Step 4: Find Your Built Files

After building, look in the `dist` folder:

```
dist/
├── Auto City Accounting Pro-Setup-1.0.0.exe  (Installer)
├── win-unpacked/                              (Portable version)
│   └── Auto City Accounting Pro.exe
└── builder-effective-config.yaml              (Build configuration)
```

## Build Configuration Details

The build is configured in `package.json` under the `build` section:

- **App ID**: com.autocity.accounting
- **Product Name**: Auto City Accounting Pro
- **Version**: 1.0.0
- **Installer Type**: NSIS (Windows Installer)
- **Target Architecture**: x64 (64-bit)

### Installer Features:
- ✅ Desktop shortcut creation
- ✅ Start menu shortcut
- ✅ Custom installation directory option
- ✅ Uninstaller included
- ✅ Run after installation option

## Customization Options

### Change App Version

Edit `package.json`:
```json
{
  "version": "1.0.0"  // Change this
}
```

### Change App Name

Edit `package.json`:
```json
{
  "build": {
    "productName": "Auto City Accounting Pro"  // Change this
  }
}
```

### Add/Remove Files from Build

Edit the `files` array in `package.json`:
```json
{
  "build": {
    "files": [
      "main.js",
      "preload.js",
      "frontend/**/*",
      // Add more file patterns here
    ]
  }
}
```

## Troubleshooting

### Problem: "electron-builder not found"
**Solution**: Run `npm install` first

### Problem: Build fails with "icon.ico not found"
**Solution**: 
- Create an `assets` folder
- Add a `icon.ico` file (use an online converter if needed)
- Or remove the icon reference from package.json temporarily

### Problem: "better-sqlite3" compilation errors
**Solution**: 
```bash
npm install --save-dev electron-rebuild
npm run postinstall
```

### Problem: Large file size
**Solution**: 
- The app will be 100-200MB due to Electron and Node.js runtime
- This is normal for Electron apps

### Problem: Installer doesn't run after building
**Solution**:
- Check Windows security settings
- Right-click installer → Properties → Unblock
- Try running as administrator

## Additional Build Scripts

### Build 32-bit Version
```bash
npm run dist:win32
```

### Build for macOS (requires macOS)
```bash
npm run dist:mac
```

### Build for Linux
```bash
npm run dist:linux
```

## Distribution

Once built, you can distribute:

1. **Installer** (`Auto City Accounting Pro-Setup-1.0.0.exe`)
   - Users run this to install the app
   - Creates shortcuts automatically
   - Recommended for end users

2. **Portable Version** (`win-unpacked` folder)
   - Can be zipped and run without installation
   - Useful for USB drives or testing
   - No installation required

## Code Signing (Optional but Recommended)

For production releases, you should sign your executable:

1. Get a code signing certificate
2. Add to `package.json`:
```json
{
  "build": {
    "win": {
      "certificateFile": "path/to/cert.pfx",
      "certificatePassword": "password"
    }
  }
}
```

## Performance Tips

1. **Faster Builds**: Use `--dir` flag for testing
2. **Smaller Size**: Enable compression in electron-builder
3. **Multi-core**: electron-builder uses all CPU cores by default

## Questions?

- Check electron-builder docs: https://www.electron.build/
- Electron docs: https://www.electronjs.org/docs

## Quick Reference

```bash
# Install dependencies
npm install

# Test app before building
npm start

# Build installer
npm run dist:win

# Output location
# dist/Auto City Accounting Pro-Setup-1.0.0.exe
```
