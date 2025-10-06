import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import App from '../App.jsx';

// Helper to click add task button after seeding / selecting default profile
async function enterDashboard() {
  // If we already are on dashboard (add button present) just return
  if (screen.queryByTestId('add-task-btn')) return;
  // Otherwise open first WG card
  const openBtn = await screen.findByTestId(/open-wg-/);
  fireEvent.click(openBtn);
  await screen.findByTestId('add-task-btn');
}

function goToAddTask() {
  const addBtn = screen.getByTestId('add-task-btn');
  fireEvent.click(addBtn);
}

describe('Task Editor Flow', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('navigates from dashboard to task editor (Tasks bearbeiten) and back', () => {
    render(<App />);
    // Navigate to dashboard first
    return enterDashboard().then(() => {
    // Navigate
    goToAddTask();
  expect(screen.getByTestId('task-editor-title')).toHaveTextContent(/Tasks bearbeiten/i);
    // Back button
    fireEvent.click(screen.getByRole('button', { name: /Zurück/i }));
    expect(screen.getByTestId('add-task-btn')).toBeInTheDocument();
    });
  });

  it('shows numeric min interval input only when checkbox checked', () => {
    render(<App />);
    return enterDashboard().then(() => {
    goToAddTask();
    expect(screen.queryByTestId('min-interval-input')).toBeNull();
    fireEvent.click(screen.getByTestId('min-interval-toggle'));
    expect(screen.getByTestId('min-interval-input')).toBeInTheDocument();
    });
  });

  it('adds checklist items dynamically', () => {
    render(<App />);
    return enterDashboard().then(() => {
    goToAddTask();
    const input = screen.getByPlaceholderText(/Punkt hinzufügen/i);
    fireEvent.change(input, { target: { value: 'Spülen' }});
    fireEvent.click(screen.getByRole('button', { name: /^Add$/i }));
    fireEvent.change(input, { target: { value: 'Trocknen' }});
    fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });
    expect(screen.getByText('Spülen')).toBeInTheDocument();
    expect(screen.getByText('Trocknen')).toBeInTheDocument();
    });
  });

  it('saves a task and returns to dashboard', () => {
    render(<App />);
    return enterDashboard().then(() => {
    goToAddTask();
  const nameInput = screen.getByTestId('task-name-input');
    fireEvent.change(nameInput, { target: { value: 'Test Task' }});
  fireEvent.click(screen.getByRole('button', { name: /Task speichern/i }));
    // After save returns to dashboard (button visible again)
    expect(screen.getByTestId('add-task-btn')).toBeInTheDocument();
    });
  });
});
