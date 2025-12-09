# Punkte-Berechnung: Formel & Kappungen

Diese Seite erklärt, wie die Punkte eines Tasks aus den Bewertungen berechnet werden – und warum extreme Eingaben irgendwann keinen weiteren Anstieg bringen (Plateau durch Caps).

## Kurzfassung
- Basiswert: 20 Punkte
- Multiplikatoren:
  - Zeit: avgMinutes / 60, geklemmt zwischen 0.5× und 3.0×
  - Schmerz (Pain): 1 + 0.3 × (ØPain − 1)
  - Wichtigkeit: 1 + 0.2 × (ØWichtigkeit − 1)
- Ergebnis: Punkte = round(20 × Zeit × Schmerz × Wichtigkeit), mindestens 5 Punkte

Beispiel: ØMinuten = 90 → Zeit = 1.5×; ØPain = 6 → 1 + 0.3×5 = 2.5×; ØWichtigkeit = 6 → 1 + 0.2×5 = 2.0× ⇒ 20 × 1.5 × 2.5 × 2.0 = 150 ≈ 150P

## Warum “extreme Minuten” nicht unendlich wachsen
Der Zeit-Multiplikator ist auf 3.0× gedeckelt. Das heißt:
- 480 Minuten (8h) → Zeit = min(max(480/60, 0.5), 3.0) = 3.0×
- 2000 Minuten → ebenfalls 3.0×

Wenn der Zeitfaktor bereits am Cap ist, erhöhen weitere Minuten die Punkte nicht mehr. Das ist beabsichtigt, um Ausreißer zu begrenzen und Aufgaben vergleichbar zu halten.

## Rundung & Untergrenze
- Das Ergebnis wird auf ganze Punkte gerundet.
- Untergrenze sind 5 Punkte, damit Mini-Aufgaben nicht auf 0 fallen.

## Sichtbarkeit in der UI
- Task-Tabelle zeigt einen Badge “{P}P” (z. B. “44P”).
- Falls für einen Task noch keine berechneten Punkte existieren, wird “…” angezeigt und eine automatische Nachberechnung angestoßen.
- Änderungen an Bewertungen lösen unmittelbar eine Neuberechnung aus, sobald gespeichert.

## Tests (Regressionen)
- ratingDisplayUpdateFlow: E2E-Fluss – Rating hochsetzen → Recalc → höhere Punkte in der Tabelle.
- taskTableFlow: Alle Tasks zeigen Badges; Fallback “…” wird korrekt behandelt.
- extremeMinutesClamp: 480 Minuten erhöhen die Punkte; 2000 Minuten erhöhen sie nicht weiter (Cap=3.0× greift).

## Hinweise für Entwickler
- Implementierung in `services/dataManager.ts` (recalculateTaskPoints, recalculateWGPointDistribution).
- Komponenten mit Triggern: `MemberRatings`, `RatingsOverview`, `TaskTablePage`.
- Bei UI-Tests (Vitest + jsdom) sind `window.confirm` und `window.alert` stubbed (siehe `vitest.setup.ts`).
