import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import React from 'react';
import App from '../App';
import { afterEach, describe, expect, test } from 'vitest';

// Basic helper to get theme attribute directly
function getThemeAttr() {
  return document.documentElement.getAttribute('data-theme') || 'indigo';
}

describe('Theme persistence early hydration', () => {
  afterEach(() => {
    cleanup();
    window.localStorage.clear();
    document.documentElement.removeAttribute('data-theme');
  });

  test('remembers non-default theme across remount before interaction', async () => {
    // Initial mount (theme default indigo)
    render(<App />);
    // Switch to next theme via ThemeSwitcher cycle button
  const switcher = await screen.findByTestId('theme-switcher-cycle');
    fireEvent.click(switcher); // amber-glow
    expect(getThemeAttr()).toBe('amber-glow');
    cleanup();

    // Simulate full reload: attribute should be applied synchron synchronously by index.html script
    render(<App />);
    // Without any interaction, the attribute should already be set
    expect(getThemeAttr()).toBe('amber-glow');
  });
});
