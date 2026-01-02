@echo off
echo ========================================
echo Build Preparation Check
echo ========================================
echo.

set "allGood=true"

:: Check Node.js
echo [1/5] Checking Node.js installation...
where node >nul 2>nul
if %errorlevel% equ 0 (
    echo ✓ Node.js is installed
    node --version
) else (
    echo ✗ Node.js is NOT installed
    echo   Download from: https://nodejs.org/
    set "allGood=false"
)
echo.

:: Check npm
echo [2/5] Checking npm...
where npm >nul 2>nul
if %errorlevel% equ 0 (
    echo ✓ npm is available
    npm --version
) else (
    echo ✗ npm is NOT available
    set "allGood=false"
)
echo.

:: Check dependencies
echo [3/5] Checking dependencies...
if exist "node_modules\" (
    echo ✓ Dependencies are installed
) else (
    echo ⚠ Dependencies are NOT installed
    echo   Run: npm install
    set "allGood=false"
)
echo.

:: Check assets folder
echo [4/5] Checking assets folder...
if exist "assets\" (
    echo ✓ Assets folder exists
    
    if exist "assets\icon.ico" (
        echo   ✓ icon.ico found
    ) else (
        echo   ⚠ icon.ico not found (optional)
        echo     Build will use default icon
    )
) else (
    echo ⚠ Assets folder does not exist
    echo   Creating assets folder...
    mkdir "assets"
    echo   ✓ Assets folder created
    echo   ⚠ Please add icon.ico to assets folder (optional)
)
echo.

:: Check LICENSE.txt
echo [5/5] Checking LICENSE.txt...
if exist "LICENSE.txt" (
    echo ✓ LICENSE.txt found
) else (
    echo ⚠ LICENSE.txt not found
    echo   A default MIT license is recommended for the installer
)
echo.

:: Summary
echo ========================================
echo Summary
echo ========================================
echo.

if "%allGood%"=="true" (
    echo ✓ Your project is ready to build!
    echo.
    echo Next step: Run build.bat to create the installer
) else (
    echo ⚠ Some requirements are missing (see above)
    echo.
    echo Please fix the issues marked with ✗ before building
)
echo.

echo Additional Information:
echo - Package name: %cd%
echo - Main file: main.js
echo.

if exist "package.json" (
    echo Package.json found. App details:
    findstr /C:"\"name\"" /C:"\"version\"" /C:"\"productName\"" package.json
)
echo.

:: Offer to create missing files
if not exist "LICENSE.txt" (
    echo Would you like to create a default LICENSE.txt? (Y/N)
    set /p createLicense=
    if /i "%createLicense%"=="Y" (
        echo Creating MIT License...
        (
            echo MIT License
            echo.
            echo Copyright (c) 2024 Auto City
            echo.
            echo Permission is hereby granted, free of charge, to any person obtaining a copy
            echo of this software and associated documentation files (the "Software"^), to deal
            echo in the Software without restriction, including without limitation the rights
            echo to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
            echo copies of the Software, and to permit persons to whom the Software is
            echo furnished to do so, subject to the following conditions:
            echo.
            echo The above copyright notice and this permission notice shall be included in all
            echo copies or substantial portions of the Software.
            echo.
            echo THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
            echo IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
            echo FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
            echo AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
            echo LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
            echo OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
            echo SOFTWARE.
        ) > LICENSE.txt
        echo ✓ LICENSE.txt created
    )
    echo.
)

echo Press any key to exit...
pause >nul
