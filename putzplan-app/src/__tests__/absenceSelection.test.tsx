import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import App from '../App.jsx';
import { dataManager } from '../services/dataManager';
import { ensureDebugEnabled, openWG } from './testUtils';

async function openAbsenceView() {
  render(<App />);
  await ensureDebugEnabled();
  await openWG();
  fireEvent.click(await screen.findByTestId('absence-management-btn'));
  await screen.findByTestId('member-selection-cards');
}

describe('Absence Auswahl Interaktion', () => {
  beforeEach(() => {
    localStorage.clear();
    (dataManager as any)._TEST_reset?.();
  });

  it('markiert genau eine Karte als ausgewählt und wechselt korrekt', async () => {
    await openAbsenceView();
    const card1 = screen.getByTestId('member-card-u1');
    const card2 = screen.getByTestId('member-card-u2');
    fireEvent.click(card1);
    expect(card1.getAttribute('data-selected')).toBeDefined();
    expect(card2.getAttribute('data-selected')).toBeNull();
    fireEvent.click(card2);
    expect(card1.getAttribute('data-selected')).toBeNull();
    expect(card2.getAttribute('data-selected')).toBeDefined();
  });
});
