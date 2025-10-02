@echo off
setlocal

REM Change to repository directory
cd /d "%~dp0"

REM Start a simple HTTP server on port 8000 in a separate window
start "putzplan-server" cmd /k python -m http.server 8000

REM Give the server a moment to start
timeout /t 2 > nul

REM Open the test harness (falls back to main page if needed)
start "" http://localhost:8000/test-buttons.html

echo Server started on http://localhost:8000/
echo A browser window should open. Press any key to exit this starter.
pause > nul
endlocal

