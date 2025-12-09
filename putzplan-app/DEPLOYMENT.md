# Putzplan App - Server Deployment

## 🚀 Setup für Raspberry Pi / Server-Deployment

Die App kann jetzt in zwei Modi betrieben werden:

### 1. LocalStorage-Modus (Standard)
- Daten werden im Browser gespeichert
- Für lokale Entwicklung
- Jeder Browser hat seine eigenen Daten

### 2. Server-Modus
- Daten werden auf dem Server gespeichert
- Für Tablet/Multi-Device-Zugriff
- Gemeinsame Daten zwischen allen Geräten

## 📋 Installation auf Raspberry Pi

### 1. Repository klonen
```bash
git clone <repository-url>
cd putzplan-app
```

### 2. Dependencies installieren
```bash
npm install
```

### 3. App für Produktion bauen
```bash
npm run build
```

### 4. Server starten
```bash
# Mit Server-Modus
npm run start

# Oder für Development (mit Datei-Überwachung)
npm run dev:server
```

## 🌐 Netzwerk-Zugriff einrichten

### Option A: Vite Dev-Server (Development)
```bash
# Server für Netzwerk-Zugriff starten
npm run dev -- --host

# Dann erreichbar unter:
# http://[PI-IP]:5173
```

### Option B: Production Server
```bash
# App bauen und Server starten
npm run start

# Server läuft standardmäßig auf Port 5173
# Erreichbar unter: http://[PI-IP]:5173
```

### Option C: Custom Port
```bash
# Mit anderem Port
PORT=3000 npm run start

# Dann erreichbar unter:
# http://[PI-IP]:3000
```

## ⚙️ Konfiguration

### Server-Modus aktivieren
Erstelle `.env.local` Datei:
```bash
VITE_STORAGE_MODE=server
VITE_DEBUG=true
```

Oder verwende vorgefertigte Konfiguration:
```bash
cp .env.server .env.local
```

### LocalStorage-Modus (Standard)
```bash
cp .env .env.local
```

## 📁 Daten-Speicherung

Im Server-Modus werden Daten gespeichert in:
- `data/putzplan-data.json` - Hauptdaten (WGs, Benutzer, Aufgaben)
- `data/putzplan-settings.json` - App-Einstellungen

### Backup erstellen
```bash
# Daten-Ordner sichern
tar -czf putzplan-backup-$(date +%Y%m%d).tar.gz data/
```

### Daten wiederherstellen
```bash
# Backup entpacken
tar -xzf putzplan-backup-20251103.tar.gz
```

## 🔧 Troubleshooting

### Server startet nicht
```bash
# Port prüfen
netstat -tulpn | grep :5173

# Prozess beenden falls nötig
pkill -f "node.*server.js"
```

### Netzwerk-Zugriff funktioniert nicht
```bash
# IP-Adresse des Pi herausfinden
hostname -I

# Firewall prüfen (falls vorhanden)
sudo ufw status
sudo ufw allow 5173
```

### Daten gehen verloren
- Im Server-Modus: Prüfe `data/` Ordner
- Im LocalStorage-Modus: Browser-Cache geleert

## 📱 Tablet-Zugriff

1. Stelle sicher, dass Pi und Tablet im gleichen WLAN sind
2. Finde Pi IP-Adresse: `hostname -I`
3. Öffne auf Tablet: `http://[PI-IP]:5173`
4. App als PWA installieren (Optional)

## 🔄 Automatischer Start

### Systemd Service erstellen
```bash
sudo nano /etc/systemd/system/putzplan.service
```

Inhalt:
```ini
[Unit]
Description=Putzplan App
After=network.target

[Service]
Type=simple
User=pi
WorkingDirectory=/home/pi/putzplan-app
ExecStart=/usr/bin/npm run start
Restart=always
RestartSec=10
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
```

Service aktivieren:
```bash
sudo systemctl enable putzplan
sudo systemctl start putzplan
sudo systemctl status putzplan
```

## 📊 Monitoring

### Server-Status prüfen
```bash
# Läuft der Service?
sudo systemctl status putzplan

# Logs anzeigen
sudo journalctl -u putzplan -f

# CPU/RAM Verbrauch
htop
```

### Daten-Synchronisation prüfen
- Browser-Konsole öffnen
- Nach "📡" und "💾" Nachrichten suchen
- Sync-Status im Debug-Modus verfügbar

## 🛠️ Entwicklung

### LocalStorage zu Server migrieren
1. Exportiere Daten aus Browser (zukünftige Funktion)
2. Starte Server-Modus
3. Importiere Daten (zukünftige Funktion)

### Server-Code anpassen
- `server.js` - Express Server
- `src/services/serverDataManager.ts` - Client-seitige Server-Kommunikation
- `src/config/appConfig.ts` - Konfiguration