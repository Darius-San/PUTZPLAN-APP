# 📋 WhatsApp Automation Setup & Installation

## 🚀 Installation

### 1. Python Dependencies installieren:
```bash
pip install selenium webdriver-manager
```

### 2. ChromeDriver automatisch installieren:
```bash
pip install webdriver-manager
```

## 📱 Verwendung

### Command Line:
```bash
# Einzelperson benachrichtigen
python whatsapp_automation.py "Max Mustermann" "Küche putzen" "Meine WG" "Darius"

# Gruppe benachrichtigen  
python whatsapp_automation.py "WG Gruppe" "Badezimmer putzen" "WG Berlin" "System"
```

### Aus der PWA heraus:
Das Script wird automatisch von der App aufgerufen wenn Sie den Alarm-Button verwenden.

## 🔧 Features

✅ **Vollautomatisch**: Öffnet WhatsApp Web, findet Chat, sendet Nachricht
✅ **Session-Persistenz**: Bleibt angemeldet zwischen Verwendungen  
✅ **Robuste Suche**: Findet Kontakte und Gruppen zuverlässig
✅ **Error Handling**: Behandelt Login-Timeouts und fehlende Kontakte
✅ **Multi-Line Messages**: Erhält Nachrichtenformatierung bei
✅ **Verifikation**: Browser bleibt kurz offen zur Bestätigung

## 🛡️ Sicherheit

- Verwendet Ihr existierendes WhatsApp Web Login
- Keine Credentials oder API-Keys erforderlich
- Funktioniert nur wenn Sie bereits bei WhatsApp Web angemeldet sind
- Browser-Profil wird lokal gespeichert für persistente Sessions

## 🐛 Troubleshooting

**ChromeDriver Fehler**:
```bash
# ChromeDriver manuell installieren
pip install webdriver-manager
```

**QR Code wird angezeigt**:
- Einmal mit Handy scannen, danach bleibt die Session aktiv

**Kontakt nicht gefunden**:
- Exakten Namen verwenden wie er in WhatsApp angezeigt wird
- Bei Gruppen: Vollständiger Gruppenname erforderlich

## 🔄 Integration mit PWA

Die App ruft das Script automatisch auf:
1. Alarm-Button klicken
2. Task auswählen  
3. Kontakt/Gruppe eingeben
4. Script läuft automatisch im Hintergrund
5. Nachricht wird gesendet