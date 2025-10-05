# Legacy Analysis Artifacts

Dieser Ordner enthält generierte Artefakte aus dem Scan der alten Debug-Demo (reines HTML + inline JS).

Geplante Dateien:
- `sitemap.json` – Struktur der Seite (Sections, Tables, Buttons)
- `widgets.json` – Abgeleitete Widget-Typen
- `flows/*.json` – Event-Flows (optional in zweitem Schritt)

Workflow:
1. `npm run scan:legacy` ausführen
2. `sitemap.json` prüfen → Mapping in `MIGRATION.md` ergänzen
3. Komponenten-Stubs gemäß Mapping erstellen

Hinweis: Scan arbeitet read-only – die Debug-Demo selbst wird nicht verändert.
