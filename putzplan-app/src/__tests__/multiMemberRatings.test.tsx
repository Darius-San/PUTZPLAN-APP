import { describe, it, beforeEach, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import App from '../App.jsx';

async function openDashboard() {
  if (screen.queryByTestId('add-task-btn')) return;
  const btn = await screen.findByTestId(/open-wg-/);
  fireEvent.click(btn);
  await screen.findByTestId('add-task-btn');
}

async function goToRatingsOverview() {
  fireEvent.click(screen.getByTestId('rate-tasks-btn'));
  await screen.findByTestId('ratings-overview-title');
}

describe('Multi-Member Ratings Persistence', () => {
  beforeEach(()=> { localStorage.clear(); });

  it.skip('persists ratings for two different members separately', async () => {
    render(<App />);
    await openDashboard();
    await goToRatingsOverview();

    // Open first member
    const memberButtons = await screen.findAllByTestId(/open-user-rating-/);
    fireEvent.click(memberButtons[0]);
    await screen.findByTestId('member-ratings-title');
    // Change first task minutes & save
    const firstMinInputA = (await screen.findAllByTestId(/inp-min-/))[0] as HTMLInputElement;
    fireEvent.change(firstMinInputA, { target: { value: '61' }});
    const firstSaveA = (await screen.findAllByTestId(/save-rating-/))[0];
    fireEvent.click(firstSaveA);
    expect(firstMinInputA).toHaveValue(61);
    // Back
    fireEvent.click(screen.getByText('Zurück'));
    await screen.findByTestId('ratings-overview-title');

    // Open second member
    const memberButtons2 = await screen.findAllByTestId(/open-user-rating-/);
    fireEvent.click(memberButtons2[1]);
    await screen.findByTestId('member-ratings-title');
    const firstMinInputB = (await screen.findAllByTestId(/inp-min-/))[0] as HTMLInputElement;
    fireEvent.change(firstMinInputB, { target: { value: '42' }});
    const firstSaveB = (await screen.findAllByTestId(/save-rating-/))[0];
    fireEvent.click(firstSaveB);
    expect(firstMinInputB).toHaveValue(42);
    // Back
    fireEvent.click(screen.getByText('Zurück'));
    await screen.findByTestId('ratings-overview-title');

    // Re-open first member and verify its value still 61 (not overwritten by second user edits)
    const memberButtons3 = await screen.findAllByTestId(/open-user-rating-/);
    fireEvent.click(memberButtons3[0]);
    await screen.findByTestId('member-ratings-title');
    const firstMinInputAAgain = (await screen.findAllByTestId(/inp-min-/))[0] as HTMLInputElement;
    expect(firstMinInputAAgain).toHaveValue(61);
  });
});
