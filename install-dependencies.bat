@echo off
echo ========================================
echo Installing Dependencies
echo ========================================
echo.
echo This will install all required packages for building
echo the Auto City Accounting Pro application.
echo.
echo This may take 5-10 minutes depending on your internet speed.
echo.
pause

:: Check if Node.js is installed
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo ERROR: Node.js is not installed!
    echo.
    echo Please install Node.js first:
    echo 1. Go to https://nodejs.org/
    echo 2. Download the LTS (Long Term Support) version
    echo 3. Run the installer
    echo 4. Restart this script
    echo.
    pause
    exit /b 1
)

echo Node.js found:
node --version
echo.

:: Clean install
echo Do you want to perform a clean install? (Y/N)
echo (This will delete node_modules and package-lock.json)
set /p cleanInstall=

if /i "%cleanInstall%"=="Y" (
    echo.
    echo Cleaning previous installation...
    if exist "node_modules\" (
        echo Removing node_modules...
        rmdir /s /q "node_modules"
    )
    if exist "package-lock.json" (
        echo Removing package-lock.json...
        del /q "package-lock.json"
    )
    echo Clean complete.
    echo.
)

:: Install dependencies
echo Starting installation...
echo.

call npm install

if %errorlevel% neq 0 (
    echo.
    echo ========================================
    echo INSTALLATION FAILED!
    echo ========================================
    echo.
    echo Possible causes:
    echo - No internet connection
    echo - npm registry is down
    echo - Antivirus blocking npm
    echo - Insufficient permissions
    echo.
    echo Try:
    echo 1. Check your internet connection
    echo 2. Run this script as Administrator
    echo 3. Temporarily disable antivirus
    echo.
    pause
    exit /b 1
)

echo.
echo ========================================
echo INSTALLATION SUCCESSFUL!
echo ========================================
echo.

:: Rebuild native modules for Electron
echo Rebuilding native modules for Electron...
call npm run postinstall

if %errorlevel% neq 0 (
    echo.
    echo Warning: Native module rebuild had issues
    echo The app might still work, but if you have problems,
    echo try running: npm rebuild
    echo.
)

echo.
echo All dependencies installed successfully!
echo.
echo Installed packages:
echo - electron ^(desktop framework^)
echo - electron-builder ^(packaging tool^)
echo - express ^(backend server^)
echo - better-sqlite3 ^(database^)
echo - and other dependencies...
echo.
echo Next step: Run build.bat to create your installer
echo.
pause
