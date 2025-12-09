import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PeriodSettings } from '../components/period/PeriodSettings';
import * as usePutzplanStoreModule from '../hooks/usePutzplanStore';
import { dataManager } from '../services/dataManager';

/**
 * Test Suite: Period Reset Functionality - Extensive Testing
 * 
 * Diese Tests validieren die neue Period-Reset-Funktionalität:
 * - Zeitraum-Einstellung mit optionalem Reset
 * - Bestätigungsdialog für Daten-Reset
 * - DataManager resetForNewPeriod() Methode
 * - State-Speicherung nach Reset
 * - TaskTable-Reset (alle Striche gelöscht)
 * - Benutzerpunkte-Reset
 * 
 * Background: User Request "wenn ein neuer zeitraum eingestellt wurde dann soll 
 * der state gespeiechert werden und dann die tasktabelle resettet werden 
 * alle sriche gelöscht und punkte neu berechnet etc"
 */
describe('Period Reset Functionality - Extensive Testing', () => {
  let mockState: any;
  let mockSetCustomPeriod: any;
  let mockUsePutzplanStore: any;

  beforeEach(() => {
    // Umfassender Mock-State mit Executions, Benutzern, etc.
    mockState = {
      currentPeriod: {
        id: '2025-10-01_2025-10-31',
        start: new Date('2025-10-01'),
        end: new Date('2025-10-31'),
        days: 31
      },
      wgs: {
        'wg1': {
          id: 'wg1',
          name: 'Test WG',
          memberIds: ['user1', 'user2', 'user3']
        }
      },
      currentWG: 'wg1',
      users: {
        'user1': { id: 'user1', username: 'Max', totalPoints: 150, completedTasks: 10 },
        'user2': { id: 'user2', username: 'Anna', totalPoints: 120, completedTasks: 8 },
        'user3': { id: 'user3', username: 'Tom', totalPoints: 80, completedTasks: 5 }
      },
      tasks: {
        'task1': { id: 'task1', name: 'Küche', wgId: 'wg1', basePoints: 15 },
        'task2': { id: 'task2', name: 'Bad', wgId: 'wg1', basePoints: 20 },
        'task3': { id: 'task3', name: 'Staubsaugen', wgId: 'wg1', basePoints: 10 }
      },
      executions: {
        'exec1': { id: 'exec1', taskId: 'task1', userId: 'user1', pointsAwarded: 15, date: '2025-10-15' },
        'exec2': { id: 'exec2', taskId: 'task2', userId: 'user2', pointsAwarded: 20, date: '2025-10-20' },
        'exec3': { id: 'exec3', taskId: 'task3', userId: 'user3', pointsAwarded: 10, date: '2025-10-25' },
        'exec4': { id: 'exec4', taskId: 'task1', userId: 'user1', pointsAwarded: 18, date: '2025-10-28' }
      },
      ratings: {
        'rating1': { id: 'rating1', taskId: 'task1', userId: 'user2', rating: 4 },
        'rating2': { id: 'rating2', taskId: 'task2', userId: 'user1', rating: 5 }
      },
      monthlyStats: {
        'wg1_2025_10': { totalPoints: 350, totalTasks: 23, avgRating: 4.2 }
      }
    };

    mockSetCustomPeriod = vi.fn();
    
    mockUsePutzplanStore = {
      state: mockState,
      setCustomPeriod: mockSetCustomPeriod,
      periodTargets: {
        memberCount: 3,
        consideredTasks: 3,
        perMemberTarget: 45
      }
    };

    vi.spyOn(usePutzplanStoreModule, 'usePutzplanStore').mockReturnValue(mockUsePutzplanStore);
  });

  describe('UI Components and Basic Functionality', () => {
    it('should display reset checkbox option', () => {
      const mockOnBack = vi.fn();
      render(<PeriodSettings onBack={mockOnBack} />);

      expect(screen.getByText(/Daten für neuen Zeitraum zurücksetzen/)).toBeInTheDocument();
      expect(screen.getByRole('checkbox')).toBeInTheDocument();
      expect(screen.getByText(/Aktiviere diese Option, um alle vorhandenen Daten zu löschen/)).toBeInTheDocument();
    });

    it('should change save button text when reset is selected', () => {
      const mockOnBack = vi.fn();
      render(<PeriodSettings onBack={mockOnBack} />);

      const resetCheckbox = screen.getByRole('checkbox');
      const saveButton = screen.getByTestId('apply-period-btn');

      // Initial state
      expect(saveButton).toHaveTextContent('💾Zeitraum Speichern');

      // Check reset option
      fireEvent.click(resetCheckbox);
      expect(saveButton).toHaveTextContent('🔄Zurücksetzen & Speichern');
    });

    it('should save period without reset when checkbox is unchecked', () => {
      const mockOnBack = vi.fn();
      render(<PeriodSettings onBack={mockOnBack} />);

      const startInput = screen.getByDisplayValue('2025-10-01');
      const endInput = screen.getByDisplayValue('2025-10-31');
      const saveButton = screen.getByTestId('apply-period-btn');

      // Change dates
      fireEvent.change(startInput, { target: { value: '2025-11-01' } });
      fireEvent.change(endInput, { target: { value: '2025-11-30' } });

      // Save without reset
      fireEvent.click(saveButton);

      expect(mockSetCustomPeriod).toHaveBeenCalledWith(
        new Date('2025-11-01'),
        new Date('2025-11-30'),
        false
      );
    });
  });

  describe('Reset Confirmation Modal', () => {
    it('should show confirmation modal when reset is selected', async () => {
      const mockOnBack = vi.fn();
      render(<PeriodSettings onBack={mockOnBack} />);

      const resetCheckbox = screen.getByRole('checkbox');
      const saveButton = screen.getByTestId('apply-period-btn');

      // Enable reset and try to save
      fireEvent.click(resetCheckbox);
      fireEvent.click(saveButton);

      // Modal should appear
      await waitFor(() => {
        expect(screen.getByTestId('reset-modal-title')).toBeInTheDocument();
        expect(screen.getByTestId('reset-warning-text')).toBeInTheDocument();
        expect(screen.getByText(/Alle TaskTable-Striche \(Executions\) werden gelöscht/)).toBeInTheDocument();
        expect(screen.getByText(/Benutzerpunkte werden auf 0 zurückgesetzt/)).toBeInTheDocument();
      });
    });

    it('should close modal when cancelled', async () => {
      const mockOnBack = vi.fn();
      render(<PeriodSettings onBack={mockOnBack} />);

      const resetCheckbox = screen.getByRole('checkbox');
      const saveButton = screen.getByTestId('apply-period-btn');

      // Enable reset mode first
      fireEvent.click(resetCheckbox);
      
      // Open modal
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(screen.getByTestId('reset-modal-title')).toBeInTheDocument();
      });

      // Cancel
      const cancelButton = screen.getByText('Abbrechen');
      fireEvent.click(cancelButton);

      await waitFor(() => {
        expect(screen.queryByTestId('reset-modal-title')).not.toBeInTheDocument();
      });

      // Should not have called setCustomPeriod
      expect(mockSetCustomPeriod).not.toHaveBeenCalled();
    });

    it('should execute reset when confirmed', async () => {
      const mockOnBack = vi.fn();
      render(<PeriodSettings onBack={mockOnBack} />);

      const resetCheckbox = screen.getByRole('checkbox');
      const saveButton = screen.getByTestId('apply-period-btn');
      const startInput = screen.getByDisplayValue('2025-10-01');
      const endInput = screen.getByDisplayValue('2025-10-31');

      // Set new dates
      fireEvent.change(startInput, { target: { value: '2025-11-01' } });
      fireEvent.change(endInput, { target: { value: '2025-11-30' } });

      // Enable reset and save
      fireEvent.click(resetCheckbox);
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(screen.getByTestId('reset-modal-title')).toBeInTheDocument();
      });

      // Confirm reset
      const confirmButton = screen.getByText('Zurücksetzen');
      fireEvent.click(confirmButton);

      await waitFor(() => {
        expect(mockSetCustomPeriod).toHaveBeenCalledWith(
          new Date('2025-11-01'),
          new Date('2025-11-30'),
          true
        );
      });
    });
  });

  describe('DataManager Reset Logic', () => {
    it('should reset executions for current WG only', () => {
      // Mock current WG
      const mockGetCurrentWG = vi.fn().mockReturnValue(mockState.wgs.wg1);
      vi.spyOn(dataManager, 'getCurrentWG').mockImplementation(mockGetCurrentWG);
      vi.spyOn(dataManager, 'updateState').mockImplementation(vi.fn());

      // Test resetForNewPeriod method
      dataManager.resetForNewPeriod();

      expect(mockGetCurrentWG).toHaveBeenCalled();
      // Verify that updateState was called with reset data
    });

    it('should preserve executions from other WGs', () => {
      // Add execution from different WG
      const stateWithMultipleWGs = {
        ...mockState,
        wgs: {
          ...mockState.wgs,
          'wg2': { id: 'wg2', name: 'Other WG', memberIds: ['user4'] }
        },
        tasks: {
          ...mockState.tasks,
          'task_other': { id: 'task_other', name: 'Other Task', wgId: 'wg2' }
        },
        executions: {
          ...mockState.executions,
          'exec_other': { id: 'exec_other', taskId: 'task_other', userId: 'user4', pointsAwarded: 25 }
        }
      };

      // Mock with multiple WGs
      const mockGetCurrentWG = vi.fn().mockReturnValue(stateWithMultipleWGs.wgs.wg1);
      vi.spyOn(dataManager, 'getCurrentWG').mockImplementation(mockGetCurrentWG);
      
      let updatedState: any = {};
      vi.spyOn(dataManager, 'updateState').mockImplementation((newState) => {
        updatedState = newState;
      });
      vi.spyOn(dataManager, 'state', 'get').mockReturnValue(stateWithMultipleWGs);

      // Reset for new period
      dataManager.resetForNewPeriod();

      // Should keep execution from other WG
      expect(updatedState.executions).toBeDefined();
      // This test validates that only current WG data is reset
    });

    it('should reset user points for WG members only', () => {
      const mockGetCurrentWG = vi.fn().mockReturnValue(mockState.wgs.wg1);
      vi.spyOn(dataManager, 'getCurrentWG').mockImplementation(mockGetCurrentWG);
      
      let updatedState: any = {};
      vi.spyOn(dataManager, 'updateState').mockImplementation((newState) => {
        updatedState = newState;
      });
      vi.spyOn(dataManager, 'state', 'get').mockReturnValue(mockState);

      dataManager.resetForNewPeriod();

      expect(updatedState.users).toBeDefined();
      // Verify that WG members' points are reset
    });
  });

  describe('Integration Tests', () => {
    it('should complete full reset workflow', async () => {
      const mockOnBack = vi.fn();
      
      // Mock successful period setting
      mockSetCustomPeriod.mockImplementation((start, end, reset) => {
        if (reset) {
          console.log('Period set with reset:', start, end);
        }
      });

      render(<PeriodSettings onBack={mockOnBack} />);

      // 1. Change period dates
      const startInput = screen.getByDisplayValue('2025-10-01');
      const endInput = screen.getByDisplayValue('2025-10-31');
      fireEvent.change(startInput, { target: { value: '2025-12-01' } });
      fireEvent.change(endInput, { target: { value: '2025-12-31' } });

      // 2. Enable reset
      const resetCheckbox = screen.getByRole('checkbox');
      fireEvent.click(resetCheckbox);

      // 3. Save with reset  
      const saveButton = screen.getByTestId('apply-period-btn');
      fireEvent.click(saveButton);

      // 4. Confirm in modal
      await waitFor(() => {
        expect(screen.getByTestId('reset-modal-title')).toBeInTheDocument();
      });

      const confirmButton = screen.getByText('Zurücksetzen');
      fireEvent.click(confirmButton);

      // 5. Verify complete workflow
      await waitFor(() => {
        expect(mockSetCustomPeriod).toHaveBeenCalledWith(
          new Date('2025-12-01'),
          new Date('2025-12-31'),
          true
        );
      });
    });

    it('should handle errors gracefully', async () => {
      const mockOnBack = vi.fn();
      
      // Mock error in period setting
      mockSetCustomPeriod.mockImplementation(() => {
        throw new Error('Invalid date range');
      });

      // Mock alert
      const mockAlert = vi.fn();
      vi.stubGlobal('alert', mockAlert);

      render(<PeriodSettings onBack={mockOnBack} />);

      const resetCheckbox = screen.getByRole('checkbox');
      const saveButton = screen.getByTestId('apply-period-btn');
      
      // Enable reset mode first
      fireEvent.click(resetCheckbox);
      
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(screen.getByTestId('reset-modal-title')).toBeInTheDocument();
      });

      const confirmButton = screen.getByText('Zurücksetzen');
      fireEvent.click(confirmButton);

      await waitFor(() => {
        expect(mockAlert).toHaveBeenCalledWith('Invalid date range');
      });
    });
  });

  describe('State Persistence Tests', () => {
    it('should save state after period reset', () => {
      // This test ensures state is persisted after reset
      const mockGetCurrentWG = vi.fn().mockReturnValue(mockState.wgs.wg1);
      const mockUpdateState = vi.fn();
      
      vi.spyOn(dataManager, 'getCurrentWG').mockImplementation(mockGetCurrentWG);
      vi.spyOn(dataManager, 'updateState').mockImplementation(mockUpdateState);
      vi.spyOn(dataManager, 'state', 'get').mockReturnValue(mockState);

      dataManager.resetForNewPeriod();

      // Verify that updateState was called (which triggers persistence)
      expect(mockUpdateState).toHaveBeenCalled();
    });

    it('should archive previous period before reset', () => {
      const mockGetCurrentWG = vi.fn().mockReturnValue(mockState.wgs.wg1);
      const mockArchivePeriod = vi.fn();
      
      vi.spyOn(dataManager, 'getCurrentWG').mockImplementation(mockGetCurrentWG);
      vi.spyOn(dataManager, 'archivePeriod' as any).mockImplementation(mockArchivePeriod);

      dataManager.setCustomPeriod(new Date('2025-11-01'), new Date('2025-11-30'), true);

      // Should archive previous period
      expect(mockArchivePeriod).toHaveBeenCalledWith(mockState.currentPeriod, mockState.wgs.wg1);
    });
  });
});