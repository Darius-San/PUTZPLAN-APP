#!/usr/bin/env python3
"""
🚀 WhatsApp Web Automation Script
Automatisches Senden von dringenden Task-Alarmen über WhatsApp Web
"""

import time
import json
import sys
import os
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.common.keys import Keys
from selenium.webdriver.chrome.options import Options
from selenium.common.exceptions import TimeoutException, NoSuchElementException

class WhatsAppAutomation:
    def __init__(self):
        self.driver = None
        self.wait = None
        
    def setup_driver(self):
        """Chrome WebDriver mit WhatsApp Web Optimierungen einrichten"""
        print("🔧 Chrome WebDriver wird eingerichtet...")
        
        chrome_options = Options()
        # Benutzer-Profil laden (damit WhatsApp Web angemeldet bleibt)
        user_data_dir = os.path.join(os.getcwd(), "chrome_profile")
        chrome_options.add_argument(f"--user-data-dir={user_data_dir}")
        
        # WhatsApp Web Optimierungen
        chrome_options.add_argument("--disable-blink-features=AutomationControlled")
        chrome_options.add_experimental_option("excludeSwitches", ["enable-automation"])
        chrome_options.add_experimental_option('useAutomationExtension', False)
        
        # Benachrichtigungen erlauben für WhatsApp Web
        prefs = {
            "profile.default_content_setting_values.notifications": 1,
            "profile.default_content_settings.popups": 0,
            "profile.managed_default_content_settings.images": 1
        }
        chrome_options.add_experimental_option("prefs", prefs)
        
        try:
            self.driver = webdriver.Chrome(options=chrome_options)
            self.driver.execute_script("Object.defineProperty(navigator, 'webdriver', {get: () => undefined})")
            self.wait = WebDriverWait(self.driver, 30)
            print("✅ Chrome WebDriver erfolgreich gestartet!")
            return True
        except Exception as e:
            print(f"❌ Fehler beim Setup: {e}")
            print("💡 Installieren Sie ChromeDriver: pip install selenium webdriver-manager")
            return False
    
    def open_whatsapp_web(self):
        """WhatsApp Web öffnen und auf Login warten"""
        print("🌐 WhatsApp Web wird geöffnet...")
        
        try:
            self.driver.get("https://web.whatsapp.com")
            print("📱 WhatsApp Web geladen. Warte auf Login...")
            
            # Warten bis QR Code gescannt oder bereits angemeldet
            try:
                # Prüfen ob bereits angemeldet (Suche-Box vorhanden)
                search_box = self.wait.until(
                    EC.presence_of_element_located((By.XPATH, "//div[@contenteditable='true'][@data-tab='3']"))
                )
                print("✅ WhatsApp Web ist bereits angemeldet!")
                return True
            except TimeoutException:
                # QR Code scannen erforderlich
                print("📷 Bitte scannen Sie den QR-Code mit Ihrem Handy...")
                print("⏳ Warte auf erfolgreichen Login (max 60 Sekunden)...")
                
                search_box = self.wait.until(
                    EC.presence_of_element_located((By.XPATH, "//div[@contenteditable='true'][@data-tab='3']"))
                )
                print("✅ Login erfolgreich!")
                return True
                
        except TimeoutException:
            print("❌ Login Timeout. Bitte versuchen Sie es erneut.")
            return False
        except Exception as e:
            print(f"❌ Fehler beim WhatsApp Web Login: {e}")
            return False
    
    def find_chat(self, contact_name):
        """Chat/Kontakt suchen und öffnen"""
        print(f"🔍 Suche nach Chat: '{contact_name}'...")
        
        try:
            # Suche-Box finden und Kontakt eingeben
            search_box = self.wait.until(
                EC.element_to_be_clickable((By.XPATH, "//div[@contenteditable='true'][@data-tab='3']"))
            )
            
            # Suche leeren und neuen Namen eingeben
            search_box.clear()
            search_box.send_keys(contact_name)
            time.sleep(2)  # Kurz warten für Suchergebnisse
            
            # Ersten Treffer anklicken
            try:
                first_result = self.wait.until(
                    EC.element_to_be_clickable((By.XPATH, "//div[@data-testid='cell-frame-container'][1]"))
                )
                first_result.click()
                print(f"✅ Chat '{contact_name}' gefunden und geöffnet!")
                time.sleep(2)  # Chat laden lassen
                return True
            except TimeoutException:
                print(f"❌ Kontakt '{contact_name}' nicht gefunden!")
                return False
                
        except Exception as e:
            print(f"❌ Fehler beim Chat suchen: {e}")
            return False
    
    def send_message(self, message):
        """Nachricht in aktuellen Chat senden"""
        print("📝 Nachricht wird gesendet...")
        
        try:
            # Nachrichten-Box finden
            message_box = self.wait.until(
                EC.element_to_be_clickable((By.XPATH, "//div[@contenteditable='true'][@data-tab='10']"))
            )
            
            # Nachricht eingeben (Zeilenumbrüche beibehalten)
            lines = message.split('\n')
            for i, line in enumerate(lines):
                message_box.send_keys(line)
                if i < len(lines) - 1:  # Nicht nach letzter Zeile
                    message_box.send_keys(Keys.SHIFT + Keys.ENTER)
            
            # Senden (Enter drücken)
            message_box.send_keys(Keys.ENTER)
            
            print("✅ Nachricht erfolgreich gesendet!")
            time.sleep(2)  # Kurz warten für Bestätigung
            return True
            
        except Exception as e:
            print(f"❌ Fehler beim Senden: {e}")
            return False
    
    def send_urgent_notification(self, contact_name, task_title, wg_name="WG", sender="System"):
        """Komplette Alarm-Nachricht senden"""
        print(f"🚨 DRINGENDER ALARM für Task '{task_title}'")
        print(f"📱 Sende an: {contact_name}")
        
        # Nachricht zusammenstellen
        timestamp = time.strftime("%d.%m.%Y %H:%M")
        message = f"""🚨 *DRINGENDER TASK ALARM* 🚨

🏠 *{wg_name}*
📋 Task: *{task_title}*

⚠️ Dieser Task wurde als SEHR DRINGEND markiert!
👤 Markiert von: {sender}
⏰ Zeit: {timestamp}

📱 AKTION ERFORDERLICH:
Bitte kümmere dich schnellstmöglich um diesen Task!

💡 Weitere Details findest du in der WG-Putzplan-App.

_🤖 Automatisch generiert von der WG-Putzplan-App_"""
        
        # WhatsApp Web Workflow
        success = True
        
        if not self.setup_driver():
            return False
            
        if not self.open_whatsapp_web():
            success = False
        elif not self.find_chat(contact_name):
            success = False  
        elif not self.send_message(message):
            success = False
        
        # Browser offen lassen für Verifikation
        if success:
            print("🎉 ALARM-NACHRICHT ERFOLGREICH GESENDET!")
            print("✅ Browser bleibt 10 Sekunden geöffnet zur Verifikation...")
            time.sleep(10)
        else:
            print("❌ Fehler beim Senden der Alarm-Nachricht!")
            print("🔧 Browser bleibt zur manuellen Nachbearbeitung geöffnet...")
            time.sleep(30)
        
        return success
    
    def close(self):
        """WebDriver schließen"""
        if self.driver:
            self.driver.quit()
            print("🔒 Browser geschlossen.")

def main():
    """Hauptfunktion für Command Line Interface"""
    if len(sys.argv) < 3:
        print("📋 Verwendung: python whatsapp_automation.py <KONTAKT> <TASK>")
        print("📋 Beispiel: python whatsapp_automation.py 'WG Gruppe' 'Küche putzen'")
        return
    
    contact_name = sys.argv[1]
    task_title = sys.argv[2]
    wg_name = sys.argv[3] if len(sys.argv) > 3 else "WG"
    sender = sys.argv[4] if len(sys.argv) > 4 else "System"
    
    # Automation ausführen
    whatsapp = WhatsAppAutomation()
    try:
        success = whatsapp.send_urgent_notification(contact_name, task_title, wg_name, sender)
        sys.exit(0 if success else 1)
    finally:
        whatsapp.close()

if __name__ == "__main__":
    main()