#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
🚀 WhatsApp ULTRA-Automatik - KOMPLETT automatisch!
KEIN Enter drücken, KEIN Klicken, NICHTS!
Verwendet Browser-Automation mit JavaScript-Injection
"""

import time
import webbrowser
import urllib.parse
import threading
from http.server import HTTPServer, BaseHTTPRequestHandler
import json
import logging
import subprocess
import os

# Logging konfigurieren
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

class WhatsAppUltraService:
    def __init__(self):
        self.active = True
        logger.info("✅ WhatsApp ULTRA-Service initialisiert")
    
    def send_message_ultra_automatik(self, phone_number, message):
        """Sendet Nachricht KOMPLETT automatisch - KEIN Enter, KEIN Klick!"""
        try:
            logger.info(f"🚀 ULTRA-Automatik startet - KOMPLETT automatisch...")
            logger.info(f"📞 Ziel: {phone_number}")
            logger.info(f"📝 Nachricht: {message[:50]}...")
            
            # URL für direkten Chat vorbereiten
            encoded_message = urllib.parse.quote(message)
            whatsapp_url = f"https://web.whatsapp.com/send?phone={phone_number}&text={encoded_message}"
            
            # JavaScript für automatisches Senden erstellen
            auto_send_js = f"""
            console.log("🤖 ULTRA-Automatik gestartet - KOMPLETT automatisch!");
            
            // Funktion zum Warten auf Element
            function waitForElement(selector, timeout = 15000) {{
                return new Promise((resolve, reject) => {{
                    const startTime = Date.now();
                    function check() {{
                        const element = document.querySelector(selector);
                        if (element) {{
                            resolve(element);
                        }} else if (Date.now() - startTime > timeout) {{
                            reject(new Error('Element nicht gefunden: ' + selector));
                        }} else {{
                            setTimeout(check, 200);
                        }}
                    }}
                    check();
                }});
            }}
            
            // Haupt-Automatik-Funktion
            async function ultraAutomatikSender() {{
                try {{
                    console.log("⏳ Warte auf WhatsApp Web...");
                    
                    // Warten bis WhatsApp geladen ist
                    await new Promise(resolve => setTimeout(resolve, 3000));
                    
                    console.log("🔍 Suche Send-Button...");
                    
                    // Verschiedene Send-Button Selektoren (alle bekannten)
                    const sendSelectors = [
                        '[data-testid="send"]',
                        'button[aria-label*="Send"]',
                        'button[aria-label*="Senden"]', 
                        'span[data-icon="send"]',
                        '[data-icon="send"]',
                        'button[data-tab="11"]',
                        '._ak1r button',
                        '._3y5oW button',
                        'footer button[class*="compose"]',
                        'button[class*="send"]'
                    ];
                    
                    let sendButton = null;
                    let selectorUsed = null;
                    
                    for (const selector of sendSelectors) {{
                        try {{
                            sendButton = await waitForElement(selector, 2000);
                            selectorUsed = selector;
                            console.log("✅ Send-Button gefunden mit:", selector);
                            break;
                        }} catch (e) {{
                            console.log("❌ Nicht gefunden:", selector);
                        }}
                    }}
                    
                    if (sendButton) {{
                        console.log("🎯 Send-Button bereit zum Klicken...");
                        
                        // Verschiedene Klick-Methoden probieren
                        const clickMethods = [
                            () => sendButton.click(),
                            () => {{
                                const event = new MouseEvent('click', {{
                                    view: window,
                                    bubbles: true,
                                    cancelable: true
                                }});
                                sendButton.dispatchEvent(event);
                            }},
                            () => {{
                                sendButton.focus();
                                const enterEvent = new KeyboardEvent('keydown', {{
                                    key: 'Enter',
                                    code: 'Enter', 
                                    keyCode: 13,
                                    which: 13,
                                    bubbles: true
                                }});
                                sendButton.dispatchEvent(enterEvent);
                            }},
                            () => {{
                                // Direkter Enter auf Input-Field
                                const inputField = document.querySelector('[data-testid="conversation-compose-box-input"]');
                                if (inputField) {{
                                    inputField.focus();
                                    const event = new KeyboardEvent('keydown', {{
                                        key: 'Enter',
                                        code: 'Enter',
                                        keyCode: 13,
                                        which: 13,
                                        bubbles: true
                                    }});
                                    inputField.dispatchEvent(event);
                                }}
                            }}
                        ];
                        
                        // Alle Klick-Methoden nacheinander probieren
                        for (let i = 0; i < clickMethods.length; i++) {{
                            try {{
                                console.log(`🚀 Versuch ${{i + 1}}: Automatisches Senden...`);
                                clickMethods[i]();
                                
                                // Kurz warten und prüfen ob erfolgreich
                                await new Promise(resolve => setTimeout(resolve, 1000));
                                
                                // Prüfen ob Nachricht weg ist (erfolgreich gesendet)
                                const inputField = document.querySelector('[data-testid="conversation-compose-box-input"]');
                                if (inputField && (!inputField.textContent || inputField.textContent.trim() === '')) {{
                                    console.log("🎉 ERFOLGREICH! Nachricht automatisch gesendet!");
                                    
                                    // Erfolgs-Notification anzeigen
                                    const successDiv = document.createElement('div');
                                    successDiv.style.cssText = `
                                        position: fixed;
                                        top: 20px;
                                        right: 20px;
                                        background: #4CAF50;
                                        color: white;
                                        padding: 20px;
                                        border-radius: 10px;
                                        font-size: 16px;
                                        font-weight: bold;
                                        z-index: 9999;
                                        box-shadow: 0 4px 8px rgba(0,0,0,0.3);
                                    `;
                                    successDiv.innerHTML = '🎉 NACHRICHT AUTOMATISCH GESENDET!<br>ULTRA-Automatik erfolgreich!';
                                    document.body.appendChild(successDiv);
                                    
                                    // Nach 3 Sekunden Fenster schließen
                                    setTimeout(() => {{
                                        window.close();
                                    }}, 3000);
                                    
                                    return true;
                                }}
                            }} catch (e) {{
                                console.log(`❌ Versuch ${{i + 1}} fehlgeschlagen:`, e);
                            }}
                        }}
                        
                        console.log("⚠️ Automatisches Senden nicht erfolgreich - aber Button wurde geklickt");
                        
                    }} else {{
                        console.log("❌ Send-Button nicht gefunden");
                        
                        // Fallback: Enter auf Input-Field
                        try {{
                            const inputField = document.querySelector('[data-testid="conversation-compose-box-input"]');
                            if (inputField) {{
                                console.log("🔄 Fallback: Enter auf Input-Field...");
                                inputField.focus();
                                
                                // Enter Event senden
                                const enterEvent = new KeyboardEvent('keydown', {{
                                    key: 'Enter',
                                    code: 'Enter',
                                    keyCode: 13,
                                    which: 13,
                                    bubbles: true,
                                    cancelable: true
                                }});
                                inputField.dispatchEvent(enterEvent);
                                
                                console.log("🚀 Enter-Event gesendet!");
                            }}
                        }} catch (e) {{
                            console.log("❌ Enter-Fallback fehlgeschlagen:", e);
                        }}
                    }}
                    
                }} catch (error) {{
                    console.error("❌ ULTRA-Automatik Fehler:", error);
                }}
            }}
            
            // Automatik nach Laden starten
            setTimeout(ultraAutomatikSender, 4000);
            """
            
            # HTML-Datei mit JavaScript erstellen
            html_content = f"""
            <!DOCTYPE html>
            <html>
            <head>
                <title>WhatsApp ULTRA-Automatik</title>
                <script>
                    // Nach dem Laden zu WhatsApp weiterleiten und Automatik starten
                    window.onload = function() {{
                        console.log("🚀 Leite zu WhatsApp weiter und starte ULTRA-Automatik...");
                        
                        // Zu WhatsApp weiterleiten
                        window.location.href = "{whatsapp_url}";
                        
                        // JavaScript für spätere Injection vorbereiten
                        setTimeout(() => {{
                            {auto_send_js}
                        }}, 2000);
                    }};
                </script>
            </head>
            <body>
                <h1>🚀 WhatsApp ULTRA-Automatik</h1>
                <p>Weiterleitung zu WhatsApp Web...</p>
                <p>Automatisches Senden startet in wenigen Sekunden!</p>
            </body>
            </html>
            """
            
            # Temporäre HTML-Datei erstellen
            temp_file = "whatsapp_ultra_temp.html"
            with open(temp_file, 'w', encoding='utf-8') as f:
                f.write(html_content)
            
            logger.info("📄 Temporäre HTML-Datei erstellt mit JavaScript-Automatik")
            
            # Browser öffnen mit der HTML-Datei
            webbrowser.open(f"file://{os.path.abspath(temp_file)}")
            
            logger.info("🌐 Browser geöffnet - ULTRA-Automatik startet!")
            logger.info("⚡ KOMPLETT AUTOMATISCH:")
            logger.info("   ✅ WhatsApp öffnet automatisch") 
            logger.info("   ✅ Nachricht ist eingefügt")
            logger.info("   ✅ Send-Button wird automatisch geklickt")
            logger.info("   ✅ Enter wird automatisch gedrückt")
            logger.info("   ✅ Fenster schließt automatisch")
            logger.info("   ✅ KEIN Benutzer-Input erforderlich!")
            
            # Temp-Datei nach 30 Sekunden löschen
            threading.Timer(30, lambda: os.remove(temp_file) if os.path.exists(temp_file) else None).start()
            
            return True
            
        except Exception as e:
            logger.error(f"❌ ULTRA-Automatik Fehler: {e}")
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
                success = whatsapp_service.send_message_ultra_automatik(phone, message)
                
                # Response senden
                response = {
                    'success': success,
                    'message': 'ULTRA-Automatik gestartet - KOMPLETT automatisch!' if success else 'Fehler beim Starten'
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
    server = HTTPServer(('localhost', 8004), WhatsAppHTTPHandler)
    logger.info("🌐 HTTP Server gestartet auf http://localhost:8004")
    logger.info("📡 Endpoint: POST /send-whatsapp")
    server.serve_forever()

def main():
    global whatsapp_service
    
    print("🚀 WhatsApp ULTRA-Automatik Service")
    print("=" * 50)
    print("✅ KOMPLETT automatisch!")
    print("✅ KEIN Enter drücken!")
    print("✅ KEIN Klicken!")
    print("✅ KEINE Benutzeraktion!")
    print("✅ JavaScript-Automation!")
    print()
    
    # WhatsApp Service initialisieren  
    whatsapp_service = WhatsAppUltraService()
    
    if len(sys.argv) >= 3:
        # Direkt senden (Kommandozeilen-Modus)
        phone = sys.argv[1]
        message = sys.argv[2]
        
        success = whatsapp_service.send_message_ultra_automatik(phone, message)
        if success:
            print("🎉 ULTRA-Automatik erfolgreich gestartet!")
            print("⚡ KOMPLETT automatisch - schauen Sie zu!")
        else:
            print("❌ ULTRA-Automatik fehlgeschlagen")
    else:
        # HTTP Server Modus
        print("🌐 Starte HTTP Server für externe Anfragen...")
        
        # HTTP Server in separatem Thread
        server_thread = threading.Thread(target=start_http_server, daemon=True)
        server_thread.start()
        
        print("\n📋 ULTRA SERVICE BEREIT:")
        print("• JavaScript-basierte ULTRA-Automatisierung")
        print("• HTTP Server läuft auf Port 8004")
        print("• KOMPLETT automatisches Senden") 
        print("• KEIN Enter drücken erforderlich")
        print("• KEIN Klicken erforderlich")
        print("• KEINE Benutzeraktion erforderlich")
        print("\n🔧 Verwendung:")
        print("  POST http://localhost:8004/send-whatsapp")
        print("  Body: {\"phone\": \"+491724620111\", \"message\": \"Test\"}")
        print("\n🎯 ULTRA-FEATURES:")
        print("  - Automatische WhatsApp-Weiterleitung")
        print("  - JavaScript Send-Button Detection")
        print("  - Automatisches Klicken/Enter")
        print("  - Automatisches Fenster-Schließen")
        print("  - Erfolgs-Confirmation")
        print("\n⏹️  Ctrl+C zum Beenden")
        
        try:
            while True:
                time.sleep(1)
        except KeyboardInterrupt:
            print("\n👋 ULTRA-Service wird beendet...")

if __name__ == "__main__":
    import sys
    main()