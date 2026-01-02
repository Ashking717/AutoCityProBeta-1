# 🚗 Auto City Accounting Pro - Desktop Application

Professional Accounting, Inventory & POS Software built with Electron

## 📁 Project Structure

```
autocity-accounting-pro/
├── main.js              # Electron main process
├── preload.js           # Preload script for IPC
├── index.html           # Main HTML file
├── app.js               # Frontend JavaScript
├── package.json         # NPM configuration
├── assets/              # Icons and images
│   ├── icon.png
│   ├── icon.ico (Windows)
│   └── icon.icns (Mac)
└── README.md
```

## 🚀 Installation & Setup

### 1. Install Node.js
Download and install Node.js from [nodejs.org](https://nodejs.org/) (v18 or higher)

### 2. Initialize Project

```bash
# Create project directory
mkdir autocity-accounting-pro
cd autocity-accounting-pro

# Copy all files (main.js, preload.js, index.html, app.js, package.json)

# Install dependencies
npm install
```

### 3. Install Python (Required for sqlite3)

**Windows:**
- Download Python from [python.org](https://www.python.org/downloads/)
- Install with "Add to PATH" option checked

**Mac:**
```bash
brew install python3
```

**Linux:**
```bash
sudo apt-get install python3 python3-pip
```

### 4. Rebuild sqlite3 for Electron

```bash
npm install --save sqlite3
npm rebuild sqlite3 --runtime=electron --target=28.0.0 --dist-url=https://electronjs.org/headers
```

## 🎯 Running the Application

### Development Mode
```bash
npm start
# or
npm run dev
```

### Build Executable

**Windows .exe:**
```bash
npm run build:win
```

**macOS .dmg:**
```bash
npm run build:mac
```

**Linux .AppImage:**
```bash
npm run build:linux
```

Built files will be in the `dist/` folder.

## 📊 Features

### ✅ Core Features
- 📘 **Ledger Management** - Create and manage accounts
- 🧾 **Voucher Entry** - Record transactions
- 📦 **Stock Management** - Inventory tracking
- 🛒 **Sales/POS** - Point of sale system
- 📊 **Dashboard** - Real-time statistics
- 🖨️ **Invoice Printing** - Professional invoices
- 💾 **Backup/Restore** - Database management

### ⚡ Advanced Features
- 🔍 Search and filter across all modules
- 📉 Low stock alerts
- 🎨 Modern UI with gradient themes
- ⌨️ Keyboard shortcuts (F1-F5, Ctrl+S)
- 💪 Offline-first (no internet required)
- 🔐 Local SQLite database
- 📱 Responsive design

## ⌨️ Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| F1 | Open Dashboard |
| F2 | Ledger Management |
| F3 | Voucher Entry |
| F4 | Stock Management |
| F5 | Sales/POS |
| Ctrl+S | Complete Sale |
| ESC | Close Modals |

## 💾 Database Location

The SQLite database is stored in:

**Windows:**
```
C:\Users\{Username}\AppData\Roaming\autocity-accounting-pro\autocity.db
```

**macOS:**
```
~/Library/Application Support/autocity-accounting-pro/autocity.db
```

**Linux:**
```
~/.config/autocity-accounting-pro/autocity.db
```

## 🔧 Troubleshooting

### sqlite3 Error
If you get sqlite3 errors:
```bash
npm install --save-dev electron-rebuild
npx electron-rebuild
```

### Windows Build Error
Install windows-build-tools:
```bash
npm install --global windows-build-tools
```

### Cannot Find Module Error
Reinstall dependencies:
```bash
rm -rf node_modules
npm install
```

## 📦 Distribution

### Creating Installer (Windows)

The NSIS installer will be created in `dist/` folder with:
- Desktop shortcut
- Start menu entry
- Uninstaller
- Custom installation directory option

### App Signing (Production)

For production apps, code signing is recommended:

**Windows:**
```json
"win": {
  "certificateFile": "path/to/cert.pfx",
  "certificatePassword": "password"
}
```

**macOS:**
```json
"mac": {
  "identity": "Developer ID Application: Your Name"
}
```

## 🎨 Customization

### Change App Icon
Replace files in `assets/` folder:
- `icon.png` (512x512 for Linux)
- `icon.ico` (for Windows)
- `icon.icns` (for macOS)

### Change Theme Colors
Edit the CSS in `index.html`:
```css
background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
```

## 📝 License

MIT License - Free to use and modify

## 🤝 Support

For issues and questions:
1. Check the Troubleshooting section
2. Verify Node.js and Python are installed
3. Ensure all dependencies are installed correctly

## 🔄 Updates

To update the app:
1. Modify version in `package.json`
2. Build new executable
3. Distribute to users

---

**Built with ❤️ for Auto City**