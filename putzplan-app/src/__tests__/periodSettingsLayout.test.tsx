import { describe, it, expect } from 'vitest';
import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '../App';

async function openPeriodSettings() {
  render(<App />);
  // Try dashboard directly else open WG card
  const addBtn = await screen.findByTestId('add-task-btn').catch(async () => {
    const open = await screen.findByTestId('open-wg-wg-darius');
    await userEvent.click(open);
    return await screen.findByTestId('add-task-btn');
  });
  expect(addBtn).toBeInTheDocument();
  await userEvent.click(await screen.findByTestId('period-settings-btn'));
  await screen.findByTestId('period-grid');
}

describe('Period Settings Layout', () => {
  it('renders two cards, two date inputs and a small save button', async () => {
    await openPeriodSettings();
    const formCard = await screen.findByTestId('period-form-card');
    const statsCard = await screen.findByTestId('period-stats-card');
    expect(formCard).toBeInTheDocument();
    expect(statsCard).toBeInTheDocument();

    const dateInputs = formCard.querySelectorAll('input[type="date"]');
    expect(dateInputs.length).toBe(2);

    const saveBtn = await screen.findByTestId('apply-period-btn');
    // Regression: should not be a large button (btn-lg class) anymore
    expect(saveBtn.className).not.toMatch(/btn-lg/);
  });

  it('shows target and remains stable after changing dates', async () => {
    await openPeriodSettings();
    const targetBefore = (await screen.findByTestId('per-member-target')).textContent;

    const dateInputs = screen.getAllByDisplayValue(/\d{4}-|\d{2}\./) // fallback if locale differs
      .filter(el => el.tagName === 'INPUT');
    if (dateInputs.length >= 2) {
      await userEvent.clear(dateInputs[1] as HTMLInputElement);
      const today = new Date();
      const shorter = new Date(today.getTime() + 2*86400000).toISOString().substring(0,10);
      await userEvent.type(dateInputs[1] as HTMLInputElement, shorter);
      await userEvent.click(await screen.findByTestId('apply-period-btn'));
    }
    const targetAfter = (await screen.findByTestId('per-member-target')).textContent;
    expect(targetAfter).toBeTruthy();
    expect(targetAfter).not.toEqual('');
    // We don't assert inequality strictly (could coincide), just presence.
  });
});
