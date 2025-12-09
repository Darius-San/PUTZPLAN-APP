import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { SettingsPage } from '../components/settings/SettingsPage';

describe('Settings Page', () => {
  const mockOnBack = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('sollte Settings Page korrekt rendern', () => {
    render(<SettingsPage onBack={mockOnBack} />);
    
    expect(screen.getByText('⚙️ Einstellungen')).toBeInTheDocument();
    expect(screen.getByText('📊 Aufgaben-Tabelle')).toBeInTheDocument();
    expect(screen.getByText('Spaltenabstände')).toBeInTheDocument();
  });

  it('sollte Zurück Button haben', () => {
    render(<SettingsPage onBack={mockOnBack} />);
    
    const backButton = screen.getByTestId('back-to-dashboard-btn');
    expect(backButton).toBeInTheDocument();
    expect(backButton).toHaveTextContent('← Zurück');
  });

  it('sollte onBack aufrufen beim Zurück-Klick', () => {
    render(<SettingsPage onBack={mockOnBack} />);
    
    const backButton = screen.getByTestId('back-to-dashboard-btn');
    fireEvent.click(backButton);
    
    expect(mockOnBack).toHaveBeenCalledTimes(1);
  });

  it('sollte Spaltenabstand-Optionen anzeigen', () => {
    render(<SettingsPage onBack={mockOnBack} />);
    
    // Check that spacing options exist (multiple instances are expected)
    expect(screen.getAllByText('Sehr eng').length).toBeGreaterThanOrEqual(2);
    expect(screen.getAllByText('Standard').length).toBeGreaterThanOrEqual(2);  
    expect(screen.getAllByText('Sehr weit').length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText('Eng')).toBeInTheDocument();
    expect(screen.getByText('Weit')).toBeInTheDocument();
  });

  it('sollte Range-Slider für Spaltenabstände haben', () => {
    render(<SettingsPage onBack={mockOnBack} />);
    
    const rangeSlider = screen.getByRole('slider');
    expect(rangeSlider).toBeInTheDocument();
    expect(rangeSlider).toHaveAttribute('min', '1');
    expect(rangeSlider).toHaveAttribute('max', '5');
  });

  it('sollte Vorschau-Tabelle anzeigen', () => {
    render(<SettingsPage onBack={mockOnBack} />);
    
    expect(screen.getByText('🔍 Vorschau:')).toBeInTheDocument();
    expect(screen.getByText('Küche putzen')).toBeInTheDocument();
    expect(screen.getByText('Bad reinigen')).toBeInTheDocument();
    expect(screen.getByText('Anna')).toBeInTheDocument();
    expect(screen.getByText('Ben')).toBeInTheDocument();
  });

  it('sollte Speichern Button aktivieren bei Änderungen', () => {
    render(<SettingsPage onBack={mockOnBack} />);
    
    // Initially no save button in header (no changes)
    expect(screen.queryByTestId('save-settings-btn')).not.toBeInTheDocument();
    
    // Make a change
    const rangeSlider = screen.getByRole('slider');
    fireEvent.change(rangeSlider, { target: { value: '4' } });
    
    // Save button should appear
    expect(screen.getByTestId('save-settings-btn')).toBeInTheDocument();
  });

  it('sollte Zurücksetzen Button haben', () => {
    render(<SettingsPage onBack={mockOnBack} />);
    
    const resetButton = screen.getByText('🔄 Auf Standard zurücksetzen');
    expect(resetButton).toBeInTheDocument();
  });
});