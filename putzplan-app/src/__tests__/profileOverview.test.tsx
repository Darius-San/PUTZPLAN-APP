import { render, screen, fireEvent } from '@testing-library/react';
import App from '../App';
import { dataManager } from '../services/dataManager';

describe('ProfileOverview Landing', () => {
  beforeEach(() => {
    window.localStorage.clear();
    dataManager.resetForTests();
  });

  test('selecting a seeded user navigates to dashboard', async () => {
    render(<App />);
    await screen.findByText(/^Profile$/i);
    const openButtons = await screen.findAllByRole('button', { name: /Öffnen/i });
    fireEvent.click(openButtons[0]);
    await screen.findByText(/Hi\s+Darius/i);
  });
});
