# Debug Mode

Der Debug Mode bietet schnelle Hilfsaktionen für Entwicklung & manuelles Testen.

## Aktivierung
- UI Toggle: Button mit `data-testid="toggle-debug-mode"` (nur in der Profilübersicht sichtbar, nicht mehr auf dem Dashboard).
- URL Hash: Seite mit `#debug` laden (z.B. `http://localhost:5173/#debug`) – aktiviert Debug Mode automatisch beim Mount.

## Verfügbare Buttons / Features
- Demo Task Prefill (`data-testid="debug-prefill-task"`): Legt einmalig den Task "Demo Schnell-Task" an (idempotent; mehrfacher Klick erzeugt keine Duplikate).
- Auto-Rate Alle (`data-testid="debug-auto-rate"`): Generiert deterministische Ratings für alle Mitglieder & Tasks; markiert alle Karten als "Fertig".
- Auto-Rate Mitglied (`data-testid="debug-auto-rate-member"`): Auf der Mitglieder-Bewertungsseite; füllt alle Ratings für dieses eine Mitglied.

## Testabdeckung
Folgende Tests verifizieren Debug Mode:
- `debugMode.test.tsx`: Toggle, Prefill Idempotenz, Globales Auto-Rating, Mitglied Auto-Rating.
- `debugHash.test.tsx`: Automatische Aktivierung via `#debug` Hash.

## Architektur-Hinweise
- Zustand liegt im `dataManager` als Flag `debugMode` (persistiert in localStorage Snapshot).
- Hash-Aktivierung läuft einmal in `App` über einen `useEffect`.
- Idempotenz sichergestellt durch Lookup des Task Titels vor Anlage.

## Erweiterungsvorschläge (Optional)
- Kleiner Dev-Panel (Modal) für kombinierte Aktionen.
- Reset-Button für Demo-Daten (`seedDemoData({ force: true })`).
- Visibility Guard für Produktions-Builds (ENV Check).
