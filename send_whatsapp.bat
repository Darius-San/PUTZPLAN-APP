@echo off
REM 🚀 WhatsApp Auto Sender für Windows
REM Automatischer Nachrichtenversand ohne Benutzerinteraktion

echo.
echo ========================================
echo   🚨 WhatsApp Auto Sender 🚨  
echo ========================================
echo.

REM Prüfe ob Python installiert ist
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ FEHLER: Python ist nicht installiert!
    echo 📥 Bitte installieren Sie Python von: https://python.org
    pause
    exit /b 1
)

echo ✅ Python gefunden
echo.

REM Prüfe ob Selenium installiert ist
python -c "import selenium" >nul 2>&1
if %errorlevel% neq 0 (
    echo 📦 Installiere Selenium...
    pip install selenium webdriver-manager
    if %errorlevel% neq 0 (
        echo ❌ FEHLER: Selenium konnte nicht installiert werden!
        pause
        exit /b 1
    )
    echo ✅ Selenium installiert
)

echo ✅ Alle Dependencies verfügbar
echo.

REM Parameter setzen (können über Kommandozeile überschrieben werden)
set PHONE=%1
set MESSAGE=%2

if "%PHONE%"=="" set PHONE=+491724620111
if "%MESSAGE%"=="" set MESSAGE=🚨 TEST: Automatische WhatsApp-Nachricht von der WG-Putzplan-App

echo 📞 Telefonnummer: %PHONE%
echo 📝 Nachricht: %MESSAGE%
echo.

echo ✅ Starte WhatsApp Automation...
echo 🔄 Bitte warten...
echo.

REM Python-Script ausführen
python whatsapp_auto_sender.py "%PHONE%" "%MESSAGE%"

if %errorlevel% equ 0 (
    echo.
    echo ✅ ✅ ERFOLG! ✅ ✅
    echo 📱 WhatsApp-Nachricht wurde automatisch gesendet!
    echo.
) else (
    echo.
    echo ❌ ❌ FEHLER! ❌ ❌  
    echo 💥 Nachricht konnte nicht automatisch gesendet werden
    echo.
    echo 🔧 TROUBLESHOOTING:
    echo • Ist WhatsApp Web mit Ihrem Handy verknüpft?
    echo • Ist Chrome/Chromium installiert?
    echo • Sind Sie mit dem Internet verbunden?
    echo.
)

echo 🔄 Script beendet
echo.
pause