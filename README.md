# 🏠 WG-Putzplan-App

Eine umfassende Progressive Web App für die Verwaltung von WG-Putzplänen mit intelligenter Punkteberechnung und WhatsApp-Integration.

## ✨ Features

### 🧮 **Neue Punkte-Formel**
```javascript
Punkte = (Minuten + (Minuten × Pain / 10)) × Wichtigkeit
```
- Intuitive Berechnung basierend auf Zeit, Aufwand und Wichtigkeit
- Automatische Anpassung an individuelle Bewertungen
- Persönlichkeitsbasierte Bewertungen für realistische Tests

### 📱 **Moderne PWA-Features**
- **Responsive Design** - Funktioniert auf allen Geräten
- **Offline-Funktionalität** - Vollständig nutzbar ohne Internet
- **Mobile-First** - Optimiert für Smartphone-Nutzung
- **Desktop-Support** - Auch auf größeren Bildschirmen nutzbar

### 🏠 **Profile-Management**
- **Multi-WG-Support** - Mehrere WG-Profile verwalten
- **Automatische Speicherung** - Alle Daten werden lokal gespeichert
- **Import/Export** - Profile sichern und wiederherstellen
- **Darius WG Preset** - Vorkonfiguriertes Beispielprofil

### 🚨 **Alert-System**
- **Dringende Aufgaben** - Rotes Alert-System für wichtige Tasks
- **WhatsApp-Integration** - Automatische Benachrichtigungen
- **Multi-Plattform** - Funktioniert auf allen Geräten
- **Automation Scripts** - Python-basierte WhatsApp-Automation

### 👥 **Erweiterte Verwaltung**
- **Temporäre Bewohner** - Besucher und Zwischenmieter verwalten
- **Abwesenheits-Management** - "Gone Fishing" System
- **Bewertungssystem** - Detaillierte Task-Qualitätsbewertungen
- **Punkteverteilung** - Faire Aufteilung der Hausarbeit

### 💾 **Backup & Recovery**
- **Auto-Backup** - Automatische Datensicherung
- **Crash-Detection** - Intelligente Wiederherstellung
- **Export-Funktionen** - JSON-basierte Datenexporte
- **Emergency Recovery** - Notfall-Wiederherstellung

## 🚀 **Schnellstart**

### 1. App öffnen
```bash
python -m http.server 8000
```
Dann öffnen: `http://localhost:8000/debug-demo.html`

### 2. Erstes Profil erstellen
- "Neues Profil erstellen" klicken
- WG-Name und Mitglieder eingeben
- Tasks anlegen und bewerten

### 3. Oder Beispiel laden
- "Darius WG laden" für vorkonfiguriertes Beispiel
- Bereits eingerichtete Tasks und realistische Bewertungen

## 📊 **Punkte-System**

### Bewertungsfaktoren:
- **⏰ Minuten** (5-120): Geschätzte Dauer der Aufgabe
- **😣 Pain/Aufwand** (1-10): Wie anstrengend ist die Aufgabe?
- **⭐ Wichtigkeit** (1-10): Wie wichtig ist die Aufgabe?

### Beispiel-Berechnung:
```
Badezimmer putzen:
- 40 Minuten
- Pain: 6 (ziemlich anstrengend)  
- Wichtigkeit: 8 (sehr wichtig)

Punkte = (40 + (40 × 6 / 10)) × 8
       = (40 + 24) × 8  
       = 64 × 8
       = 512 Punkte
```

## 📱 **WhatsApp-Integration**

### Automatische Benachrichtigungen:
```bash
# Manuelle WhatsApp-Automation
python whatsapp_automation.py "Max Mustermann" "Küche putzen" "Meine WG" "Anna"

# Universal-Script (funktioniert auf allen Geräten)
python whatsapp_universal.py "+491234567890" "🚨 Dringender Task: Badezimmer putzen!"
```

### Setup:
1. `pip install selenium webdriver-manager`
2. Beim ersten Mal: QR-Code scannen
3. Danach: Vollautomatisch!

## 🛠️ **Entwicklung**

### Struktur:
```
📁 WG-Putzplan-App/
├── 📄 debug-demo.html          # Haupt-App (Standalone)
├── 📄 index.html               # Alternative Version
├── 📁 whatsapp-scripts/        # WhatsApp-Automation
│   ├── 🐍 whatsapp_automation.py
│   ├── 🐍 whatsapp_universal.py
│   └── 🐍 whatsapp_hyper_automatik.py
├── 📄 README.md                # Diese Datei
└── 📄 .gitignore              # Git-Ausschlüsse
```

### Technologien:
- **Frontend**: Vanilla HTML/CSS/JavaScript
- **Storage**: Browser LocalStorage
- **Automation**: Python + Selenium
- **Design**: Mobile-First, PWA-Ready

## 🎯 **Roadmap**

### Geplante Features:
- [ ] **Cloud-Sync** - Profile über Geräte synchronisieren
- [ ] **Push-Notifications** - Browser-Benachrichtigungen
- [ ] **Gamification** - Achievements und Belohnungen
- [ ] **Statistics Dashboard** - Erweiterte Auswertungen
- [ ] **Multi-Language** - Internationale Unterstützung

### Verbesserungen:
- [ ] **Dark Mode** - Dunkles Theme
- [ ] **Custom Themes** - Personalisierbare Farben
- [ ] **Advanced Scheduling** - Intelligente Task-Planung
- [ ] **Team Features** - Gruppen-Challenges

## 🤝 **Beitragen**

Beiträge sind willkommen! Für größere Änderungen öffne bitte zuerst ein Issue.

## 📜 **Lizenz**

MIT License - Siehe LICENSE Datei für Details.

## 📞 **Support**

Bei Fragen oder Problemen:
- GitHub Issues für Bug-Reports
- Pull Requests für Verbesserungen
- Dokumentation in der App integriert

---

**Entwickelt mit ❤️ für stressfreie WG-Organisation**