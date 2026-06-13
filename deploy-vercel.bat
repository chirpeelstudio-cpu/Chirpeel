@echo off
REM Vercel Automated Deployment Script for Windows
REM This script automates deploying the Vite React frontend to Vercel.

echo ===================================================
echo   Vercel Automated Deployment Script
echo ===================================================
echo.

REM Step 1: Check if Vercel CLI is installed
where vercel >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Vercel CLI is not installed on your system.
    echo Please install it globally by running:
    echo.
    echo   npm install -g vercel
    echo.
    echo After installing, run this script again.
    echo ===================================================
    pause
    exit /b 1
)

echo [INFO] Vercel CLI is installed.
echo [INFO] Preparing to deploy the project...
echo.

REM Step 2: Deploy to Vercel (Production)
echo [DEPLOY] Running 'vercel --prod' to deploy to production...
echo [DEPLOY] Follow any prompts if you haven't linked this project yet.
echo.
call vercel --prod

if %errorlevel% equ 0 (
    echo.
    echo [SUCCESS] Application successfully deployed to Vercel!
    echo ===================================================
) else (
    echo.
    echo [ERROR] Deployment failed. Please check the error messages above.
    echo ===================================================
)

pause
