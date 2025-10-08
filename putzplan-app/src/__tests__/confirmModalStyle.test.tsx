import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import App from '../App.jsx';
import { ensureDebugEnabled, openWG } from './testUtils';

async function openConfirmModal() {
  render(<App />);
  await ensureDebugEnabled();
  await openWG();
  const tableBtn = await screen.findByRole('button', { name: /Task-Tabelle/i });
  fireEvent.click(tableBtn);
  if (screen.queryAllByTestId(/tt-task-/).length === 0) {
    const genBtn = await screen.findByTestId('debug-generate-demo-tasks');
    fireEvent.click(genBtn);
  }
  const firstTask = (await screen.findAllByTestId(/tt-task-/))[0];
  fireEvent.click(firstTask); // opens execution select modal
  const execModal = await screen.findByTestId('task-exec-modal');
  // Wähle erstes Mitglied
  const firstMemberBtn = execModal.querySelector('button[data-testid^="exec-select-"]') as HTMLButtonElement;
  fireEvent.click(firstMemberBtn);
  await screen.findByTestId('confirm-task-modal');
}

describe('ConfirmTaskModal styling parity', () => {
  beforeEach(()=> { localStorage.clear(); });

  it('inherits accent modal styling structure', async () => {
    await openConfirmModal();
    const wrapper = screen.getByTestId('task-confirm-inner');
    expect(wrapper.querySelector('.rounded-2xl')).not.toBeNull();
    const card = wrapper.querySelector('[data-modal="task-confirm"]') as HTMLElement;
    expect(card).toBeTruthy();
    const radius = getComputedStyle(card).borderTopLeftRadius;
    expect(parseFloat(radius)).toBeGreaterThan(0);
  });

  it('shares overlay accent class with execution modal (modal-accent)', async () => {
    await openConfirmModal();
    // Both execution & confirm should be present after transition? Only confirm stays, so check any portal root
    const portals = document.querySelectorAll('[data-modal-root]');
    expect(Array.from(portals).some(p=> p.className.includes('modal-accent'))).toBe(true);
  });
});
