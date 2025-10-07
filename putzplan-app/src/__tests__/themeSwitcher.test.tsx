import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import App from '../App.jsx';

// This test targets the ProfileOverview initial screen and ensures the theme switcher works.

describe('Theme Switcher Integration', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('renders theme switcher, all chips present, cycles & persists', () => {
    render(<App />);

    // Base expectation
    expect(screen.getByText(/Wähle eine WG/i)).toBeInTheDocument();
    expect(screen.getByText(/Theme:/i)).toBeInTheDocument();

    const html = document.documentElement;
    expect(html.getAttribute('data-theme')).toBeNull(); // base indigo no attribute

    const themes = ['Amber Glow','Terracotta Soft','Sunset Sand','Clay & Cream'];
    themes.forEach(label => {
      expect(screen.getByTitle(label)).toBeInTheDocument();
    });

    // Click Terracotta Soft
    fireEvent.click(screen.getByTitle('Terracotta Soft'));
    expect(html.getAttribute('data-theme')).toBe('terracotta-soft');
    expect(localStorage.getItem('putzplan-theme')).toBe('terracotta-soft');

    // Rotate through remaining themes including wrap back to indigo
    const rotateBtn = screen.getByRole('button', { name: /Rotate/i });
    fireEvent.click(rotateBtn); // sunset-sand
    expect(html.getAttribute('data-theme')).toBe('sunset-sand');
    fireEvent.click(rotateBtn); // clay-cream
    expect(html.getAttribute('data-theme')).toBe('clay-cream');
    fireEvent.click(rotateBtn); // back to indigo (no attr)
    expect(html.getAttribute('data-theme')).toBeNull();
    fireEvent.click(rotateBtn); // amber-glow
    expect(html.getAttribute('data-theme')).toBe('amber-glow');
  });
});
