import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '../App';

// Helper to open dashboard quickly (seed provides default WG + user)
async function gotoDashboard() {
  render(<App />);
  // Seed kann bereits direkt Dashboard zeigen (wenn currentUser/WG gesetzt).
  // Versuche zuerst den Dashboard Button zu finden, ansonsten öffne WG Karte.
  const addBtn = await screen.findByTestId('add-task-btn').catch(async () => {
    const openBtn = await screen.findByTestId('open-wg-wg-darius');
    await userEvent.click(openBtn);
    return await screen.findByTestId('add-task-btn');
  });
  expect(addBtn).toBeInTheDocument();
}

describe('Period Settings & Metric Integration', () => {
  it('navigates to period settings and shows initial per-member target', async () => {
    await gotoDashboard();
    await userEvent.click(await screen.findByTestId('period-settings-btn'));
    // Expect heading
    await screen.findByText(/Zeitraum einstellen/i);
    // Should display target element
    expect(await screen.findByTestId('per-member-target')).toBeInTheDocument();
  });

  it('applies custom period and updates target (days shrink reduces total ~, not asserting exact math)', async () => {
    await gotoDashboard();
    await userEvent.click(await screen.findByTestId('period-settings-btn'));
    const startInput = await screen.findByLabelText(/Startdatum/i);
    const endInput = await screen.findByLabelText(/Enddatum/i);

    // Narrow period to 5 days
    const today = new Date();
    const startStr = today.toISOString().substring(0,10);
    const end = new Date(today.getTime() + 4*86400000); // +4 days => 5 total
    const endStr = end.toISOString().substring(0,10);

    await userEvent.clear(startInput);
    await userEvent.type(startInput, startStr);
    await userEvent.clear(endInput);
    await userEvent.type(endInput, endStr);
    const before = (await screen.findByTestId('per-member-target')).textContent;
    await userEvent.click(await screen.findByTestId('apply-period-btn'));
    await waitFor(async () => {
      const after = (await screen.findByTestId('per-member-target')).textContent;
      expect(after).not.toEqual(before); // Should change with different period length
    });
  });
});
