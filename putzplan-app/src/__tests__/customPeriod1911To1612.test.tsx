import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { AnalyticsPage } from '../components/analytics/AnalyticsPage';
import { dataManager } from '../services/dataManager';
import * as usePutzplanStoreModule from '../hooks/usePutzplanStore';

// Mock the dependencies
const mockGetHistoricalPeriods = vi.fn();

vi.mock('../hooks/usePutzplanStore', () => ({
  usePutzplanStore: () => ({
    state: {
      executions: {},
      tasks: {},
      users: {
        'user1': { id: 'user1', name: 'Alice', isActive: true },
        'user2': { id: 'user2', name: 'Bob', isActive: true }
      },
      currentPeriod: {
        id: 'current',
        start: '2025-01-01',
        end: '2025-01-31'
      }
    },
    currentWG: {
      id: 'test-wg',
      memberIds: ['user1', 'user2'],
      settings: { monthlyPointsTarget: 50 }
    },
    getHistoricalPeriods: mockGetHistoricalPeriods
  })
}));

vi.mock('../services/analyticsService', () => ({
  AnalyticsService: {
    calculateOverallAnalytics: () => ({
      totalPoints: 0,
      totalTasks: 0,
      userAnalytics: []
    })
  }
}));

describe('Analytics Custom Period 19.11-16.12 Visibility Test', () => {

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should display custom period 19.11-16.12 when it exists in historical periods', async () => {
    // Setup: Mock custom period 19.11-16.12
    const customPeriod = {
      id: 'period-nov19-dec16',
      name: '19.11 - 16.12 2025',
      startDate: '2025-11-19T00:00:00.000Z',
      endDate: '2025-12-16T23:59:59.999Z',
      targetPoints: 50,
      isActive: false,
      createdAt: '2025-11-19T10:00:00.000Z',
      archivedAt: '2025-12-17T00:00:00.000Z',
      summary: {
        totalExecutions: 5,
        totalPoints: 25,
        memberStats: [
          { userId: 'user1', points: 15, achievement: 30 },
          { userId: 'user2', points: 10, achievement: 20 }
        ]
      }
    };

    mockGetHistoricalPeriods.mockReturnValue([customPeriod]);

    console.log('🧪 [TEST] Testing Analytics page with custom period 19.11-16.12');

    // Render Analytics page
    const mockOnBack = vi.fn();
    const mockOnUserSelect = vi.fn();
    
    render(
      <AnalyticsPage 
        onBack={mockOnBack}
        onUserSelect={mockOnUserSelect}
      />
    );

    // Wait for component to process periods
    await waitFor(() => {
      expect(mockGetHistoricalPeriods).toHaveBeenCalled();
    });

    // Check that the period is displayed
    await waitFor(() => {
      // Look for the period container
      const periodContainer = screen.queryByTestId(`analytics-period-${customPeriod.id}`);
      expect(periodContainer).toBeInTheDocument();
    });

    // Check that the period name is displayed
    const periodName = screen.getByTestId(`analytics-period-${customPeriod.id}-name`);
    expect(periodName).toBeInTheDocument();
    expect(periodName).toHaveTextContent('19.11 - 16.12 2025');

    // Check that the period stats are displayed
    const totalPoints = screen.getByTestId(`analytics-period-${customPeriod.id}-totalPoints`);
    expect(totalPoints).toHaveTextContent('25P');

    const executions = screen.getByTestId(`analytics-period-${customPeriod.id}-executions`);
    expect(executions).toHaveTextContent('5');

    console.log('✅ [TEST] Custom period 19.11-16.12 is correctly displayed in Analytics');
  });

  it('should show debug info when custom period is not found', async () => {
    // Setup: No custom periods
    mockGetHistoricalPeriods.mockReturnValue([]);

    console.log('🧪 [TEST] Testing Analytics page without custom period (debugging scenario)');

    // Spy on console.log to capture debug output
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    // Render Analytics page
    const mockOnBack = vi.fn();
    const mockOnUserSelect = vi.fn();
    
    render(
      <AnalyticsPage 
        onBack={mockOnBack}
        onUserSelect={mockOnUserSelect}
      />
    );

    // Wait for component to process periods
    await waitFor(() => {
      expect(mockGetHistoricalPeriods).toHaveBeenCalled();
    });

    // Check debug console outputs
    await waitFor(() => {
      const debugCalls = consoleSpy.mock.calls.filter(call => 
        call[0] && call[0].includes('[Analytics]')
      );
      
      expect(debugCalls.length).toBeGreaterThan(0);
      
      // Check that it logs the period count
      const periodCountLog = debugCalls.find(call => 
        call[0].includes('Real periods from getHistoricalPeriods():')
      );
      
      expect(periodCountLog).toBeDefined();
      console.log('📊 [TEST] Debug output captured:', periodCountLog);
    });

    consoleSpy.mockRestore();

    // Should show "Keine historischen Zeiträume" message
    expect(screen.getByText('Keine historischen Zeiträume')).toBeInTheDocument();

    console.log('✅ [TEST] Analytics correctly shows empty state when no custom periods exist');
  });

  it('should create and display custom period via dataManager integration test', async () => {
    console.log('🧪 [TEST] Integration test: Create custom period via dataManager and verify Analytics visibility');

    // Create a real WG and custom period using dataManager
    const wg = dataManager.createWG('Test WG for Custom Period');
    dataManager.setCurrentWG(wg.id);

    // Create the custom period 19.11 - 16.12
    const customPeriodResult = dataManager.setCustomPeriod(
      new Date('2025-11-19'),
      new Date('2025-12-16'),
      false
    );

    expect(customPeriodResult).toBeTruthy();
    console.log('✅ [TEST] Custom period created:', customPeriodResult.id);

    // Check that it appears in historical periods
    const historicalPeriods = dataManager.getHistoricalPeriods();
    console.log('📊 [TEST] Historical periods count:', historicalPeriods.length);
    
    const foundPeriod = historicalPeriods.find(period => {
      const startDate = new Date(period.startDate);
      const endDate = new Date(period.endDate);
      return startDate.getDate() === 19 && startDate.getMonth() === 10 && // November 19
             endDate.getDate() === 16 && endDate.getMonth() === 11;        // December 16
    });

    expect(foundPeriod).toBeDefined();
    console.log('🎯 [TEST] Found custom period 19.11-16.12:', foundPeriod?.id);

    // Now test that Analytics page would show this period
    mockGetHistoricalPeriods.mockReturnValue(historicalPeriods);

    const mockOnBack = vi.fn();
    const mockOnUserSelect = vi.fn();
    
    render(
      <AnalyticsPage 
        onBack={mockOnBack}
        onUserSelect={mockOnUserSelect}
      />
    );

    // Should find and display the period
    await waitFor(() => {
      const periodContainer = screen.queryByTestId(`analytics-period-${foundPeriod?.id}`);
      expect(periodContainer).toBeInTheDocument();
    });

    console.log('✅ [TEST] Integration test successful: Custom period is visible in Analytics');
  });
});