@echo off
echo ========================================
echo    STARTING PRISM BLOCKCHAIN SYSTEM
echo ========================================
echo.

REM Start blockchain validator
echo [1/2] Starting PRISM Blockchain Validator...
start "PRISM Validator" cmd /k "cd /d C:\Users\richp\Desktop\Prismv0.1\prism-blockchain && npm run validator1"

REM Wait a moment for blockchain to start
timeout /t 5 /nobreak > nul

REM Start block explorer
echo [2/2] Starting PRISM Block Explorer...
start "PRISM Explorer" cmd /k "cd /d C:\Users\richp\Desktop\Prismv0.1\prism-explorer && npm run dev"

echo.
echo ========================================
echo    PRISM SYSTEM STARTED SUCCESSFULLY!
echo ========================================
echo.
echo Two windows have been opened:
echo   1. PRISM Validator (Blockchain)
echo   2. PRISM Explorer (Web Interface)
echo.
echo Wait 10 seconds, then open your browser to:
echo   http://localhost:3000
echo.
echo Press any key to exit this window...
pause > nul
