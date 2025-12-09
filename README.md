# 🏠 WG-Putzplan-App

Eine umfassende Web App für die Verwaltung von WG-Putzplänen mit intelligenter Punkteberechnung und WhatsApp-Integration.

## 🚀 Schnellstart

### 1. Voraussetzungen
- Docker Desktop muss laufen
- Node.js installiert
- PowerShell Terminal

### 2. App starten (Reihenfolge wichtig!)

```powershell
# 1. In das Projekt-Verzeichnis wechseln
cd "d:\Daten\3-PROJECTS\5-PUTZPLAN"

# 2. WAHA Container starten (WhatsApp API)
docker-compose up -d

# 3. Prüfen dass der RICHTIGE Container läuft
docker ps
# Sollte zeigen: 5-putzplan-waha-1 (NICHT 7-whatsapp_answer-waha-1!)

# 4. Backend Server starten
cd putzplan-app
node server.js

# 5. App öffnen
# http://localhost:5175
```

## ⚠️ Wichtige Container-Info

### ✅ RICHTIGER Container:
- **Name**: `5-putzplan-waha-1`
- **Projekt**: `5-PUTZPLAN`
- **API-Key**: `96ee37b1f3424e819e7a20dcfe0f6fee`
- **Sessions Pfad**: `D:\Daten\3-PROJECTS\5-PUTZPLAN\sessions`

### ❌ FALSCHER Container (falls läuft, stoppen!):
- **Name**: `7-whatsapp_answer-waha-1`
- **Projekt**: `7-WHATSAPP_ANSWER`
- **API-Key**: `5ddfb29826214b6096dc90e3217fe97d`

```powershell
# Falschen Container stoppen falls er läuft:
docker stop 7-whatsapp_answer-waha-1
```

## 🔧 Problemlösung

### Problem: "app öffnet nicht"
```powershell
# Backend Server Status prüfen
netstat -ano | findstr :5175

# Falls nichts zurückkommt, Backend neu starten:
cd putzplan-app
node server.js
```

### Problem: "WAHA API Timeout"
```powershell
# WAHA Container Status prüfen
docker ps | findstr waha

# WAHA Sessions prüfen
Invoke-WebRequest -Uri "http://localhost:3000/api/sessions" -Method GET -Headers @{"X-Api-Key"="96ee37b1f3424e819e7a20dcfe0f6fee"}

# Falls Sessions leer [], neue Session erstellen:
Invoke-WebRequest -Uri "http://localhost:3000/api/sessions/default/start" -Method POST -Headers @{"X-Api-Key"="96ee37b1f3424e819e7a20dcfe0f6fee"; "Content-Type"="application/json"} -Body '{"name":"default","config":{"engine":"WEBJS"}}'
```

### Problem: "401 Unauthorized"
Das bedeutet der falsche WAHA Container läuft. Siehe "FALSCHER Container" oben.

## � WhatsApp Integration

### Session einrichten (nur beim ersten Mal):
1. WAHA Dashboard öffnen: http://localhost:3000/dashboard
   - Username: `admin`
   - Password: `b7b8d887f20047f89f0d9998cdc1bd8a`
2. Session "default" erstellen
3. QR-Code mit WhatsApp scannen
4. Session wird automatisch gespeichert (kein erneutes Scannen nötig)

## 🏠 App URLs

- **Putzplan App**: http://localhost:5175
- **WAHA Dashboard**: http://localhost:3000/dashboard
- **Backend API**: http://localhost:5175/api

## 📂 Wichtige Dateien

- **Docker Config**: `docker-compose.yaml`
- **Backend Server**: `putzplan-app/server.js`
- **WAHA Config**: `.env`
- **Sessions (persistent)**: `sessions/`
- **Media (persistent)**: `media/`

## � Container Management

```powershell
# Container Status prüfen
docker ps

# WAHA Logs ansehen
docker logs 5-putzplan-waha-1

# Container neu starten
docker-compose restart

# Container stoppen
docker-compose down

# Container mit Logs starten
docker-compose up
```

## ✅ Erfolgreich gestartet wenn:

1. ✅ `docker ps` zeigt: `5-putzplan-waha-1`
2. ✅ Backend zeigt: `🚀 Putzplan Server running on http://0.0.0.0:5175`
3. ✅ WAHA Sessions nicht leer: `[{"name":"default","status":"WORKING",...}]`
4. ✅ App öffnet sich unter: http://localhost:5175

## ✨ Features

### 🧮 **Intelligente Punkte-Formel**
```javascript
Punkte = (Minuten + (Minuten × Pain / 10)) × Wichtigkeit
```

### 📱 **Moderne React PWA**
- **Responsive Design** - Funktioniert auf allen Geräten
- **Offline-Funktionalität** - Vollständig nutzbar ohne Internet
- **Mobile-First** - Optimiert für Smartphone-Nutzung
- **Real-time Updates** - Live Synchronisation

### 📱 **WhatsApp Integration (WAHA)**
- **Hot Task Benachrichtigungen** - Sofortige WhatsApp-Nachrichten für dringende Aufgaben
- **Automatische Session-Persistenz** - QR-Code nur einmal scannen
- **Status-Monitoring** - Automatische Überwachung der WhatsApp-Verbindung
- **Test-Panel** - WhatsApp-Nachrichten direkt aus der App testen

### 🏠 **Erweiterte WG-Verwaltung**
- **Multi-Member Support** - Mehrere WG-Mitglieder verwalten
- **Abwesenheits-Management** - "Gone Fishing" System mit Benachrichtigungen
- **Temporäre Bewohner** - Besucher und Zwischenmieter einbeziehen
- **Bewertungssystem** - Detaillierte Task-Qualitätsbewertungen

### � **Hot Task System**
- **Dringende Aufgaben markieren** - Rotes Alert-System
- **WhatsApp-Benachrichtigungen** - Automatische Nachrichten an alle Mitglieder
- **Status-Tracking** - Übersicht über alle aktiven Hot Tasks
- **Cooldown-System** - Verhindert Spam-Benachrichtigungen

### 💾 **Persistente Datenhaltung**
- **Backend-Speicherung** - Sichere Datenhaltung auf dem Server
- **Auto-Backup** - Automatische Datensicherung
- **Session-Persistenz** - WhatsApp bleibt verbunden
- **Crash-Recovery** - Intelligente Wiederherstellung

## 🆘 Support

Bei Problemen:
1. Prüfe dass Docker Desktop läuft
2. Prüfe dass der richtige Container läuft (`5-putzplan-waha-1`)
3. Prüfe dass eine WhatsApp Session aktiv ist
4. Starte Backend Server neu

---
*Letzte Aktualisierung: 5. November 2025*