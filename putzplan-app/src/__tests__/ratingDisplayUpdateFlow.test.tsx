import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import App from '../App.jsx';

async function openFirstWG() {
  const wgBtn = await screen.findByTestId(/open-wg-/);
  fireEvent.click(wgBtn);
  await screen.findByTestId('add-task-btn');
}

async function openTaskTable() {
  // Wir erwarten Dashboard mit task-table-btn. Falls wir (unerwartet) in der RatingsOverview landen,
  // navigieren wir erst zurück.
  // Warte zunächst auf ein mögliches Dashboard- oder RatingsOverview-Anker-Element.
  await screen.findByTestId(/(add-task-btn|ratings-overview-title)/);
  let tableBtn = screen.queryByTestId('task-table-btn');
  if (!tableBtn) {
    // Prüfe, ob wir in der RatingsOverview sind und gehe zurück.
    if (screen.queryByTestId('ratings-overview-title')) {
      const backButtons = screen.getAllByRole('button', { name: /Zurück/i });
      // Nimm den ersten Zurück-Button (RatingsOverview Header hat einen ghost Zurück Button).
      if (backButtons.length) fireEvent.click(backButtons[0]);
      // Warte erneut bis Dashboard sichtbar
      await screen.findByTestId('add-task-btn');
    }
    tableBtn = await screen.findByTestId('task-table-btn');
  }
  fireEvent.click(tableBtn);
  // TaskTable hat data-testid task-table
  await screen.findByTestId('task-table');
}

async function navigateToRatingsOverview() {
  const btn = await screen.findByTestId('rate-tasks-btn');
  fireEvent.click(btn);
  await screen.findByTestId('ratings-overview-title');
}

async function openFirstMember() {
  const memberCard = (await screen.findAllByTestId(/ratings-user-/))[0];
  const btn = within(memberCard).getByRole('button');
  fireEvent.click(btn);
  await screen.findByTestId('member-ratings-title');
}

describe('Rating → Punkte Anzeige Flow', () => {
  beforeEach(() => {
    localStorage.clear();
  });
  it('erhöht Punkte eines Tasks nach extremem Rating & Recalc (UI-Flow)', async () => {
    render(<App />);

    await openFirstWG();

  // Öffne Task-Tabelle zuerst
  await openTaskTable();
  
  // TaskTable ist offen – sammle initiale Punkte
  const firstPointsEl = await screen.findAllByTestId(/task-points-/);
  const firstBadge = firstPointsEl[0];
  const initialPointsMatch = firstBadge.textContent?.match(/(\d+)P/);
    const initialPoints = initialPointsMatch ? Number(initialPointsMatch[1]) : NaN;
    expect(isNaN(initialPoints)).toBe(false);

    // Navigiere zu Ratings
  // Zurück zur Dashboard Übersicht
  // Zurück zur Dashboard Übersicht (TaskTable -> Dashboard)
  fireEvent.click(await screen.findByTestId('tt-back-btn'));
  await screen.findByTestId('add-task-btn');
  // Öffne Ratings Overview
  await navigateToRatingsOverview();
    await openFirstMember();

    // Öffne erstes Rating-Task Panel
    const ratingTasks = await screen.findAllByTestId(/rating-task-/);
    const firstRatingTask = ratingTasks[0];

    // Setze extrem hohe Werte (ähnlich deinem Fall 12000 Minuten)
    const minInput = within(firstRatingTask).getByTestId(/inp-min-/);
    fireEvent.change(minInput, { target: { value: '480' }}); // 8 Stunden
    const painInput = within(firstRatingTask).getByTestId(/inp-pain-/);
    fireEvent.change(painInput, { target: { value: '9' }});
    const impInput = within(firstRatingTask).getByTestId(/inp-imp-/);
    fireEvent.change(impInput, { target: { value: '9' }});
    const freqInput = within(firstRatingTask).getByTestId(/inp-freq-/);
    fireEvent.change(freqInput, { target: { value: '6' }});

    // Speichern klicken
    const saveBtn = within(firstRatingTask).getByRole('button', { name: /Speichern/i });
    fireEvent.click(saveBtn);

    // WG-Punkte aktualisieren (im Member Rating Header)
    const wgUpdateBtn = screen.getByTestId('update-points-btn');
    fireEvent.click(wgUpdateBtn);

    // Zurück: Member → Overview → Dashboard
    fireEvent.click(screen.getByRole('button', { name: /Zurück/i }));
    fireEvent.click(screen.getByRole('button', { name: /Zurück/i }));
    // Task-Tabelle erneut öffnen
    await openTaskTable();
    await new Promise(r => setTimeout(r, 300));
    const updatedFirst = (await screen.findAllByTestId(/task-points-/))[0];
  const updatedMatch = updatedFirst.textContent?.match(/(\d+)P/);
    const updatedPoints = updatedMatch ? Number(updatedMatch[1]) : NaN;
    expect(isNaN(updatedPoints)).toBe(false);

    // Erwartung: Punkte gestiegen (oder zumindest != initial)
    expect(updatedPoints).not.toBe(initialPoints);
    expect(updatedPoints).toBeGreaterThan(initialPoints); // nach neuer Formel sollte steigen
  }, 20000);
});
