@echo off
REM 🚀 WhatsApp Alarm Automation für Windows
REM Automatischer Aufruf des Python Scripts

echo.
echo ========================================
echo   🚨 WhatsApp Alarm Automation 🚨  
echo ========================================
echo.

REM Parameter prüfen
if "%1"=="" goto usage
if "%2"=="" goto usage

set CONTACT=%1
set TASK=%2
set WG=%3
set SENDER=%4

REM Defaults setzen
if "%WG%"=="" set WG=WG
if "%SENDER%"=="" set SENDER=System

echo 📱 Kontakt: %CONTACT%
echo 📋 Task: %TASK%  
echo 🏠 WG: %WG%
echo 👤 Sender: %SENDER%
echo.

REM Python verfügbar prüfen
python --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Python ist nicht installiert oder nicht im PATH!
    echo 💡 Installieren Sie Python von python.org
    pause
    exit /b 1
)

REM Selenium prüfen
python -c "import selenium" >nul 2>&1
if errorlevel 1 (
    echo ⚠️  Selenium nicht gefunden. Installiere automatisch...
    pip install selenium webdriver-manager
    if errorlevel 1 (
        echo ❌ Installation fehlgeschlagen!
        pause
        exit /b 1
    )
)

echo ✅ Starte WhatsApp Automation...
echo.

REM Python Script ausführen
python whatsapp_automation.py %CONTACT% %TASK% %WG% %SENDER%

if errorlevel 1 (
    echo.
    echo ❌ Fehler beim Senden der Nachricht!
    echo 🔧 Mögliche Probleme:
    echo    - WhatsApp Web nicht angemeldet
    echo    - Kontakt '%CONTACT%' nicht gefunden
    echo    - ChromeDriver Probleme
    echo.
    pause
    exit /b 1
) else (
    echo.
    echo ✅ Nachricht erfolgreich gesendet!
    timeout /t 3
    exit /b 0
)

:usage
echo.
echo 📋 Verwendung: whatsapp_alarm.bat "KONTAKT" "TASK" ["WG"] ["SENDER"]
echo.
echo 📋 Beispiele:
echo    whatsapp_alarm.bat "Max Mustermann" "Küche putzen"
echo    whatsapp_alarm.bat "WG Gruppe" "Badezimmer" "Meine WG" "Darius"
echo.
pause
exit /b 1