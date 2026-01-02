@echo off
echo ========================================
echo Auto City Accounting Pro - Database Reset
echo ========================================
echo.
echo This will delete your database and create a fresh one.
echo ALL YOUR DATA WILL BE LOST!
echo.
echo Press Ctrl+C to cancel, or
pause

set APPDATA_DIR=%APPDATA%\AutoCityAccountingPro

echo.
echo Looking for database at: %APPDATA_DIR%
echo.

if exist "%APPDATA_DIR%\tally.db" (
    echo Found database files!
    del /Q "%APPDATA_DIR%\tally.db" 2>nul
    del /Q "%APPDATA_DIR%\tally.db-shm" 2>nul
    del /Q "%APPDATA_DIR%\tally.db-wal" 2>nul
    del /Q "%APPDATA_DIR%\.initialized" 2>nul
    echo.
    echo ========================================
    echo    Database deleted successfully!
    echo ========================================
) else (
    echo Database file not found at this location.
    echo.
    echo Expected location: %APPDATA_DIR%
    echo.
    echo The database will be created when you next start the app.
)

echo.
echo ========================================
echo Now restart the Auto City application.
echo ========================================
echo.
echo Default login credentials:
echo   Username: admin
echo   Password: admin123
echo.
echo ========================================
pause