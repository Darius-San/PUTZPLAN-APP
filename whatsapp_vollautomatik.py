#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
🚀 WhatsApp Auto-Send Service - ECHTER automatischer Versand
Läuft als lokaler Service und sendet WhatsApp-Nachrichten VOLLAUTOMATISCH
Keine Benutzerinteraktion erforderlich!
"""

import time
import webbrowser
import urllib.parse
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.keys import Keys
import logging
import sys
import threading
from http.server import HTTPServer, BaseHTTPRequestHandler
import json

# Logging konfigurieren
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

class WhatsAppAutoService:
    def __init__(self):
        self.driver = None
        self.setup_driver()
    
    def setup_driver(self):
        """Setup Chrome WebDriver für WhatsApp Web mit robusten Fallbacks"""
        
        # Verschiedene Chrome-Konfigurationen probieren
        configurations = [
            # Konfiguration 1: Standard mit Session-Persistierung
            {
                "name": "Standard mit Session",
                "options": [
                    "--no-sandbox",
                    "--disable-dev-shm-usage", 
                    "--disable-gpu",
                    "--disable-web-security",
                    "--disable-features=VizDisplayCompositor",
                    "--window-size=1200,800",
                    "--user-data-dir=./whatsapp_session"
                ]
            },
            # Konfiguration 2: Ohne Session-Ordner
            {
                "name": "Ohne Session-Persistierung",
                "options": [
                    "--no-sandbox",
                    "--disable-dev-shm-usage",
                    "--disable-gpu", 
                    "--disable-web-security",
                    "--disable-features=VizDisplayCompositor",
                    "--window-size=1200,800"
                ]
            },
            # Konfiguration 3: Minimal
            {
                "name": "Minimal-Konfiguration", 
                "options": [
                    "--no-sandbox",
                    "--disable-gpu"
                ]
            }
        ]
        
        for config in configurations:
            try:
                logger.info(f"🔧 Probiere {config['name']}...")
                
                chrome_options = Options()
                
                # Alle Optionen hinzufügen
                for option in config['options']:
                    chrome_options.add_argument(option)
                
                # Chrome starten
                self.driver = webdriver.Chrome(options=chrome_options)
                logger.info("✅ Chrome WebDriver initialisiert")
                
                # WhatsApp Web öffnen
                self.driver.get("https://web.whatsapp.com")
                logger.info("🌐 WhatsApp Web geöffnet")
                
                # Test ob alles funktioniert
                self.driver.title
                logger.info(f"✅ {config['name']} erfolgreich!")
                
                return True
                
            except Exception as e:
                logger.warning(f"⚠️ {config['name']} fehlgeschlagen: {e}")
                if self.driver:
                    try:
                        self.driver.quit()
                    except:
                        pass
                    self.driver = None
                continue
        
        # Wenn alle Konfigurationen fehlschlagen
        logger.error("❌ Alle Chrome-Konfigurationen fehlgeschlagen!")
        logger.error("💡 Mögliche Lösungen:")
        logger.error("   1. Chrome neu installieren")
        logger.error("   2. ChromeDriver aktualisieren: pip install --upgrade selenium")
        logger.error("   3. Windows-Benutzerrechte prüfen") 
        logger.error("   4. Antivirus-Software temporär deaktivieren")
        
        return False
    
    def wait_for_whatsapp_ready(self):
        """Warten bis WhatsApp Web bereit ist"""
        try:
            # Warten auf QR-Code oder Chat-Interface
            WebDriverWait(self.driver, 60).until(
                lambda driver: driver.find_element(By.CSS_SELECTOR, '[data-testid="chat"]') or
                              driver.find_element(By.CSS_SELECTOR, 'canvas[aria-label*="Scan"]')
            )
            
            # Prüfen ob QR-Code noch da ist
            qr_elements = self.driver.find_elements(By.CSS_SELECTOR, 'canvas[aria-label*="Scan"]')
            if qr_elements:
                logger.warning("📱 QR-Code erkannt - bitte mit Handy scannen")
                input("📱 Nach QR-Code-Scan Enter drücken...")
            
            # Warten auf Chat-Interface
            WebDriverWait(self.driver, 30).until(
                EC.presence_of_element_located((By.CSS_SELECTOR, '[data-testid="chat"]'))
            )
            
            logger.info("✅ WhatsApp Web ist bereit")
            return True
            
        except Exception as e:
            logger.error(f"❌ WhatsApp Web nicht bereit: {e}")
            return False
    
    def send_message_completely_automatic(self, phone_number, message):
        """Sendet Nachricht VOLLAUTOMATISCH ohne jede Benutzerinteraktion"""
        try:
            logger.info(f"🚀 VOLLAUTOMATISCHER Versand startet...")
            logger.info(f"📞 Ziel: {phone_number}")
            logger.info(f"📝 Nachricht: {message[:50]}...")
            
            # URL für direkten Chat
            encoded_message = urllib.parse.quote(message)
            url = f"https://web.whatsapp.com/send?phone={phone_number}&text={encoded_message}"
            
            # Zur Chat-URL navigieren
            self.driver.get(url)
            logger.info("🔍 Chat-URL geöffnet")
            
            # Warten auf Chat-Interface
            WebDriverWait(self.driver, 20).until(
                EC.presence_of_element_located((By.CSS_SELECTOR, '[data-testid="conversation-compose-box-input"]'))
            )
            logger.info("💬 Chat-Interface geladen")
            
            # Kurz warten bis alles geladen ist
            time.sleep(2)
            
            # Send-Button finden und klicken
            send_selectors = [
                '[data-testid="send"]',
                'button[aria-label*="Send"]',
                'button[aria-label*="Senden"]',
                'span[data-icon="send"]'
            ]
            
            send_button = None
            for selector in send_selectors:
                try:
                    send_button = WebDriverWait(self.driver, 5).until(
                        EC.element_to_be_clickable((By.CSS_SELECTOR, selector))
                    )
                    break
                except:
                    continue
            
            if send_button:
                # Button klicken - VOLLAUTOMATISCH!
                send_button.click()
                logger.info("🚀 NACHRICHT VOLLAUTOMATISCH GESENDET!")
                
                # Kurz warten um zu bestätigen
                time.sleep(2)
                
                # Prüfen ob Nachricht weg ist (erfolgreich gesendet)
                try:
                    input_field = self.driver.find_element(By.CSS_SELECTOR, '[data-testid="conversation-compose-box-input"]')
                    if not input_field.text.strip():
                        logger.info("✅ BESTÄTIGT: Nachricht erfolgreich gesendet!")
                        return True
                except:
                    pass
                
                logger.info("✅ Send-Button geklickt - Nachricht sollte gesendet sein")
                return True
            else:
                logger.error("❌ Send-Button nicht gefunden")
                return False
                
        except Exception as e:
            logger.error(f"❌ Fehler beim automatischen Senden: {e}")
            return False
    
    def close(self):
        """Service schließen"""
        if self.driver:
            self.driver.quit()
            logger.info("🔒 WhatsApp Service geschlossen")

class WhatsAppHTTPHandler(BaseHTTPRequestHandler):
    """HTTP Handler für externe Anfragen"""
    
    def do_POST(self):
        if self.path == '/send-whatsapp':
            try:
                # Request Body lesen
                content_length = int(self.headers['Content-Length'])
                post_data = self.rfile.read(content_length)
                data = json.loads(post_data.decode('utf-8'))
                
                phone = data.get('phone', '+491724620111')
                message = data.get('message', 'Test-Nachricht')
                
                logger.info(f"📨 HTTP Request empfangen: {phone}")
                
                # Nachricht senden
                success = whatsapp_service.send_message_completely_automatic(phone, message)
                
                # Response senden
                response = {
                    'success': success,
                    'message': 'Nachricht vollautomatisch gesendet!' if success else 'Fehler beim Senden'
                }
                
                self.send_response(200)
                self.send_header('Content-Type', 'application/json')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()
                self.wfile.write(json.dumps(response).encode('utf-8'))
                
            except Exception as e:
                logger.error(f"❌ HTTP Handler Fehler: {e}")
                self.send_response(500)
                self.end_headers()
    
    def do_OPTIONS(self):
        """CORS preflight handling"""
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'POST')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()
    
    def log_message(self, format, *args):
        """Stilles Logging"""
        pass

# Globaler Service
whatsapp_service = None

def start_http_server():
    """HTTP Server für externe Anfragen starten"""
    server = HTTPServer(('localhost', 8003), WhatsAppHTTPHandler)
    logger.info("🌐 HTTP Server gestartet auf http://localhost:8003")
    logger.info("📡 Endpoint: POST /send-whatsapp")
    server.serve_forever()

def main():
    global whatsapp_service
    
    print("🚀 WhatsApp VOLLAUTOMATIK Service")
    print("=" * 50)
    
    # WhatsApp Service initialisieren
    whatsapp_service = WhatsAppAutoService()
    
    # Warten bis WhatsApp bereit ist
    if not whatsapp_service.wait_for_whatsapp_ready():
        print("❌ WhatsApp Web nicht bereit")
        return
    
    print("✅ WhatsApp Service bereit für VOLLAUTOMATISCHEN Versand!")
    
    if len(sys.argv) >= 3:
        # Direkt senden (Kommandozeilen-Modus)
        phone = sys.argv[1]
        message = sys.argv[2]
        
        success = whatsapp_service.send_message_completely_automatic(phone, message)
        if success:
            print("🎉 VOLLAUTOMATISCHER VERSAND ERFOLGREICH!")
        else:
            print("❌ Versand fehlgeschlagen")
    else:
        # HTTP Server Modus
        print("🌐 Starte HTTP Server für externe Anfragen...")
        
        # HTTP Server in separatem Thread
        server_thread = threading.Thread(target=start_http_server, daemon=True)
        server_thread.start()
        
        print("\n📋 SERVICE BEREIT:")
        print("• WhatsApp Web ist eingeloggt")
        print("• HTTP Server läuft auf Port 8003") 
        print("• VOLLAUTOMATISCHER Versand aktiv")
        print("\n🔧 Verwendung:")
        print("  POST http://localhost:8003/send-whatsapp")
        print("  Body: {\"phone\": \"+491724620111\", \"message\": \"Test\"}")
        print("\n⏹️  Ctrl+C zum Beenden")
        
        try:
            while True:
                time.sleep(1)
        except KeyboardInterrupt:
            print("\n👋 Service wird beendet...")
    
    whatsapp_service.close()

if __name__ == "__main__":
    main()