#!/bin/bash

# Auto City Accounting Pro - macOS Build Script
# This script builds a DMG installer for macOS

echo "🚀 Auto City Accounting Pro - macOS Build Script"
echo "=================================================="
echo ""

# Check if Node.js is installed
if ! command -v node &> /dev/null
then
    echo "❌ Node.js is not installed!"
    echo "Please install Node.js from https://nodejs.org"
    exit 1
fi

echo "✅ Node.js version: $(node --version)"
echo "✅ npm version: $(npm --version)"
echo ""

# Check if in correct directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: package.json not found!"
    echo "Please run this script from the project root directory"
    exit 1
fi

echo "📦 Installing dependencies..."
npm install

if [ $? -ne 0 ]; then
    echo "❌ Failed to install dependencies"
    exit 1
fi

echo ""
echo "🏗️  Building macOS DMG..."
echo "This may take 5-10 minutes on first build..."
echo ""

# Build for macOS
npm run dist:mac

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Build successful!"
    echo ""
    echo "📦 Your DMG file is ready:"
    ls -lh dist/*.dmg 2>/dev/null || echo "No DMG found in dist/"
    echo ""
    echo "📂 Location: $(pwd)/dist/"
    echo ""
    echo "🎉 You can now distribute the DMG file!"
    echo ""
    echo "To test the build:"
    echo "  open dist/*.dmg"
    echo ""
else
    echo ""
    echo "❌ Build failed!"
    echo ""
    echo "Common solutions:"
    echo "1. Remove node_modules and try again:"
    echo "   rm -rf node_modules package-lock.json"
    echo "   npm install"
    echo "   npm run dist:mac"
    echo ""
    echo "2. Rebuild native modules:"
    echo "   npm rebuild better-sqlite3 --build-from-source"
    echo ""
    echo "3. Check the error messages above for details"
    echo ""
    exit 1
fi
