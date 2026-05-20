@echo off
REM CodeTexa Backend Payment Configuration Diagnostics
REM Run this batch file to check if everything is configured correctly

echo.
echo ======================================================
echo CodeTexa Backend Payment Configuration Diagnostics
echo ======================================================
echo.

REM Check if .env file exists
if exist ".env" (
    echo [OK] .env file found
) else (
    echo [ERROR] .env file NOT found in backend directory
    pause
    exit /b 1
)

REM Check Node packages
if exist "package.json" (
    findstr /M "razorpay" package.json >nul
    if errorlevel 1 (
        echo [ERROR] razorpay not in package.json
        echo Run: npm install razorpay
    ) else (
        echo [OK] razorpay is in package.json
        
        if exist "node_modules\razorpay" (
            echo [OK] razorpay is installed
        ) else (
            echo [WARNING] razorpay NOT installed
            echo Run: npm install razorpay
        )
    )
) else (
    echo [ERROR] package.json not found
)

echo.
echo ======================================================
echo Checking .env Configuration
echo ======================================================
echo.

REM PowerShell command to check .env
powershell -Command "
    $env_file = Get-Content '.env' -ErrorAction SilentlyContinue
    
    $lines = $env_file | Select-String 'RAZORPAY'
    
    $key_id = $env_file | Select-String 'RAZORPAY_KEY_ID'
    $key_secret = $env_file | Select-String 'RAZORPAY_KEY_SECRET'
    
    if ($key_id) {
        if ($key_id -match 'rzp_') {
            Write-Host '[OK] RAZORPAY_KEY_ID is configured with valid format'
        } else {
            Write-Host '[WARNING] RAZORPAY_KEY_ID might be placeholder'
        }
    } else {
        Write-Host '[ERROR] RAZORPAY_KEY_ID not found'
    }
    
    if ($key_secret) {
        if ($key_secret -notmatch 'your_actual') {
            Write-Host '[OK] RAZORPAY_KEY_SECRET is configured'
        } else {
            Write-Host '[WARNING] RAZORPAY_KEY_SECRET is placeholder'
        }
    } else {
        Write-Host '[ERROR] RAZORPAY_KEY_SECRET not found'
    }
" 2>nul

echo.
echo ======================================================
echo Next Steps
echo ======================================================
echo.
echo 1. If any items show [ERROR], fix them first
echo 2. Restart the backend server:
echo    npm run dev
echo 3. Watch the console output for detailed logs
echo 4. Try the payment flow again
echo.
echo For full error details, check the backend console when it starts
echo.
pause
