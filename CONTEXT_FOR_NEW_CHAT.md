# Kontext & aktueller Projektstand — PUTZPLAN

> Diese Datei ist dazu gedacht, als Startkontext in einem neuen Chat eingeführt zu werden. Sie fasst die Architektur, die zuletzt vorgenommenen Änderungen, den aktuellen Status, offene Aufgaben, wichtige Orte im Code und Anweisungen zum Starten/Untersuchen zusammen.

**Projektübersicht**
- **Name:** Putzplan (PUTZPLAN-APP)
- **Stack:** React + TypeScript (Vite), Zustand-ähnlicher Custom-Store (`usePutzplanStore`), lokale Persistenz (localStorage / dataManager), Recharts, Framer Motion.
- **Ziel:** Verwaltung von WG-Aufgaben / Perioden (Zeiträume), Tasks, Ausführungen (executions) und Team-Analytics.

**Repository / Arbeitsverzeichnis**
- Workspace root: `d:\Daten\3-PROJECTS\5-PUTZPLAN`
- Wichtigste App: `putzplan-app/` (React + Vite)
- Skripte / Hilfsprogramme: `scripts/` und `putzplan-app/scripts/`

**Kurz: Was wurde zuletzt gemacht**
- Perioden (Zeiträume) wurden in mehreren Komponenten vereinheitlicht: Normalisierung, Kurz-Label (`TT.MM – TT.MM`) und Deduplizierung.
- UI-Verbesserungen:
  - "Dashboard" wurde zu "Statistics" / Team Analytics (UI-Textänderungen).
  - Zeitraum-Reiter zeigen nun Kurz-Label im Format `TT.MM – TT.MM`.
  - Active Periods sind immer ausgeklappt und hervorgehoben; historische Perioden können ein-/ausgeblendet werden.
  - Erzeugung neuer Perioden zeigt Overlap-Warnungen und deaktiviert Submit bei Überschneidungen.
  - Back-Button und Styling konsolidiert.
- Data-layer (authoritative) Änderungen in `dataManager`:
  - Overlap-Prüfungen beim Erstellen/Setzen von Perioden (`createAnalyticsPeriod`, `setCustomPeriod`) — neue Perioden, die mit vorhandenen Perioden überlappen, werden jetzt verhindert und werfen Fehler.
  - Methoden `saveStateForPeriod(periodId)` und `loadStateForPeriod(periodId)` eingeführt: Snapshots von Tasks/Executions werden pro Periode persistiert und beim Wechsel geladen.
  - `deletePeriod` wurde erweitert, sodass eine Periode wirklich aus Analytics und allen WG-Auflistungen entfernt wird.
  - `purgeDuplicatePeriodsForCurrentWG()` und ein `cleanupOverlappingPeriods`-Hilfsfunktions-Set wurden hinzugefügt (für Migration/Cleanup).
- Analytics (`AnalyticsPage`) Änderungen:
  - Analytics liest historische Perioden direkt aus dem Store via `getHistoricalPeriods()` und verwendet Normalisierung (`periodUtils`) + Dedupe.
  - Dedupe-Logik angepasst: jetzt primär nach Start/End-Datum dedupliziert und bevorzugt aktive/live Perioden bei Konflikten.
  - Debug-Features: `?debug=true` oder Hash `#debug` erzeugt Debug-Perioden; außerdem ein `compare=true`-Flag für Vergleichsansicht.
- Tools / Skripte:
  - `scripts/cleanup_periods.ts` und `putzplan-app/scripts/run_cleanup.ts` wurden erstellt, um automatisierte Cleanup/Migrationen durchzuführen — das Ausführen scheiterte lokal aufgrund ESM / Modulauflösungsproblemen.

**Wichtige Dateien (Übersicht)**
- `putzplan-app/src/services/dataManager.ts` — zentrale Persistenz- / Geschäftslogik (wichtig für period-bezogene Authorität).
- `putzplan-app/src/components/period/periodUtils.ts` — Normalisierung & `formatShortLabel(period)` (TT.MM – TT.MM).
- `putzplan-app/src/components/period/PeriodSelection.tsx` — Auswahl UI der Perioden (Highlight, Radios, Dedupe by id aktuell).
- `putzplan-app/src/components/period/PeriodCreation.tsx` — Periodenerstellung, Overlap-Warnungen.
- `putzplan-app/src/components/period/PeriodSettings.tsx` — Einstellungen / Save/Load-Integration per Periode.
- `putzplan-app/src/components/analytics/AnalyticsPage.tsx` — Team Analytics; Chart + Verlauf + Perioden-Übersicht.
- `scripts/cleanup_periods.ts`, `putzplan-app/scripts/run_cleanup.ts` — lokale Cleanup-/Migration-Skripte (Vorsicht: ESM-Auflösungsprobleme möglich).

