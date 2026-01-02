@echo off
echo ========================================
echo Auto City Accounting Pro - Build Script
echo ========================================
echo.

:: Check if Node.js is installed
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo ERROR: Node.js is not installed!
    echo Please install Node.js from https://nodejs.org/
    pause
    exit /b 1
)

echo Node.js version:
node --version
echo.

:: Check if npm is available
where npm >nul 2>nul
if %errorlevel% neq 0 (
    echo ERROR: npm is not available!
    echo Please reinstall Node.js
    pause
    exit /b 1
)

echo npm version:
npm --version
echo.

:: Check if node_modules exists
if not exist "node_modules\" (
    echo Installing dependencies...
    echo This may take a few minutes...
    echo.
    call npm install
    if %errorlevel% neq 0 (
        echo ERROR: Failed to install dependencies!
        pause
        exit /b 1
    )
    echo.
    echo Dependencies installed successfully!
    echo.
) else (
    echo Dependencies already installed.
    echo.
)

:: Ask user what to build
echo What would you like to build?
echo.
echo 1. Windows Installer (Recommended) - Creates Setup.exe
echo 2. Portable Version - Creates unpacked folder
echo 3. Both Installer and Portable
echo.
set /p choice="Enter your choice (1, 2, or 3): "

echo.
echo Building application...
echo Please wait, this may take several minutes...
echo.

if "%choice%"=="1" (
    echo Building Windows Installer...
    call npm run dist:win
) else if "%choice%"=="2" (
    echo Building Portable Version...
    call npm run pack
) else if "%choice%"=="3" (
    echo Building Both Versions...
    call npm run dist:win
) else (
    echo Invalid choice! Building installer by default...
    call npm run dist:win
)

if %errorlevel% neq 0 (
    echo.
    echo ========================================
    echo BUILD FAILED!
    echo ========================================
    echo.
    echo Please check the error messages above.
    echo Common issues:
    echo - Missing icon files in assets folder
    echo - Antivirus blocking the build
    echo - Insufficient disk space
    echo.
    pause
    exit /b 1
)

echo.
echo ========================================
echo BUILD COMPLETED SUCCESSFULLY!
echo ========================================
echo.
echo Your files are located in the 'dist' folder:
echo.

if exist "dist\Auto City Accounting Pro-Setup-*.exe" (
    echo [INSTALLER]
    dir /b "dist\Auto City Accounting Pro-Setup-*.exe"
    echo.
)

if exist "dist\win-unpacked\" (
    echo [PORTABLE]
    echo dist\win-unpacked\Auto City Accounting Pro.exe
    echo.
)

echo To distribute your app:
echo - For end users: Share the Setup.exe installer
echo - For portable use: Zip the win-unpacked folder
echo.
echo Press any key to open the dist folder...
pause >nul

:: Open the dist folder
start "" "dist"

echo.
echo Done!
pause
