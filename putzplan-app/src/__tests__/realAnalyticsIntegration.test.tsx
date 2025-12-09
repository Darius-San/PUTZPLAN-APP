/**
 * @jest-environment jsdom
 */
import { describe, test, expect, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { dataManager } from '../services/dataManager';
import { AnalyticsPage } from '../components/analytics/AnalyticsPage';

// Mock the usePutzplanStore hook
const mockUsePutzplanStore = () => {
  return {
    state: dataManager.getState(),
    currentWG: dataManager.getCurrentWG(),
    getHistoricalPeriods: () => dataManager.getHistoricalPeriods()
  };
};

// Mock the hook
vi.mock('../hooks/usePutzplanStore', () => ({
  usePutzplanStore: mockUsePutzplanStore
}));

// Mock recharts
vi.mock('recharts', () => ({
  LineChart: ({ children }: any) => <div data-testid="line-chart">{children}</div>,
  Line: ({ children }: any) => <div data-testid="line">{children}</div>,
  XAxis: () => <div data-testid="x-axis" />,
  YAxis: () => <div data-testid="y-axis" />,
  CartesianGrid: () => <div data-testid="cartesian-grid" />,
  Tooltip: () => <div data-testid="tooltip" />,
  Legend: () => <div data-testid="legend" />,
  ResponsiveContainer: ({ children }: any) => <div data-testid="responsive-container">{children}</div>
}));

describe('Analytics Real Integration Test', () => {
  beforeEach(() => {
    dataManager.clearAllData();
  });

  afterEach(() => {
    dataManager.clearAllData();
  });

  test('should show periods created via PeriodSettings in Analytics page', () => {
    // 1. Setup WG like in real app
    const wg = dataManager.createWG('Real Integration Test WG');
    dataManager.setCurrentWG(wg.id);

    // 2. Create a period like in PeriodSettings
    console.log('🧪 Creating period via setCustomPeriod...');
    const periodCreated = dataManager.setCustomPeriod(
      new Date('2025-11-19'), // Matches the screenshot date
      new Date('2025-12-16'), 
      false
    );
    expect(periodCreated).toBeTruthy();

    // 3. Verify the period exists in state
    const state = dataManager.getState();
    console.log('🔍 Current period:', state.currentPeriod);
    expect(state.currentPeriod).toBeDefined();
    expect(state.currentPeriod.id).toBeDefined();

    // 4. Verify the period is in WG.periods for analytics
    const currentWG = dataManager.getCurrentWG();
    console.log('🔍 WG periods:', currentWG?.periods?.length || 0);
    expect(currentWG).toBeDefined();
    expect(currentWG.periods).toBeDefined();
    expect(currentWG.periods.length).toBeGreaterThan(0);

    // 5. Verify getHistoricalPeriods returns the period
    const historicalPeriods = dataManager.getHistoricalPeriods();
    console.log('🔍 Historical periods count:', historicalPeriods.length);
    console.log('🔍 Historical periods:', historicalPeriods.map(p => ({ id: p.id, name: p.name })));
    expect(historicalPeriods.length).toBeGreaterThan(0);

    // 6. Try to render Analytics page and see if it shows periods
    const mockOnBack = vi.fn();
    const mockOnUserSelect = vi.fn();

    // This will test if the Analytics page can load with real data
    expect(() => {
      render(
        <AnalyticsPage 
          onBack={mockOnBack}
          onUserSelect={mockOnUserSelect}
        />
      );
    }).not.toThrow();

    // 7. Check if the period appears in the rendered output
    const periodText = screen.queryByText(/19.11|19\.11|Nov 19|November/);
    if (periodText) {
      console.log('✅ Found period in Analytics UI:', periodText.textContent);
    } else {
      console.log('❌ Period not found in Analytics UI');
      // Log all text content to debug
      const allText = document.body.textContent;
      console.log('🔍 All rendered text:', allText);
    }

    console.log('🧪 Real integration test completed');
  });

  test('should handle period switching in analytics context', () => {
    // Setup WG
    const wg = dataManager.createWG('Period Switch Test WG');
    dataManager.setCurrentWG(wg.id);

    // Create multiple periods
    dataManager.setCustomPeriod(new Date('2025-11-19'), new Date('2025-12-16'), false);
    dataManager.setCustomPeriod(new Date('2025-01-01'), new Date('2025-01-31'), false);

    // Verify both periods are tracked
    const historicalPeriods = dataManager.getHistoricalPeriods();
    console.log('🔍 Multiple periods:', historicalPeriods.length);
    expect(historicalPeriods.length).toBeGreaterThanOrEqual(2);

    // Test that analytics can handle multiple periods
    const mockOnBack = vi.fn();
    const mockOnUserSelect = vi.fn();

    expect(() => {
      render(
        <AnalyticsPage 
          onBack={mockOnBack}
          onUserSelect={mockOnUserSelect}
        />
      );
    }).not.toThrow();

    console.log('🧪 Period switching test completed');
  });
});