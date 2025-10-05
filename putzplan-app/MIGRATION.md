# Migration Legacy -> React Dashboard

Dieses Dokument mappt die alten Skripte unter `assets/js/` auf geplante/ vorhandene React-Komponenten & Store-Funktionen.

## Übersicht Legacy Dateien

| Legacy Datei | Zweck (Kurz) | React Ziel (geplant/ vorhanden) | Status |
|--------------|-------------|----------------------------------|--------|
| absence-list.js | Liste & Filter von Abwesenheiten | `<AbsenceList />` + dataManager.absences | TODO |
| absence-render.js | Rendering-Logik für Abwesenheiten | Im Component render + Hooks | TODO |
| absences.js | CRUD / Modell Abwesenheiten | dataManager.createAbsence / listAbsences (EXISTIERT) | PARTIAL |
| app-legacy.js | Globales Bootstrapping / State | Ersetzt durch `dataManager` + `usePutzplanStore` | DONE |
| dashboard.js | Progress, Vorschläge, Aktivität | `Dashboard.tsx` | PARTIAL |
| debug-inline.js | Inline Debug Buttons | Debug Sektion / Debug Panel | TODO |
| dynamic-render.js | DOM Insertions dynamisch | React Reconciliation | DONE |
| member-edit.js | Nutzer bearbeiten | `<UserEditModal />` + updateUser | TODO |
| navigation.js | Seitenwechsel / Hash Navigation | Phasenstatus in `App.jsx` / später Router | PARTIAL |
| period.js | Zeitraum / Monatswechsel | `<PeriodSwitcher />` + WG Settings | TODO |
| profile-overview.js | Profilübersicht & Auswahl | `ProfileOverview.tsx` | PARTIAL |
| profile.js | Einzelne Nutzeransicht | Teil Dashboard (Header) | PARTIAL |
| progress-bars.js | Punktestand-Balken | `<ProgressBar />` + Dashboard | DONE |
| recent-executions.js | Letzte Ausführungen | Dashboard recentExecutions | PARTIAL |
| state-restore.js | LocalStorage Laden | dataManager.loadFromStorage | DONE |
| stats-render.js | Statistik Karten | `<StatsPanel />` (geplant) | TODO |
| task-controls.js | Buttons für Task-Aktionen | In Suggestion Card / künftiges TaskBoard | PARTIAL |
| task-execution-modal.js | Ausführung mit Foto / Verifikation | `<TaskExecutionModal />` (geplant) | TODO |
| task-management.js | CRUD Tasks | `<TaskList />` + createTask / updateTask | PARTIAL |
| task-table.js | Tabelle aller Tasks | `<TaskTable />` (geplant) | TODO |
| temporary-residents.js | Temporäre Bewohner | dataManager.addTemporaryResident / `<TemporaryResidentsPanel />` | TODO |
| ui-shims.js | Polyfills / Helper | Direkt in Utils / Weg | DONE |

## Priorisierte Nächste Schritte

1. Task-Basics vervollständigen
   - [ ] TaskTable Komponente (alle Tasks, sortierbar, Filter)
   - [ ] TaskExecutionModal (Foto optional, Verifikation Flag)
2. Nutzer / WG Verwaltung
   - [ ] UserEditModal (Name, Zielpunkte, Avatar)
   - [ ] WG Info Panel (Monatsziel, Mitgliederzahl, Punkte-Summe)
3. Abwesenheiten & Temporäre Bewohner
   - [ ] Absence CRUD UI (Liste + Formular)
   - [ ] TemporaryResidentsPanel
4. Statistik & Fortschritt
   - [ ] StatsPanel (Aggregationen: Gesamtpunkte WG, Durchschnitt, überfällige Tasks, Aktivität letzte 7 Tage)
   - [ ] PeriodSwitcher (Monat wechseln / Reset Simulation)
5. Debug / Dev Tools
   - [ ] DebugPanel: Buttons für Demo neu laden, Clear Data, Export/Import
   - [ ] Anzeige von isDemoDataset Badge im Header

## Komponenten-Skizzen

```tsx
// Beispiel: TaskTable Skeleton
export function TaskTable() {
  const { tasks } = usePutzplanStore();
  const list = Object.values(tasks);
  return (
    <div className="overflow-x-auto border rounded-lg bg-white">
      <table className="min-w-full text-sm">
        <thead className="bg-gray-50 text-xs uppercase text-gray-600">
          <tr>
            <th className="px-3 py-2 text-left">Task</th>
            <th className="px-3 py-2">Frequenz</th>
            <th className="px-3 py-2">Punkte</th>
            <th className="px-3 py-2">Max Tage</th>
            <th className="px-3 py-2">Aktionen</th>
          </tr>
        </thead>
        <tbody>
          {list.map(t => (
            <tr key={t.id} className="border-t">
              <td className="px-3 py-2 font-medium flex items-center gap-2">{t.emoji}<span>{t.title}</span></td>
              <td className="px-3 py-2 text-center">{t.monthlyFrequency}</td>
              <td className="px-3 py-2 text-center">{t.pointsPerExecution}</td>
              <td className="px-3 py-2 text-center">{t.constraints.maxDaysBetween}</td>
              <td className="px-3 py-2 text-center text-xs text-indigo-600">Edit</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

## Datenlücken / Offene Punkte
- TaskRating vs QualityRating Trennung finalisieren (derzeit nur QualityRating implementiert).
- Perioden-Logik (Monatswechsel) fehlt komplett → braucht Aggregation & Reset.
- Verifikation (requiresVerification) Flag existiert im Model, UI fehlt.
- Foto Upload: Platzhalter (notes) momentan nur Text.

## Empfohlene Reihenfolge für Commit Serie
1. chore: add MIGRATION.md (dieses Dokument)
2. feat: dashboard demo badge + debug panel
3. feat: task table skeleton
4. feat: task execution modal (basic)
5. feat: absence + temporary residents panels
6. feat: stats panel + period switcher
7. feat: user edit modal + wg info
8. refactor: remove unused legacy script references / delete folder when parity reached

---
Fragen oder Änderungen einfach im Issue oder direkt hier anmerken.
