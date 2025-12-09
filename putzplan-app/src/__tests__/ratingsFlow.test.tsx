import { describe, it, beforeEach, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import App from '../App.jsx';

async function openDashboard() {
  // If we're already on dashboard just return
  if (screen.queryByTestId('add-task-btn')) return;
  // Otherwise select first WG
  const openBtn = await screen.findByTestId(/open-wg-/);
  fireEvent.click(openBtn);
  await screen.findByTestId('add-task-btn');
}

describe('Ratings Flow', () => {
  beforeEach(()=> { localStorage.clear(); });

  it('navigates to ratings overview and lists members', async () => {
    render(<App />);
    await openDashboard();
    fireEvent.click(screen.getByTestId('rate-tasks-btn'));
    const title = await screen.findByTestId('ratings-overview-title');
    expect(title).toBeTruthy();
    const grid = await screen.findByTestId('ratings-member-grid');
    expect(grid.children.length).toBeGreaterThan(0); // members present
  });

  it('opens member rating page and changes & saves a single task rating value', async () => {
    render(<App />);
    await openDashboard();
    fireEvent.click(screen.getByTestId('rate-tasks-btn'));
    const memberBtn = await screen.findAllByTestId(/open-user-rating-/);
    fireEvent.click(memberBtn[0]);
    await screen.findByTestId('member-ratings-title');
    const firstMin = (await screen.findAllByTestId(/inp-min-/))[0] as HTMLInputElement;
    fireEvent.change(firstMin, { target: { value: '77' }});
    const firstSave = (await screen.findAllByTestId(/save-rating-/))[0];
    fireEvent.click(firstSave);
    // value persists
    expect((await screen.findAllByTestId(/inp-min-/))[0]).toHaveValue(77);
  });

  it('saving all ratings keeps member marked complete (banner)', async () => {
    render(<App />);
    await openDashboard();
    fireEvent.click(screen.getByTestId('rate-tasks-btn'));
    const memberBtns = await screen.findAllByTestId(/open-user-rating-/);
    fireEvent.click(memberBtns[0]);
    await screen.findByTestId('member-ratings-title');
    // Adjust one value to simulate edit & save all
    const firstMin = (await screen.findAllByTestId(/inp-min-/))[0] as HTMLInputElement;
    fireEvent.change(firstMin, { target: { value: '33' }});
    fireEvent.click(screen.getByTestId('save-all-ratings-btn'));
    // banner indicates completion
    expect(await screen.findByTestId('member-complete-banner')).toBeTruthy();
    // back to overview
    fireEvent.click(screen.getByText('Zurück'));
  await screen.findByTestId('ratings-overview-title');
  // Expect at least one card marked fertig
  expect(screen.getAllByText(/Fertig/).length).toBeGreaterThan(0);
  });

  it.skip('ratings persist after navigation (changed value retained)', async () => {
    render(<App />);
    await openDashboard();
    fireEvent.click(screen.getByTestId('rate-tasks-btn'));
    const memberBtns = await screen.findAllByTestId(/open-user-rating-/);
    fireEvent.click(memberBtns[0]);
    await screen.findByTestId('member-ratings-title');
    const firstSaveBtn = (await screen.findAllByTestId(/save-rating-/))[0];
    const firstMinInput = (await screen.findAllByTestId(/inp-min-/))[0] as HTMLInputElement;
    fireEvent.change(firstMinInput, { target: { value: '55' }});
    fireEvent.click(firstSaveBtn);
    expect(firstMinInput).toHaveValue(55);
    // Simulate full remount by clearing React tree
    // (In this simplified test environment we just navigate back twice)
    fireEvent.click(screen.getByText('Zurück')); // back to overview
    fireEvent.click(screen.getByText('Zurück')); // back to dashboard
    // go in again
    fireEvent.click(screen.getByTestId('rate-tasks-btn'));
    const memberBtns2 = await screen.findAllByTestId(/open-user-rating-/);
    fireEvent.click(memberBtns2[0]);
    await screen.findByTestId('member-ratings-title');
    // Expect same value persisted
    const firstMinInputAgain = (await screen.findAllByTestId(/inp-min-/))[0] as HTMLInputElement;
    expect(firstMinInputAgain).toHaveValue(55);
  });
});
