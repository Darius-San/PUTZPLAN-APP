# App Struktur & Navigations- / Feature-Übersicht

> Laufend wachsendes Dokument zur Dokumentation der aktuell vorhandenen Screens, Navigationsphasen und funktionalen Parität vs. Legacy `debug-demo.html`.

## 1. Navigations-Phasen (State Machine Sicht)

| Phase | Beschreibung | Eintritts-Kriterium | Exit-Kriterium |
|-------|--------------|---------------------|----------------|
| `profiles` | Start-/Landing-Screen mit WG Übersicht | Kein `currentUser` gesetzt | Auswahl WG -> `app`, "Neue WG erstellen" -> `wg-create` |
| `wg-create` | Neuer WG Erstellungs-Wizard (mehrstufig) | Button "Neue WG erstellen" | Fertigstellen -> WG + User erzeugt -> `app`, Abbrechen -> `profiles` |
| `setup` | (Alt / Einzelprofil SetupWizard – aktuell de-priorisiert) | `currentUser` gesetzt aber keine WG | Abschluss Basissetup -> `app` |
| `app` | Dashboard & eigentliche Anwendung | WG + User vorhanden | Logout/Profilwechsel -> `profiles` |

## 2. Screens / Komponenten

| Screen / Komponente | Datei | Status | Kern-Funktionen |
|---------------------|-------|--------|-----------------|
| Profile Overview | `components/onboarding/ProfileOverview.tsx` | Aktiv | WG Karte, Mitglieder Badges, Navigiert in Dashboard, Start WG Creation |
| WG Creation Wizard | `components/wg/WGCreationWizard.tsx` | Aktiv (Basis) | Schritte: Name -> Größe -> Mitglieder -> Zusammenfassung, Validierung, Persistenz |
| Dashboard | `components/dashboard/Dashboard.tsx` | Aktiv (Teil-Parität) | Fortschritt, Pending Ratings Badge, Task-Vorschläge (rudimentär), ProgressBars-Proxy, RecentExecutions (Basis) |
| Progress Bars | `components/dashboard/progress/ProgressBars.tsx` | Platzhalter | Proxy für zukünftige kollaborative Ratings/Verteilungen |
| Task List Basic | `components/dashboard/TaskListBasic.tsx` | Übergang | Direkte Task-Ausführung (ersetzt später Matrix) |
| Setup Wizard (Legacy Einzelprofil) | `components/setup/SetupWizard.tsx` | Vorhanden aber sekundär | Ursprüngliche Onboarding-Stepper Logik (User/Tasks) |

## 3. Domain Modelle & State Layer

Erweitert um:
- `Absence`, `TemporaryResident`, `PostExecutionRating`, `PeriodInfo`
- Selektoren: Dringlichkeit (`isTaskUrgent`), Minimum-Intervall (`canExecuteTaskNow` + `nextEarliestExecutionDate`), `pendingRatingsCount`, `adjustedMonthlyTarget`, `temporaryResidentMultiplier`.
- Punkte-Multiplikator basierend auf aktiven temporären Bewohnern.
- Abwesenheits-Reduktion des Monatsziels (vereinfachte lineare Verteilung über Periodentage).

## 4. Seed Varianten

| Variante | Zweck | Details |
|----------|------|---------|
| `basic` | Minimal-Demo | Wenige Nutzer & Tasks, simpler Start |
| `darius` | Legacy-Parität | Repliziert Demo WG Darius (& deterministische Ausführungen & Personality Ratings) |

Determinismus: Hash-Funktion + deterministische Personen-"Persönlichkeit" generieren konsistente Ratings & Sample Executions.

## 5. Bereits umgesetzte Feature-Parität

- WG zentrierte Einstiegsperspektive (statt Einzelprofil-Liste)
- Pending Ratings Badge (post execution ratings Placeholder Mechanik)
- Grundlegende Task-Ausführung inkl. Punkteberechnung + Gästemultiplikator
- Abwesenheitsberechnung & Adjusted Target
- Temporäre Bewohner (Multiplier)
- Periodenermittlung (aktueller Monat) & Nutzung bei Zielanpassung

## 6. Offene Parität / Geplante Erweiterungen

| Bereich | ToDo | Geplanter Ansatz |
|---------|------|------------------|
| Recent Executions Parität | Click -> Rating Modal | Komponente `RecentExecutions` erweitern mit Inline Modal & Rating Speicherung (`postExecutionRatings`) |
| Task Matrix | Ersetzt `TaskListBasic` | Tabelle (Tasks Zeilen x Nutzer Spalten), Indikatoren: Overdue, MinInterval-Lock, letzte Ausführung, Buttons |
| Erweiterte Tests | Intervall / Overdue / Multiplikator / Absences | Vitest Testdateien ergänzen (`__tests__/parity*.test.tsx`) |
| Rating Flow | Post Execution Bewertungsdialog | UI Komponente + Storage via `rateExecution` |
| Notifications UI | Anzeigen & Mark As Read | Separate Panel/Drawer, bereits Datenmodell vorhanden |
| Docs Aktualisierung | `MIGRATION_PLAN.md` refresh | Abgleich mit diesem Dokument & nächste Milestones |

## 7. WG Creation Wizard – Validierungen

| Schritt | Validierung | Fehlermeldung |
|--------|-------------|---------------|
| Name | >= 3 & <= 40 Zeichen | "Name muss mindestens 3 Zeichen haben" / "Name zu lang (max 40)" |
| Größe | 1 .. 12 | "Mindestens 1 Mitglied" / `Maximal 12 Mitglieder` |
| Mitglieder | Kein leerer Name; <= 24; keine Duplikate | Aggregierte Liste von Fehlern |
| Summary | Alle Namen gesetzt & keine Fehler | Anzeige "Bereit zum Erstellen ✓" |

## 8. Testabdeckung (Stand jetzt)

| Testdatei | Fokus |
|-----------|-------|
| `profileFlow.test.tsx` | WG Auswahl, Navigation, Wizard Einstieg |
| `seedParity.test.tsx` | Seed WG Darstellung (Name + Badge) |
| `wgCreation.test.tsx` | Wizard Navigation + Validierungen + Erfolgreiche Erstellung |

Fehlend (geplant): Overdue/Interval, Ratings Count, Absence Ziel-Reduktion, Temp Resident Multiplier.

## 9. Bekannte technische Schulden / Verbesserungen

- React Warning: "Cannot update a component while rendering another" beim sofortigen Phase-Wechsel nach Klick -> Minor (kann durch microtask/transition entschärft werden)
- Direkte Mutation einiger Objekte (memberIds Patch früher) – inzwischen mit `updateWG` entschärft.
- ProgressBars sind Platzhalter statt echter aggregierter Kollaborationsmetrik.
- Kein Undo/Redo / History Layer.

## 10. Nächste Milestones (Kurzfassung)

1. RecentExecutions voll parity (Rating Modal)
2. Task Matrix ersetzen TaskListBasic
3. Erweiterte Paritätstests (Intervall, Overdue, Multiplier, Absences)
4. Rating Dialog & Aggregations UI
5. Notifications Anzeige
6. Migration Plan & diese Doku synchron halten

---
Letzte Aktualisierung: (automatisch)