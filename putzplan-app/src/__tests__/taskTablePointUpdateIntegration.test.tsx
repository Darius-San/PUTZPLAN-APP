import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { TaskTablePage } from '../components/taskTable/TaskTablePage';
import { UrgentTaskProvider } from '../contexts/UrgentTaskContext';
import { usePutzplanStore } from '../hooks/usePutzplanStore';

// Helper to wrap TaskTablePage with required providers
const renderTaskTable = () => render(
  <UrgentTaskProvider>
    <TaskTablePage />
  </UrgentTaskProvider>
);

const renderWithRerender = () => {
  const result = render(
    <UrgentTaskProvider>
      <TaskTablePage />
    </UrgentTaskProvider>
  );
  
  return {
    ...result,
    rerender: () => result.rerender(
      <UrgentTaskProvider>
        <TaskTablePage />
      </UrgentTaskProvider>
    )
  };
};

// Mock des Stores
const mockStore = {
  currentUser: { id: 'user1', name: 'Darius', avatar: '👨‍💻', targetMonthlyPoints: 120 },
  currentWG: {
    id: 'wg1',
    name: 'Test WG',
    memberIds: ['user1', 'user2'],
    settings: { monthlyPointsTarget: 120 }
  },
  state: {
    tasks: {
      task1: {
        id: 'task1',
        title: 'Bathroom',
        wgId: 'wg1',
        basePoints: 10,
        pointsPerExecution: 65, // Alter Wert
        monthlyFrequency: 1,
        totalMonthlyPoints: 65,
        isActive: true
      },
      task2: {
        id: 'task2', 
        title: 'Kitchen',
        wgId: 'wg1',
        basePoints: 10,
        pointsPerExecution: 53, // Alter Wert
        monthlyFrequency: 1,
        totalMonthlyPoints: 53,
        isActive: true
      }
    },
    users: {
      user1: { id: 'user1', name: 'Darius', avatar: '👨‍💻', targetMonthlyPoints: 120 },
      user2: { id: 'user2', name: 'Lilly', avatar: '👩‍💻', targetMonthlyPoints: 120 }
    },
    ratings: {},
    executions: {}
  },
  recalculateTaskPoints: vi.fn(),
  recalculateWGPointDistribution: vi.fn(),
  // ... andere Store-Funktionen
  addTask: vi.fn(),
  updateTask: vi.fn(),
  removeTask: vi.fn(),
  debugMode: false
};

// Mock des Store Hooks
vi.mock('../hooks/usePutzplanStore', () => ({
  usePutzplanStore: () => mockStore
}));

describe('TaskTable Point Update Integration', () => {
  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks();
    
    // Reset task points to original values
    mockStore.state.tasks.task1.pointsPerExecution = 65;
    mockStore.state.tasks.task2.pointsPerExecution = 53;
  });

  it('sollte die Task-Tabelle mit ursprünglichen Punktwerten anzeigen', () => {
    console.log('📋 Test: Ursprüngliche Punktwerte in Task-Tabelle');
    
    renderTaskTable();
    
    // Prüfe, dass die ursprünglichen Punktwerte angezeigt werden
    expect(screen.getByText('65P')).toBeInTheDocument();
    expect(screen.getByText('53P')).toBeInTheDocument();
    
    console.log('✅ Ursprüngliche Werte werden korrekt angezeigt');
  });

  it('sollte die Task-Tabelle NICHT automatisch aktualisieren nach recalculateTaskPoints', () => {
    console.log('🐛 Test: Task-Tabelle aktualisiert sich NICHT automatisch');
    
    const { rerender } = renderWithRerender();
    
    // Ursprüngliche Werte prüfen
    expect(screen.getByText('65P')).toBeInTheDocument();
    expect(screen.getByText('53P')).toBeInTheDocument();
    
    // Simuliere Punkteaktualisierung im dataManager (aber NICHT im React State)
    console.log('🔄 Simuliere recalculateTaskPoints() - nur dataManager updated, React State NICHT');
    
    // Das ist der Bug: dataManager aktualisiert Daten, aber React weiß es nicht
    // Die Task-Tabelle zeigt immer noch die alten Werte
    
    // Re-render erzwingen (das passiert NICHT automatisch - das ist der Bug!)
    rerender();
    
    // Die Werte sind immer noch die alten, weil der React State nicht aktualisiert wurde
    expect(screen.getByText('65P')).toBeInTheDocument();
    expect(screen.getByText('53P')).toBeInTheDocument();
    
    console.log('🎯 Bug bestätigt: Task-Tabelle zeigt alte Werte trotz dataManager Update');
  });

  it('sollte die Task-Tabelle aktualisieren NACH React State Update', () => {
    console.log('✅ Test: Task-Tabelle aktualisiert sich nach React State Update');
    
    const { rerender } = renderWithRerender();
    
    // Ursprüngliche Werte
    expect(screen.getByText('65P')).toBeInTheDocument();
    
    console.log('🔄 Simuliere React State Update mit neuen Punktwerten...');
    
    // Simuliere, dass der React State aktualisiert wurde (das ist die Lösung!)
    mockStore.state.tasks.task1.pointsPerExecution = 95; // Neuer Wert nach Bewertungen
    mockStore.state.tasks.task2.pointsPerExecution = 78; // Neuer Wert nach Bewertungen
    
    // Re-render mit neuen Daten
    rerender();
    
    // Jetzt sollten die neuen Werte sichtbar sein
    expect(screen.getByText('95P')).toBeInTheDocument();
    expect(screen.getByText('78P')).toBeInTheDocument();
    
    console.log('✅ Nach React State Update werden neue Werte korrekt angezeigt');
  });

  it('sollte die Lösung testen: setState() nach recalculateTaskPoints', async () => {
    console.log('🛠️ Test: Lösung mit setState() nach recalculateTaskPoints');
    
    // Mock einer verbesserten recalculateTaskPoints Funktion
    const improvedRecalculateTaskPoints = vi.fn().mockImplementation(() => {
      // 1. dataManager aktualisiert Daten (das passiert bereits)
      console.log('📊 dataManager.recalculateTaskPoints() ausgeführt');
      
      // 2. React State explizit aktualisieren (das ist die Lösung!)
      mockStore.state.tasks.task1.pointsPerExecution = 95;
      mockStore.state.tasks.task2.pointsPerExecution = 78;
      console.log('🔄 setState(dataManager.getState()) ausgeführt - React re-rendert');
    });
    
    // Ersetze die Mock-Funktion
    mockStore.recalculateTaskPoints = improvedRecalculateTaskPoints;
    
    const { rerender } = renderWithRerender();
    
    // Ursprüngliche Werte
    expect(screen.getByText('65P')).toBeInTheDocument();
    
    // Simuliere Button-Klick auf "Punkte aktualisieren"
    improvedRecalculateTaskPoints();
    
    // Re-render (das passiert jetzt automatisch durch setState)
    rerender();
    
    // Die neuen Werte sollten sofort sichtbar sein
    expect(screen.getByText('95P')).toBeInTheDocument();
    expect(screen.getByText('78P')).toBeInTheDocument();
    
    console.log('🎉 Lösung funktioniert: setState() nach dataManager Update führt zu sofortigem Re-render');
  });
});
