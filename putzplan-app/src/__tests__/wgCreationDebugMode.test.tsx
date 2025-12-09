import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { WGCreationWizard } from '../components/wg/WGCreationWizard';
import { usePutzplanStore } from '../hooks/usePutzplanStore';

// Mock Store
const mockStore = {
  createWG: vi.fn(),
  createUser: vi.fn(),
  debugMode: false
};

vi.mock('../hooks/usePutzplanStore', () => ({
  usePutzplanStore: () => mockStore
}));

describe('WG Creation Debug Mode', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('sollte im normalen Modus mindestens 2 Mitglieder erfordern', () => {
    console.log('📋 Test: Normal Modus - mindestens 2 Mitglieder');
    
    mockStore.debugMode = false;
    
    render(<WGCreationWizard onComplete={() => {}} onCancel={() => {}} />);
    
    // WG Name eingeben um "Weiter" Button zu aktivieren
    const nameInput = screen.getByPlaceholderText(/z.B. Sonnen WG/i);
    fireEvent.change(nameInput, { target: { value: 'Test WG' } });
    
    // Gehe zu Größen-Schritt
    fireEvent.click(screen.getByText('Weiter'));
    
    // Versuche 1 Mitglied einzustellen
    const sizeInput = screen.getByDisplayValue('2'); // Standard ist 2 im normalen Modus
    fireEvent.change(sizeInput, { target: { value: '1' } });
    
    // Sollte Fehlermeldung zeigen
    expect(screen.getByText('Mindestens 2 Mitglieder')).toBeInTheDocument();
    
    console.log('✅ Normal Modus: 2 Mitglieder erforderlich');
  });

  it('sollte im Debug-Modus 1 Mitglied erlauben', () => {
    console.log('🐛 Test: Debug Modus - 1 Mitglied erlaubt');
    
    mockStore.debugMode = true;
    
    render(<WGCreationWizard onComplete={() => {}} onCancel={() => {}} />);
    
    // WG Name eingeben um "Weiter" Button zu aktivieren
    const nameInput = screen.getByPlaceholderText(/z.B. Sonnen WG/i);
    fireEvent.change(nameInput, { target: { value: 'Debug Test WG' } });
    
    // Gehe zu Größen-Schritt
    fireEvent.click(screen.getByText('Weiter'));
    
    // Sollte Debug-Hinweis zeigen
    expect(screen.getByText(/Debug-Modus.*Einzelperson-WG erlaubt/)).toBeInTheDocument();
    
    // Standard sollte 1 sein im Debug-Modus
    const sizeInput = screen.getByDisplayValue('1');
    expect(sizeInput).toBeInTheDocument();
    
    // Sollte keine Fehlermeldung bei 1 Mitglied zeigen
    expect(screen.queryByText('Mindestens 2 Mitglieder')).not.toBeInTheDocument();
    
    // "Weiter" Button sollte funktionieren
    const nextButton = screen.getByText('Weiter');
    expect(nextButton).not.toBeDisabled();
    
    console.log('✅ Debug Modus: 1 Mitglied erlaubt');
  });
});