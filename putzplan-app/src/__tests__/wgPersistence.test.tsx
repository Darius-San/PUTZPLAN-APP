import { describe, it, beforeEach, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '../App';
import { dataManager } from '../services/dataManager';

async function openFirstWG() {
  const buttons = await screen.findAllByRole('button', { name: /WG öffnen/i });
  expect(buttons.length).toBeGreaterThan(0);
  await userEvent.click(buttons[0]);
  await screen.findByTestId('add-task-btn');
}

describe('WG Persistence & Profile Overview Integrity', () => {
  beforeEach(() => {
    localStorage.clear();
    (dataManager as any).clearAllData();
  });

  it('behält WG Karten nach Zurückkehren zur Profilübersicht', async () => {
    render(<App />);
    await openFirstWG();
    // @ts-ignore
    window.confirm = () => true;
    const switchBtn = screen.getByRole('button', { name: /Profile wechseln/i });
    await userEvent.click(switchBtn);
    const wgButtons = await screen.findAllByRole('button', { name: /WG öffnen/i });
    expect(wgButtons.length).toBeGreaterThan(0);
  });

  it('behält WG Liste nach Unmount & Remount (Persistenz)', async () => {
    const { unmount } = render(<App />);
    const initialButtons = await screen.findAllByRole('button', { name: /WG öffnen/i });
    expect(initialButtons.length).toBeGreaterThan(0);
    unmount();
    render(<App />);
    const afterButtons = await screen.findAllByRole('button', { name: /WG öffnen/i });
    expect(afterButtons.length).toBeGreaterThan(0);
  });

  it('Task Erstellung löscht keine WG Daten', async () => {
    render(<App />);
    await openFirstWG();
    const addBtn = screen.getByTestId('add-task-btn');
    await userEvent.click(addBtn);
    const nameInput = await screen.findByTestId('task-name-input');
    await userEvent.type(nameInput, 'Persistenz Test');
    const saveBtn = screen.getByRole('button', { name: /Task speichern/i });
    await userEvent.click(saveBtn);
    await screen.findByTestId('add-task-btn');
    // @ts-ignore
    window.confirm = () => true;
    const switchBtn = screen.getByRole('button', { name: /Profile wechseln/i });
    await userEvent.click(switchBtn);
    const wgButtons = await screen.findAllByRole('button', { name: /WG öffnen/i });
    expect(wgButtons.length).toBeGreaterThan(0);
  });
});