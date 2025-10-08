import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import App from '../App.jsx';
import { dataManager } from '../services/dataManager';
import { ensureDebugEnabled, openWG } from './testUtils';

/**
 * Absence Management (neue separate Ansicht)
 * - Navigation über Button vom Dashboard
 * - Gültige Abwesenheit (>=7 Tage)
 * - Ablehnung zu kurzer Abwesenheit (<7 Tage)
 * - Ablehnung überlappender Abwesenheiten
 * - Entfernen funktioniert
 */

async function openAbsenceView() {
  render(<App />);
  await ensureDebugEnabled();
  await openWG();
  // Button klicken um zur neuen Ansicht zu wechseln
  fireEvent.click(await screen.findByTestId('absence-management-btn'));
  // Warten bis das Grid der Member-Karten gerendert ist (ersetzt altes Select)
  await screen.findByTestId('member-selection-cards');
}

function selectMember(userId: string) {
  // use member card click
  const card = screen.getByTestId(`member-card-${userId}`);
  fireEvent.click(card);
}

function fillAbsence(userId: string, start: string, end: string) {
  selectMember(userId);
  fireEvent.change(screen.getByTestId('absence-start'), { target: { value: start } });
  fireEvent.change(screen.getByTestId('absence-end'), { target: { value: end } });
}

describe('Absence Management (separate Ansicht)', () => {
  beforeEach(() => {
    localStorage.clear();
    // Reset singleton state to avoid cross-test contamination
    (dataManager as any)._TEST_reset?.();
  });

  it('fügt gültige Abwesenheit (>=7 Tage) hinzu', async () => {
    await openAbsenceView();
    fillAbsence('u1', '2025-01-01', '2025-01-07');
    fireEvent.click(screen.getByTestId('add-absence-btn'));
  await screen.findByTestId('absence-entry-u1');
  });

  it('zeigt Warn-Modal bei <7 Tagen (keine Anlage)', async () => {
    await openAbsenceView();
    fillAbsence('u2', '2025-02-01', '2025-02-03');
    fireEvent.click(screen.getByTestId('add-absence-btn'));
    const overlay = await screen.findByTestId('absence-warn-overlay');
    expect(overlay).toBeTruthy();
    fireEvent.click(screen.getByTestId('warn-close-btn'));
    expect(screen.queryByTestId('absence-warn-overlay')).toBeNull();
  });

  it('verhindert überlappende Abwesenheiten', async () => {
    await openAbsenceView();
    // Erste Abwesenheit
    fillAbsence('u3', '2025-03-01', '2025-03-10');
    fireEvent.click(screen.getByTestId('add-absence-btn'));
    await screen.findByTestId('absence-entry-u3');
    // Überlappender Versuch
    fillAbsence('u3', '2025-03-05', '2025-03-12');
    fireEvent.click(screen.getByTestId('add-absence-btn'));
    await screen.findByTestId('absence-error');
    expect(screen.getByTestId('absence-error').textContent).toMatch(/overlaps/i);
  });

  it('entfernt Abwesenheit', async () => {
    await openAbsenceView();
    fillAbsence('u4', '2025-04-01', '2025-04-10');
    fireEvent.click(screen.getByTestId('add-absence-btn'));
    const entry = await screen.findByTestId('absence-entry-u4');
    const removeBtn = entry.querySelector('[data-testid="remove-absence-btn"]') as HTMLElement;
    fireEvent.click(removeBtn);
    // sollte nach Entfernen nicht mehr vorhanden sein
    expect(screen.queryByTestId('absence-entry-u4')).toBeNull();
  });

  it('debug button erzeugt random Abwesenheit (wenn debug aktiv)', async () => {
    await openAbsenceView();
    // Debug Modus ist per ensureDebugEnabled aktiv
    const debugBtn = await screen.findByTestId('debug-add-random-absence');
    fireEvent.click(debugBtn);
    // irgendein Eintrag sollte erscheinen
    const anyEntry = await screen.findAllByTestId(/absence-entry-/);
    expect(anyEntry.length).toBeGreaterThan(0);
  });

  it('persistiert Abwesenheiten nach Reload', async () => {
    await openAbsenceView();
    fillAbsence('u1', '2025-05-01', '2025-05-10');
    fireEvent.click(screen.getByTestId('add-absence-btn'));
    await screen.findByTestId('absence-entry-u1');
    // Simulierter Reload: neu rendern
    render(<App />);
    await ensureDebugEnabled();
    await openWG();
    fireEvent.click(await screen.findByTestId('absence-management-btn'));
    const persisted = await screen.findAllByTestId('absence-entry-u1');
    expect(persisted.length).toBeGreaterThan(0);
  });
});
