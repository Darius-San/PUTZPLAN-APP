import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import App from '../App.jsx';
import { ensureDebugEnabled, openWG } from './testUtils';

// Style regression tests for Task Execution Modal
// Note: jsdom cannot compute real rendered styles from external fonts, so we assert the font-family string on root element

async function openExecutionModal() {
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
  fireEvent.click(firstTask);
  await screen.findByTestId('task-exec-modal');
}

describe('TaskExecutionModal style', () => {
  beforeEach(()=> { localStorage.clear(); });

  it('applies the Inter font on document root', async () => {
    await openExecutionModal();
    const html = document.documentElement;
    const fontFamily = html.style.fontFamily || getComputedStyle(html).fontFamily;
    expect(fontFamily.toLowerCase()).toContain('inter');
  });

  it('has consistent rounded outer + inner corners', async () => {
    await openExecutionModal();
    const inner = screen.getByTestId('task-exec-inner');
    // We ensure the wrapper has overflow-hidden & a class including rounded-2xl
    expect(inner.querySelector('.rounded-2xl')).not.toBeNull();
    // The card inherits radius; ensure no unrounded top-left corner by checking inline style absence of border-radius:0
    const card = inner.querySelector('[data-modal="task-execution"]') as HTMLElement;
    expect(card).toBeTruthy();
    const radius = getComputedStyle(card).borderTopLeftRadius;
    expect(parseFloat(radius)).toBeGreaterThan(0);
  });
});
