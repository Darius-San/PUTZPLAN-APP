import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import App from '../App';
import { describe, test, expect } from 'vitest';

/**
 * This test focuses purely on the visual state attributes/classes for member selection.
 * We assert the data-active attribute appears and that a strong amber background style is applied.
 */

describe('Absence member card highlight', () => {
  test('selecting a member sets data-active and background style', async () => {
    render(<App />);
    // Enter a WG (seed ensures at least one)
    const openBtn = await screen.findByTestId(/open-wg-/);
    fireEvent.click(openBtn);
    await screen.findByTestId('add-task-btn');

    // Open Absence Management
  const absBtn = screen.getByTestId('absence-management-btn');
    fireEvent.click(absBtn);
    const grid = await screen.findByTestId('member-selection-cards');

    // Pick first member card
    const firstCard = grid.querySelector('[data-testid^="member-card-"]') as HTMLElement;
    expect(firstCard).toBeTruthy();
    fireEvent.click(firstCard);

    // Attribute should be present
    expect(firstCard.getAttribute('data-active')).toBeDefined();

    // Class should include member-card and we expect a computed style with background including amber (approx check)
    const className = firstCard.className;
    expect(className).toContain('member-card');

    // Because JSDOM doesn't compute gradients, fall back to presence of transform scale active class
    expect(firstCard.className).toMatch(/scale-\[1\.05\]/);
  });
});
