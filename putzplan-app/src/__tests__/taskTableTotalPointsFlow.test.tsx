// E2E-ähnlicher Flow-Test:
// - Öffnet die Task-Tabelle und liest die Gesamtpunkte (tfoot -> data-testid="total-<userId>")
// - Navigiert zu Ratings, ändert eine Bewertung und speichert
// - Triggert WG-Punkte-Update und kehrt zurück zur Task-Tabelle
// - Erwartet, dass sich die Gesamtpunkte für mindestens einen User erhöhen
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import App from '../App.jsx';

async function openFirstWG() {
  const wgBtn = await screen.findByTestId(/open-wg-/);
  fireEvent.click(wgBtn);
  await screen.findByTestId('add-task-btn');
}

async function openTaskTable() {
  await screen.findByTestId(/(add-task-btn|ratings-overview-title)/);
  let tableBtn = screen.queryByTestId('task-table-btn');
  if (!tableBtn) {
    if (screen.queryByTestId('ratings-overview-title')) {
      const backButtons = screen.getAllByRole('button', { name: /Zurück/i });
      if (backButtons.length) fireEvent.click(backButtons[0]);
      await screen.findByTestId('add-task-btn');
    }
    tableBtn = await screen.findByTestId('task-table-btn');
  }
  fireEvent.click(tableBtn);
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

function parsePoints(text?: string | null): number {
  const m = text?.match(/(\d+)P/);
  return m ? Number(m[1]) : NaN;
}

describe('TaskTable Gesamtpunkte Flow', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('zeigt veränderte Gesamtpunkte nach Rating-Änderung', async () => {
    render(<App />);

    await openFirstWG();
    await openTaskTable();

    // Initiale Gesamtpunkte für den ersten sichtbaren User lesen
    const totalCells = await screen.findAllByTestId(/total-/);
    expect(totalCells.length).toBeGreaterThan(0);
    const firstTotalCell = totalCells[0];
    const initialTotal = parsePoints(firstTotalCell.textContent);
    expect(isNaN(initialTotal)).toBe(false);

    // Zurück zum Dashboard und in Ratings wechseln
    fireEvent.click(await screen.findByTestId('tt-back-btn'));
    await screen.findByTestId('add-task-btn');
    await navigateToRatingsOverview();
    await openFirstMember();

    // Erstes Rating-Panel anpassen (Minuten + Schmerz + Wichtigkeit)
    const ratingTasks = await screen.findAllByTestId(/rating-task-/);
    const firstRatingTask = ratingTasks[0];
    fireEvent.change(within(firstRatingTask).getByTestId(/inp-min-/), { target: { value: '90' } }); // 1.5h
    fireEvent.change(within(firstRatingTask).getByTestId(/inp-pain-/), { target: { value: '7' } });
    fireEvent.change(within(firstRatingTask).getByTestId(/inp-imp-/), { target: { value: '7' } });

    // Speichern und WG-Punkte aktualisieren
    fireEvent.click(within(firstRatingTask).getByRole('button', { name: /Speichern/i }));
    const wgUpdateBtn = screen.getByTestId('update-points-btn');
    fireEvent.click(wgUpdateBtn);

    // Zurück zur Task-Tabelle
    fireEvent.click(screen.getByRole('button', { name: /Zurück/i }));
    fireEvent.click(screen.getByRole('button', { name: /Zurück/i }));
    await openTaskTable();

    // Kurz warten, damit Recalc-Render durch ist
    await new Promise(r => setTimeout(r, 200));

    const updatedTotalCells = await screen.findAllByTestId(/total-/);
    const updatedFirstTotal = parsePoints(updatedTotalCells[0].textContent);
    expect(isNaN(updatedFirstTotal)).toBe(false);
    expect(updatedFirstTotal).not.toBe(initialTotal);
    expect(updatedFirstTotal).toBeGreaterThan(initialTotal);
  }, 20000);
});
