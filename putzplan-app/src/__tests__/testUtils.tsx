import { screen, fireEvent, within } from '@testing-library/react';

export async function ensureDebugEnabled() {
  // Toggle exists only on ProfileOverview now.
  // If already past profile phase (e.g. in dashboard), navigate back via profile switch.
  if (!screen.queryByTestId('toggle-debug-mode')) {
    const profileSwitch = screen.queryByTestId('profile-switch-btn');
    if (profileSwitch) {
      fireEvent.click(profileSwitch);
      // After switching, ProfileOverview should render with toggle
    }
  }
  const toggle = await screen.findByTestId('toggle-debug-mode');
  if (/AUS/.test(toggle.textContent || '')) {
    fireEvent.click(toggle);
  }
  await screen.findByText(/Debug: AN/);
}

export async function openWG() {
  if (screen.queryByTestId('add-task-btn')) return; // already inside app
  const btn = await screen.findByTestId(/open-wg-/);
  fireEvent.click(btn);
  await screen.findByTestId('add-task-btn');
}

// setupDebugAndEnterWG removed: callers should explicitly call ensureDebugEnabled() before openWG()

export function openTaskEditor() {
  fireEvent.click(screen.getByTestId('add-task-btn'));
  screen.getByTestId('task-editor-title');
}

export async function openRatingsOverview() {
  fireEvent.click(screen.getByTestId('rate-tasks-btn'));
  await screen.findByTestId('ratings-overview-title');
}

export function countDemoTaskOccurrences() {
  const taskList = screen.getByTestId('task-list');
  return within(taskList).getAllByText('Demo Schnell-Task').length;
}