**Letzte Fehler / Blocker und Hinweise**
- Persistierte doppelte/überschneidende Perioden sind bereits im lokalen Store vorhanden und verursachen:
  - React-Warnung: "Encountered two children with the same key..." (duplizierte Period-IDs oder gleiche Daten mit unterschiedlichen IDs).
  - Analytics zählte teils mehr Perioden als die Perioden-Verwaltung (Zeiträume) zeigte.
- Der automatische Cleanup-Skript-Versuch produzierte ESM / Modulauflösungsfehler beim Import der internen `dataManager`-Module. Grund: lokale Skripte müssen mit der App-Build-Umgebung kompatibel sein oder als Node-Skript mit korrekten Pfaden/Extensions ausgeführt werden.

**Aktueller Zustand (Stand: 10.12.2025)**
- Funktional:
  - Overlap-Prüfung: aktiv beim Erstellen/Setzen von Perioden.
  - UI: Periodenauswahl, Analytics-Rendering, Debug-Modi, Periode-spezifische Snapshots (save/load) implementiert.
- Teilweise / offen:
  - Persistierte Duplikate müssen bereinigt werden (in-app Purge-Button vorhanden; automatisches Skript noch nicht verlässlich ausführbar).
  - `PeriodSelection` dedupliziert aktuell nach ID; `AnalyticsPage` dedupliziert jetzt nach Datum (start/end). Empfehlung: beide auf dieselbe Dedupe-Strategie bringen (start/end) für vollständige Parität.
  - Entscheidung zu Lösch-Policy: Der Code löscht Perioden global (auch aus Analytics), aber UI/Bestätigung/Preview können noch verfeinert werden.

**Empfohlene nächste Schritte**
- Kurzfristig (sofort):
  - App neu laden und per UI die `Purge duplicates`-Funktion in den `Zeiträume` Einstellungen ausführen, um die lokal vorhandenen Duplikate zu bereinigen.
  - In `Analytics` prüfen, ob die Perio­den-Anzahl jetzt mit `Zeiträume` übereinstimmt.
- Mittelfristig:
  - `PeriodSelection` auf die gleiche Dedupe-by-date-Strategie umstellen.
  - Falls gewünscht: Skript für lokalen Migrationslauf anpassen (Node ESM Pfade, `.ts` zu `.js` Transpilation, oder in `putzplan-app` ein kleines Vite-run Script schreiben, das `dataManager` ausführt).
- Entscheidungsfragen für dich:
  - Sollen wir `PeriodSelection` sofort anpassen, damit beide Darstellungen identisch deduplizieren?
  - Möchtest du, dass ich das Cleanup-Skript so anpasse, dass es zuverlässig auf deiner lokalen Windows-Dev-Umgebung läuft (PowerShell-kompatibel)?

**Wie man lokal startet / nützliche Befehle**
- Wechsel in das App-Verzeichnis:

```powershell
cd 'D:\Daten\3-PROJECTS\5-PUTZPLAN\putzplan-app'
```

- Dev-Server starten (Vite):

```powershell
npm install          # falls nicht installiert
npm run dev -- --host --port 5173
```

- Tests (falls benötigt):

```powershell
npm run test         # oder: npm run vitest
```

**Bekannte Hotspots (wo man zuerst gucken sollte)**
- Perioden-Logik & Persistenz: `putzplan-app/src/services/dataManager.ts`
- Perioden-UI: `putzplan-app/src/components/period/` (insb. `PeriodSelection.tsx`, `PeriodSettings.tsx`, `PeriodCreation.tsx`, `periodUtils.ts`)
- Analytics-UI: `putzplan-app/src/components/analytics/AnalyticsPage.tsx`

**Beispiel: Wie du schnell überprüfen kannst, ob Duplikate existieren**
1. Öffne DevTools -> Console
2. In der App (Zeiträume), klicke auf die Debug/Purge-Button (falls sichtbar) oder führe in der Console:

```javascript
// In Console ausführen (nur zur Diagnose)
const wg = window.__PUTZPLAN__?.currentWG || null;
console.log('WG periods', wg?.periods?.length, wg?.historicalPeriods?.length);
```

Hinweis: Die App loggt intern viele Debug-Nachrichten bei `AnalyticsPage` (z. B. `📊 [Analytics]`), die helfen, Diskrepanzen nachzuvollziehen.

**Wenn du diese Datei als Chat-Kontext nutzen willst**
- Kopiere die Datei `CONTEXT_FOR_NEW_CHAT.md` oder gib sie beim Start eines neuen Chats als Kontext- oder System-Prompt-Inhalt an.
- Der neue Chat hat dann alle relevanten Informationen über Architektur, letzte Änderungen, offene Punkte und konkrete Suchen/Dateien, die geprüft werden sollten.

---

Wenn du willst, kann ich jetzt direkt:
- (A) `PeriodSelection` so anpassen, dass die Dedupe-Logik mit `AnalyticsPage` übereinstimmt (empfohlen), oder
- (B) das Cleanup-Skript anpassen, damit es zuverlässig auf Windows/Node (PowerShell) läuft und die Duplikate automatisch entfernt.

Sag mir, welche Option du bevorzugst — ich setze das dann gleich um.
