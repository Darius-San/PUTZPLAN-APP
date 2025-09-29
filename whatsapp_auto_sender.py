#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
🤖 WhatsApp Auto Sender - Vollautomatischer Nachrichtenversand
Sendet automatisch WhatsApp-Nachrichten ohne Benutzerinteraktion
"""

import sys
import time
import urllib.parse
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.keys import Keys
import logging

# Logging konfigurieren
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

class WhatsAppAutoSender:
    def __init__(self, headless=True):
        """Initialisiert den WhatsApp Auto Sender"""
        self.headless = headless
        self.driver = None
        self.setup_driver()
    
    def setup_driver(self):
        """Konfiguriert den Chrome WebDriver"""
        try:
            chrome_options = Options()
            if self.headless:
                chrome_options.add_argument("--headless")
            chrome_options.add_argument("--no-sandbox")
            chrome_options.add_argument("--disable-dev-shm-usage")
            chrome_options.add_argument("--disable-gpu")
            chrome_options.add_argument("--window-size=1920,1080")
            chrome_options.add_argument("--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36")
            
            # Für persistente Session
            chrome_options.add_argument("--user-data-dir=./whatsapp_session")
            
            self.driver = webdriver.Chrome(options=chrome_options)
            logger.info("✅ Chrome WebDriver initialisiert")
            return True
            
        except Exception as e:
            logger.error(f"❌ Fehler beim Setup des WebDrivers: {e}")
            return False
    
    def send_message(self, phone_number, message):
        """Sendet eine WhatsApp-Nachricht automatisch"""
        try:
            # WhatsApp Web mit direkter Nachricht öffnen
            encoded_message = urllib.parse.quote(message)
            url = f"https://web.whatsapp.com/send?phone={phone_number}&text={encoded_message}"
            
            logger.info(f"🌐 Öffne WhatsApp Web für {phone_number}...")
            self.driver.get(url)
            
            # Warten bis WhatsApp Web geladen ist
            logger.info("⏳ Warte auf WhatsApp Web...")
            
            try:
                # Prüfen ob QR-Code-Scan erforderlich ist
                qr_code = WebDriverWait(self.driver, 10).until(
                    EC.presence_of_element_located((By.CSS_SELECTOR, "canvas[aria-label*='Scan']"))
                )
                logger.warning("🔍 QR-Code erkannt - WhatsApp ist nicht angemeldet!")
                logger.info("📱 Bitte WhatsApp Web mit Ihrem Handy verknüpfen und dann erneut versuchen.")
                return False
                
            except:
                # QR-Code nicht gefunden - wahrscheinlich bereits angemeldet
                logger.info("✅ WhatsApp Web ist bereits angemeldet")
            
            # Warten auf Chat-Interface
            logger.info("💬 Warte auf Chat-Interface...")
            
            # Mehrere Selektoren für den Send-Button versuchen
            send_selectors = [
                '[data-testid="send"]',
                'button[aria-label*="Send"]',
                'button[aria-label*="Senden"]',
                'span[data-icon="send"]',
                'button[title*="Send"]',
                'button[title*="Senden"]'
            ]
            
            send_button = None
            max_wait = 30  # Maximal 30 Sekunden warten
            
            for attempt in range(max_wait):
                for selector in send_selectors:
                    try:
                        send_button = self.driver.find_element(By.CSS_SELECTOR, selector)
                        if send_button and send_button.is_enabled():
                            logger.info(f"🎯 Send-Button gefunden: {selector}")
                            break
                    except:
                        continue
                
                if send_button:
                    break
                    
                time.sleep(1)
                logger.info(f"⏳ Warte auf Send-Button... ({attempt + 1}/{max_wait})")
            
            if send_button:
                # Button klicken
                logger.info("📤 Sende Nachricht automatisch...")
                send_button.click()
                
                # Kurz warten um sicherzugehen dass gesendet wurde
                time.sleep(2)
                
                # Prüfen ob Nachricht gesendet wurde (durch Verschwinden des Textes)
                try:
                    message_input = self.driver.find_element(By.CSS_SELECTOR, '[data-testid="message-input"]')
                    if not message_input.get_attribute("value"):
                        logger.info("✅ Nachricht erfolgreich automatisch gesendet!")
                        return True
                except:
                    pass
                
                logger.info("✅ Send-Button geklickt - Nachricht sollte gesendet sein")
                return True
                
            else:
                logger.warning("❌ Send-Button nicht gefunden - möglicherweise Chat-Problem")
                return False
                
        except Exception as e:
            logger.error(f"❌ Fehler beim Senden der Nachricht: {e}")
            return False
    
    def close(self):
        """Schließt den WebDriver"""
        if self.driver:
            self.driver.quit()
            logger.info("🔒 WebDriver geschlossen")

def main():
    """Hauptfunktion für Kommandozeilen-Aufruf"""
    if len(sys.argv) != 3:
        print("📋 Verwendung: python whatsapp_auto_sender.py <TELEFONNUMMER> <NACHRICHT>")
        print("📋 Beispiel: python whatsapp_auto_sender.py '+491724620111' 'Test-Nachricht'")
        sys.exit(1)
    
    phone_number = sys.argv[1]
    message = sys.argv[2]
    
    logger.info("🚀 Starte WhatsApp Auto Sender...")
    logger.info(f"📞 Ziel: {phone_number}")
    logger.info(f"📝 Nachricht: {message[:50]}...")
    
    # Auto Sender initialisieren (headless für Hintergrund-Betrieb)
    sender = WhatsAppAutoSender(headless=True)
    
    try:
        success = sender.send_message(phone_number, message)
        if success:
            print("✅ SUCCESS: Nachricht automatisch gesendet!")
            logger.info("🎉 Automatischer Versand erfolgreich!")
        else:
            print("❌ FAILED: Nachricht konnte nicht gesendet werden")
            logger.error("💥 Automatischer Versand fehlgeschlagen!")
            
    except KeyboardInterrupt:
        logger.info("⏹️ Benutzerabbruch")
        
    finally:
        sender.close()

if __name__ == "__main__":
    main()