@echo off
echo ===================================================
echo   GitHub Push Automation Script
echo ===================================================
echo.
echo Navigating to project directory...
cd /d "C:\Users\ADMIN\Downloads\homicube-gl-main\homicube-gl-main"
echo.
echo Running git push...
echo (If a GitHub sign-in window appears, please log in with your 'chirpeelstudio-cpu' account)
echo.
git push -u origin main
echo.
echo ===================================================
pause
