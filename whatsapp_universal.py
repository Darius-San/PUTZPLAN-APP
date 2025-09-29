#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
🌐 Universelle WhatsApp-Integration für alle Geräte
Funktioniert auf Desktop, Tablet und Handy
"""

import sys
import time
import urllib.parse
import webbrowser
from pathlib import Path

def send_whatsapp_universal(phone_number, message):
    """
    Universelle WhatsApp-Integration für alle Geräte
    - Desktop: WhatsApp Web mit automatischen Tricks
    - Tablet/Mobile: Direkte App-Integration
    """
    
    print(f"🚀 Universeller WhatsApp-Versand")
    print(f"📞 Ziel: {phone_number}")
    print(f"📝 Nachricht: {message[:50]}...")
    
    # URL für verschiedene Plattformen erstellen
    encoded_message = urllib.parse.quote(message)
    
    # WhatsApp Web URL (funktioniert überall)
    web_url = f"https://web.whatsapp.com/send?phone={phone_number}&text={encoded_message}"
    
    # wa.me URL (universell, funktioniert auf allen Geräten)
    universal_url = f"https://wa.me/{phone_number}?text={encoded_message}"
    
    print(f"🌐 Öffne WhatsApp...")
    
    # Versuche verschiedene URLs
    try:
        # Methode 1: wa.me (am universellsten)
        webbrowser.open(universal_url)
        print("✅ WhatsApp wird über wa.me geöffnet (funktioniert auf allen Geräten)")
        
        # Kurz warten
        time.sleep(2)
        
        # Methode 2: Zusätzlich WhatsApp Web als Fallback
        webbrowser.open(web_url)
        print("✅ WhatsApp Web als zusätzliche Option geöffnet")
        
        return True
        
    except Exception as e:
        print(f"❌ Fehler beim Öffnen: {e}")
        return False

def main():
    if len(sys.argv) < 3:
        print("📋 Verwendung: python whatsapp_universal.py <TELEFONNUMMER> <NACHRICHT>")
        print("📋 Beispiel: python whatsapp_universal.py '+491724620111' 'Hallo WhatsApp!'")
        sys.exit(1)
    
    phone_number = sys.argv[1]
    message = sys.argv[2]
    
    success = send_whatsapp_universal(phone_number, message)
    
    if success:
        print("🎉 WhatsApp erfolgreich geöffnet!")
        print("📱 Auf Desktop: WhatsApp Web")
        print("📱 Auf Tablet/Handy: WhatsApp App")
        print("✅ Nachricht ist automatisch eingefügt - einfach senden!")
    else:
        print("❌ Fehler beim Öffnen von WhatsApp")

if __name__ == "__main__":
    main()