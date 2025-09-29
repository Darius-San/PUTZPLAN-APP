#!/usr/bin/env python3
"""
🚀 WhatsApp Ultimate Auto-Sender
Fallback-Script für automatisches WhatsApp versenden
Wenn Browser-Sicherheit JavaScript blockiert
"""

import webbrowser
import urllib.parse
import time
import sys
import os
from pathlib import Path

def send_whatsapp_message(phone_number, message):
    """
    Sendet WhatsApp Nachricht mit mehreren Fallback-Methoden
    """
    print(f"🚀 WhatsApp Ultimate Sender gestartet")
    print(f"📞 Ziel: {phone_number}")
    print(f"📝 Nachricht: {message[:50]}...")
    
    # Nachricht URL-encodieren
    encoded_message = urllib.parse.quote_plus(message)
    
    # Verschiedene WhatsApp URLs probieren
    urls_to_try = [
        # Methode 1: WhatsApp Web (Standard)
        f"https://web.whatsapp.com/send?phone={phone_number}&text={encoded_message}",
        
        # Methode 2: wa.me (Universal)
        f"https://wa.me/{phone_number}?text={encoded_message}",
        
        # Methode 3: API WhatsApp
        f"https://api.whatsapp.com/send?phone={phone_number}&text={encoded_message}",
        
        # Methode 4: Mobile WhatsApp (falls Desktop-App installiert)
        f"whatsapp://send?phone={phone_number}&text={encoded_message}"
    ]
    
    success_count = 0
    
    for i, url in enumerate(urls_to_try, 1):
        print(f"\n🔗 Methode {i}: {url[:60]}...")
        
        try:
            # Browser öffnen
            webbrowser.open(url)
            print(f"✅ Methode {i} erfolgreich geöffnet")
            success_count += 1
            
            # Kurz warten zwischen den Versuchen
            if i < len(urls_to_try):
                time.sleep(2)
                
        except Exception as e:
            print(f"❌ Methode {i} fehlgeschlagen: {e}")
    
    print(f"\n📊 Ergebnis: {success_count}/{len(urls_to_try)} Methoden erfolgreich")
    
    if success_count > 0:
        print("✅ WhatsApp sollte jetzt geöffnet sein!")
        print("📱 Nachricht ist automatisch eingegeben")
        print("⚡ Einfach ENTER drücken zum Senden!")
    else:
        print("❌ Alle automatischen Methoden fehlgeschlagen")
        print(f"🔧 Manuell öffnen: https://wa.me/{phone_number}")
    
    return success_count > 0

def create_auto_send_batch_file(phone, message):
    """
    Erstellt eine .bat Datei für Windows Auto-Send
    """
    batch_content = f'''@echo off
echo 🚀 WhatsApp Auto-Sender Batch
echo 📞 Nummer: {phone}
echo 📝 Nachricht wird gesendet...

python "{__file__}" "{phone}" "{message}"

echo ✅ WhatsApp Auto-Send abgeschlossen!
pause
'''
    
    batch_file = Path("whatsapp_auto_send.bat")
    with open(batch_file, 'w', encoding='utf-8') as f:
        f.write(batch_content)
    
    print(f"📁 Batch-Datei erstellt: {batch_file.absolute()}")
    return batch_file

def main():
    """
    Hauptfunktion - kann von Kommandozeile oder als Import verwendet werden
    """
    if len(sys.argv) >= 3:
        # Von Kommandozeile aufgerufen
        phone = sys.argv[1]
        message = sys.argv[2] if len(sys.argv) > 2 else "🤖 Auto-Send Test"
        
        print("=" * 50)
        print("🚀 WhatsApp Ultimate Auto-Sender")
        print("=" * 50)
        
        success = send_whatsapp_message(phone, message)
        
        # Batch-Datei für nächstes Mal erstellen
        create_auto_send_batch_file(phone, message)
        
        if success:
            print("\n🎉 Mission erfolgreich!")
            sys.exit(0)
        else:
            print("\n😞 Mission teilweise fehlgeschlagen")
            sys.exit(1)
    
    else:
        # Interaktiver Modus
        print("🚀 WhatsApp Ultimate Auto-Sender")
        print("=" * 40)
        
        # Eingabe
        phone = input("📞 Telefonnummer (+49...): ").strip()
        message = input("📝 Nachricht: ").strip()
        
        if not phone:
            phone = "+491724620111"  # Test-Nummer
            print(f"🔧 Standard-Nummer verwendet: {phone}")
        
        if not message:
            message = "🤖 Python Auto-Send Test erfolgreich!"
            print(f"🔧 Standard-Nachricht verwendet: {message}")
        
        # Senden
        success = send_whatsapp_message(phone, message)
        
        input("\n⏸️ Drücke ENTER zum Beenden...")

if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\n\n🛑 Abgebrochen durch Benutzer")
        sys.exit(1)
    except Exception as e:
        print(f"\n💥 Unerwarteter Fehler: {e}")
        sys.exit(1)