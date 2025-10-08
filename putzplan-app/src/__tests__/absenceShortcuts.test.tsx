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

describe('Absence Keyboard Navigation', () => {
  beforeEach(() => {
    localStorage.clear();
    (dataManager as any)._TEST_reset?.();
  });

  it('ArrowRight wählt nächstes Mitglied', async () => {
    await openAbsenceView();
    const first = screen.getByTestId('member-card-u1');
    first.focus();
    fireEvent.keyDown(window, { key: 'ArrowRight' });
    const second = screen.getByTestId('member-card-u2');
    expect(second.getAttribute('data-selected')).toBeDefined();
  });
});
