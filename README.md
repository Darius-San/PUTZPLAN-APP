# 🏠 WG-Putzplan-App

Eine umfassende (experimentelle) Web App für die Verwaltung von WG-Putzplänen mit intelligenter Punkteberechnung. (Ehemalige WhatsApp‑Automations wurden vollständig entfernt – siehe Abschnitt "Legacy Cleanup".)

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
- (Geplante) optionale Benachrichtigungen – aktuelle Version enthält keine externe Messaging-Automation mehr

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

## 🧹 Legacy Cleanup (Refactor 2025)

Im Rahmen einer umfassenden Bereinigung wurden zahlreiche historische / experimentelle Dateien entfernt, um den Kern der Demo zu verschlanken und Wartbarkeit zu erhöhen.

Entfernte Kategorien:

| Kategorie | Beispiele | Grund |
|-----------|-----------|-------|
| WhatsApp Automations (Python/JS/HTML/BAT) | `whatsapp_*.py`, `whatsapp_auto_send.*`, `whatsapp_vollautomatik*`, Batch-Skripte | Sicherheits-/Browser-Limits, außerhalb Scope der Kern-Demo |
| Test & Debug HTML Varianten | `clean-app.html`, `fixed-app.html`, `repaired-app.html`, `test-*.html`, `simple-test.html`, `ultra_test.html` | Redundante Entwicklungsartefakte |
| Minimal / Übergangs-Versionen | `putzplan_clean.html`, `putzplan-minimal.html`, `demo.html` | Ersetzt durch modularisierte `debug-demo.html` |
| Leere/Placeholder Dateien | `emergency-fix.js`, `app-legacy.js` | Keine Funktion mehr nötig |
| Session / Temp Daten | `whatsapp_session/` | Nicht mehr gebraucht |
| Spezifische README | `README_WhatsApp.md` | Inhalt obsolet / integriert hier |

Ziele der Bereinigung:
- Kleinere Codebase → schnelleres Onboarding
- Entfernen nicht mehr getesteter Skripte
- Fokus auf Kernfunktionalität (Profile, Tasks, Punkte, Abwesenheiten)
- Vorbereitung auf zukünftige Modularisierung / evtl. API-Anbindung

Falls du ältere Automations benötigst: nutze Git-History (Commit vor Cleanup) oder implementiere eine eigene Integrationsschicht außerhalb dieses Repos.

Hinweis: Verweise auf entfernte Dateien in alten Blogposts / Snippets sind bewusst nicht mehr gültig.

## 🛠️ **Entwicklung**

### Struktur (vereinfacht):
```
📁 WG-Putzplan-App/
├── 📄 debug-demo.html          # Haupt-App (Standalone)
├── 📄 index.html               # Alternative Version
├── 📁 assets/                  # Ausgelagerte CSS/JS
├── 📄 README.md                # Diese Datei
└── 📄 .gitignore               # Git-Ausschlüsse
```

### Technologien:
- **Frontend**: Vanilla HTML/CSS/JavaScript
- **Storage**: Browser LocalStorage
- **Design**: Mobile-First, PWA-orientiert (Basis)

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