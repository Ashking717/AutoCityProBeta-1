# 🍎 Building AutoCity Accounting Pro for macOS

## Prerequisites

### 1. Install Xcode Command Line Tools
```bash
xcode-select --install
```

### 2. Install Node.js (if not already installed)
```bash
# Using Homebrew
brew install node

# Or download from https://nodejs.org
```

### 3. Verify Installation
```bash
node --version  # Should show v18 or higher
npm --version   # Should show v9 or higher
```

## Building the DMG

### Step 1: Navigate to Project Directory
```bash
cd /path/to/AutoCityApp_Complete
```

### Step 2: Install Dependencies
```bash
npm install
```

This will install:
- Electron
- electron-builder
- better-sqlite3 (native module)
- Express and other dependencies

### Step 3: Build for macOS
```bash
npm run dist:mac
```

**This will create:**
- Universal DMG (works on both Intel and Apple Silicon Macs)
- Located in: `dist/Auto City Accounting Pro-1.0.0-universal.dmg`

### Alternative: Build for Specific Architecture

**For Intel Macs only:**
```bash
electron-builder --mac --x64
```

**For Apple Silicon (M1/M2/M3) only:**
```bash
electron-builder --mac --arm64
```

**For Universal (both Intel and ARM):**
```bash
electron-builder --mac --universal
```

## Build Output

After successful build, you'll find in the `dist/` folder:

```
dist/
├── Auto City Accounting Pro-1.0.0-universal.dmg    # Universal installer (Intel + ARM)
├── Auto City Accounting Pro-1.0.0-arm64.dmg        # Apple Silicon only
├── Auto City Accounting Pro-1.0.0-x64.dmg          # Intel only
└── mac/
    └── Auto City Accounting Pro.app                 # The application bundle
```

## File Sizes (Approximate)

- **Universal DMG**: ~150-200 MB
- **Intel DMG**: ~80-100 MB  
- **ARM DMG**: ~80-100 MB

## Installation

1. Open the DMG file
2. Drag "Auto City Accounting Pro" to Applications folder
3. Open from Applications
4. If you see "App can't be opened" warning:
   - Go to System Preferences → Security & Privacy
   - Click "Open Anyway"

## Troubleshooting

### Issue 1: "better-sqlite3" Build Error

**Error:**
```
gyp ERR! stack Error: Could not find any Visual Studio installation
```

**Solution:**
```bash
# Rebuild native modules for macOS
npm rebuild better-sqlite3 --build-from-source

# Or clean install
rm -rf node_modules package-lock.json
npm install
```

### Issue 2: Code Signing Error

**Error:**
```
⨯ Command failed: codesign --sign...
```

**Solution:**
The app will still build but won't be signed. To sign:

1. **Get Apple Developer Certificate:**
   - Join Apple Developer Program ($99/year)
   - Create Developer ID certificate

2. **Sign the app:**
   ```bash
   export CSC_NAME="Developer ID Application: Your Name"
   npm run dist:mac
   ```

**For testing/personal use:** Unsigned builds work fine!

### Issue 3: Notarization Error

**Error:**
```
⨯ Failed to notarize app
```

**Solution:**
For distribution on Mac App Store, you need notarization. For personal/business use, skip it:

```bash
# Build without notarization
export CSC_IDENTITY_AUTO_DISCOVERY=false
npm run dist:mac
```

### Issue 4: Permission Denied

**Error:**
```
EACCES: permission denied
```

**Solution:**
```bash
sudo chown -R $USER:$USER node_modules
chmod -R 755 node_modules
```

### Issue 5: Out of Memory

**Error:**
```
FATAL ERROR: Ineffective mark-compacts near heap limit
```

**Solution:**
```bash
export NODE_OPTIONS="--max-old-space-size=4096"
npm run dist:mac
```

## Quick Build Commands

### Clean Build (Recommended)
```bash
# Remove old builds
rm -rf dist node_modules package-lock.json

# Fresh install
npm install

# Build DMG
npm run dist:mac
```

### Fast Rebuild (After Code Changes)
```bash
# Just rebuild
npm run dist:mac
```

### Test Build (No DMG, faster)
```bash
# Build app bundle only (no DMG creation)
npm run pack
```

## Build Configuration

The build is configured in `package.json`:

```json
{
  "build": {
    "mac": {
      "target": {
        "target": "dmg",
        "arch": ["x64", "arm64"]  // Universal build
      },
      "category": "public.app-category.business"
    },
    "dmg": {
      "contents": [
        { "x": 130, "y": 220 },
        { "x": 410, "y": 220, "type": "link", "path": "/Applications" }
      ]
    }
  }
}
```

## Customizing the Build

### Change App Icon
Replace `assets/icon.icns` with your icon:
```bash
# Convert PNG to ICNS (requires ImageMagick)
brew install imagemagick
convert icon.png -resize 512x512 icon.icns
```

### Change App Name
Edit `package.json`:
```json
{
  "build": {
    "productName": "Your App Name"
  }
}
```

### Change Version
Edit `package.json`:
```json
{
  "version": "1.0.1"
}
```

## Testing the Built App

### 1. Test the .app Bundle
```bash
open dist/mac/Auto\ City\ Accounting\ Pro.app
```

### 2. Test the DMG
```bash
open dist/Auto\ City\ Accounting\ Pro-1.0.0-universal.dmg
```

### 3. Check App Size
```bash
du -sh dist/mac/Auto\ City\ Accounting\ Pro.app
```

### 4. Check Architectures
```bash
file dist/mac/Auto\ City\ Accounting\ Pro.app/Contents/MacOS/Auto\ City\ Accounting\ Pro
```

Should show:
```
Mach-O universal binary with 2 architectures: [x86_64:...] [arm64:...]
```

## Distribution

### For Internal Use
- Share the DMG file directly
- Users can install by dragging to Applications

### For Public Distribution
You'll need:
1. **Code Signing** - Apple Developer Certificate
2. **Notarization** - Apple verification
3. **Gatekeeper** - Allows installation

### For Mac App Store
Additional requirements:
- Mac App Store certificate
- Sandboxing enabled
- App Store Review

## Performance Tips

### Faster Builds
```bash
# Skip compression (faster but larger file)
export ELECTRON_BUILDER_COMPRESSION_LEVEL=0
npm run dist:mac
```

### Smaller Builds
```bash
# Maximum compression (slower but smaller)
export ELECTRON_BUILDER_COMPRESSION_LEVEL=9
npm run dist:mac
```

## Build Time Estimates

On a modern Mac:
- **First build**: 5-10 minutes (downloading Electron, building native modules)
- **Subsequent builds**: 2-5 minutes
- **Code-only changes**: 1-2 minutes

## Final Checklist

Before distributing:

- [ ] Test on Intel Mac
- [ ] Test on Apple Silicon Mac
- [ ] Test on latest macOS version
- [ ] Verify all features work
- [ ] Check database creation
- [ ] Test reports generation
- [ ] Verify stock management
- [ ] Test sales/POS
- [ ] Check print functionality
- [ ] Verify backup/restore

## Success!

You should now have:
```
✅ Auto City Accounting Pro-1.0.0-universal.dmg
```

Users can:
1. Download the DMG
2. Open it
3. Drag app to Applications
4. Launch and use immediately!

## Support

If you encounter issues:
1. Check this guide's troubleshooting section
2. Review electron-builder logs in `dist/builder-debug.yml`
3. Check console for specific errors

Happy Building! 🚀
