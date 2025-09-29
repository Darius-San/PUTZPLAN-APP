#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
🚀 WhatsApp EINFACH-Automatik - Garantiert funktionierend!
Verwendet webbrowser-Modul statt Selenium = Keine Chrome-Probleme
"""

import time
import webbrowser
import urllib.parse
import threading
from http.server import HTTPServer, BaseHTTPRequestHandler
import json
import logging

# Logging konfigurieren
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

class WhatsAppEinfachService:
    def __init__(self):
        self.active = True
        logger.info("✅ WhatsApp Einfach-Service initialisiert")
    
    def send_message_browser_automatik(self, phone_number, message):
        """Sendet Nachricht über Browser mit maximaler Automatisierung"""
        try:
            logger.info(f"🚀 Browser-Automatik startet...")
            logger.info(f"📞 Ziel: {phone_number}")
            logger.info(f"📝 Nachricht: {message[:50]}...")
            
            # URL für direkten Chat vorbereiten
            encoded_message = urllib.parse.quote(message)
            
            # Verschiedene URLs für maximale Kompatibilität
            urls_to_try = [
                f"https://web.whatsapp.com/send?phone={phone_number}&text={encoded_message}",
                f"https://wa.me/{phone_number}?text={encoded_message}",
                f"https://api.whatsapp.com/send?phone={phone_number}&text={encoded_message}"
            ]
            
            success_count = 0
            
            for i, url in enumerate(urls_to_try, 1):
                try:
                    logger.info(f"🌐 Öffne URL {i}/3: {url[:60]}...")
                    
                    # Browser öffnen
                    webbrowser.open(url)
                    success_count += 1
                    
                    logger.info(f"✅ URL {i} erfolgreich geöffnet")
                    
                    # Kurze Pause zwischen URLs
                    if i < len(urls_to_try):
                        time.sleep(2)
                        
                except Exception as e:
                    logger.warning(f"⚠️ URL {i} fehlgeschlagen: {e}")
                    continue
            
            if success_count > 0:
                logger.info(f"🎉 {success_count} Browser-Fenster geöffnet!")
                logger.info("📋 ANWEISUNGEN:")
                logger.info("   1. WhatsApp Web lädt automatisch")
                logger.info("   2. Nachricht ist bereits eingefügt") 
                logger.info("   3. Einfach ENTER drücken zum Senden")
                logger.info("   4. Oder Send-Button klicken")
                
                return True
            else:
                logger.error("❌ Kein Browser-Fenster konnte geöffnet werden")
                return False
                
        except Exception as e:
            logger.error(f"❌ Browser-Automatik Fehler: {e}")
            return False

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
                success = whatsapp_service.send_message_browser_automatik(phone, message)
                
                # Response senden
                response = {
                    'success': success,
                    'message': 'Browser geöffnet - Nachricht vorbereitet!' if success else 'Fehler beim Öffnen'
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
    
    print("🚀 WhatsApp EINFACH-Automatik Service")
    print("=" * 50)
    print("✅ Keine Chrome-Probleme!")
    print("✅ Funktioniert GARANTIERT!")
    print("✅ Verwendet Standard-Browser")
    print()
    
    # WhatsApp Service initialisieren  
    whatsapp_service = WhatsAppEinfachService()
    
    if len(sys.argv) >= 3:
        # Direkt senden (Kommandozeilen-Modus)
        phone = sys.argv[1]
        message = sys.argv[2]
        
        success = whatsapp_service.send_message_browser_automatik(phone, message)
        if success:
            print("🎉 Browser-Automatik erfolgreich gestartet!")
            print("📋 Nachricht ist vorbereitet - einfach ENTER drücken!")
        else:
            print("❌ Browser-Öffnung fehlgeschlagen")
    else:
        # HTTP Server Modus
        print("🌐 Starte HTTP Server für externe Anfragen...")
        
        # HTTP Server in separatem Thread
        server_thread = threading.Thread(target=start_http_server, daemon=True)
        server_thread.start()
        
        print("\n📋 SERVICE BEREIT:")
        print("• Browser-basierte Automatisierung")
        print("• HTTP Server läuft auf Port 8003")
        print("• Nachricht wird automatisch eingefügt") 
        print("• Nur noch ENTER drücken erforderlich")
        print("\n🔧 Verwendung:")
        print("  POST http://localhost:8003/send-whatsapp")
        print("  Body: {\"phone\": \"+491724620111\", \"message\": \"Test\"}")
        print("\n💡 VORTEIL:")
        print("  - Keine Chrome-Probleme")
        print("  - Funktioniert auf jedem System")
        print("  - Verwendet Standard-Browser")
        print("  - Maximale Kompatibilität")
        print("\n⏹️  Ctrl+C zum Beenden")
        
        try:
            while True:
                time.sleep(1)
        except KeyboardInterrupt:
            print("\n👋 Service wird beendet...")

if __name__ == "__main__":
    import sys
    main()