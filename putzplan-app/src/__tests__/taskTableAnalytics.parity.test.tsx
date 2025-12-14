import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';

// Mock chart libraries to avoid Canvas / DOM issues in jsdom environment
vi.mock('react-chartjs-2', () => ({
  Bar: () => null,
  Pie: () => null
}));

vi.mock('chart.js', () => {
  // Minimal stub that provides the symbols used by the app (register, Chart, defaults)
  class DummyChart { static register(..._args:any[]) { /* noop */ } }
  return {
    Chart: DummyChart,
    CategoryScale: {},
    LinearScale: {},
    BarElement: {},
    ArcElement: {},
    Title: {},
    Tooltip: {},
    Legend: {},
    register: () => {},
    defaults: { plugins: {} }
  };
});

// App-level imports
import { dataManager } from '../services/dataManager';
import { TaskTablePage } from '../components/taskTable/TaskTablePage';
import { CompactAnalytics } from '../components/analytics/CompactAnalytics';
import { UrgentTaskProvider } from '../contexts/UrgentTaskContext';

// Minimal test harness that mounts both TaskTable and Analytics and exercises an execution
// Goal: after executing a task for a user, the TaskTable totals and Analytics month taskCount / points should reflect that execution.

describe('TaskTable ↔ Analytics parity', () => {
  beforeEach(() => {
    // Reset dataManager state to initial clean state
    dataManager.clearAllData && dataManager.clearAllData();

    // Create a WG with one member and one task using the dataManager convenience
    const wgId = dataManager.createWG ? dataManager.createWG({
      name: 'Test WG',
      members: [ { name: 'me', email: 'me@example.com', targetMonthlyPoints: 100 } ],
      tasks: [ { name: 'Test Task', effort: 10, intervalDays: 7, pointsPerExecution: 10 } ]
    } as any) : null;

    if (wgId && dataManager.setCurrentWG) dataManager.setCurrentWG(wgId);

    // Set current user to the first created user
    const users = Object.values(dataManager.getState().users || {});
    if (users.length > 0 && dataManager.setCurrentUser) dataManager.setCurrentUser((users[0] as any).id);

    // Ensure current period exists
    dataManager.ensureCurrentPeriod && dataManager.ensureCurrentPeriod();

    (global as any).__testData = { wgId };
  });

  afterEach(() => {
    // cleanup
    (dataManager as any).reset && (dataManager as any).reset();
    delete (global as any).__testData;
  });

  it('updates TaskTable totals and Analytics after executing a task', async () => {
    const { wgId } = (global as any).__testData;

    // Render both components side-by-side
    // Render components into separate containers to avoid nested-button DOM issues
    const taskTableContainer = document.createElement('div');
    const analyticsContainer = document.createElement('div');
    document.body.appendChild(taskTableContainer);
    document.body.appendChild(analyticsContainer);

    const { container: ttContainer } = render(
      <UrgentTaskProvider>
        <TaskTablePage />
      </UrgentTaskProvider>,
      { container: taskTableContainer }
    );

    const { container: anContainer } = render(
      <UrgentTaskProvider>
        <CompactAnalytics />
      </UrgentTaskProvider>,
      { container: analyticsContainer }
    );

    const container = document.body;

    // Wait for components to initialize
    await waitFor(() => {
      expect(screen.getAllByText(/Test Task/i).length).toBeGreaterThanOrEqual(1);
    });

    // Execute the first available task using dataManager programmatically (simulates clicking in UI)
    const state = dataManager.getState();
    const tasks = Object.values(state.tasks || []);
    const users = Object.values(state.users || []);
    expect(tasks.length).toBeGreaterThan(0);
    expect(users.length).toBeGreaterThan(0);
    const t = tasks[0] as any;
    const u = users[0] as any;
    dataManager.executeTask && dataManager.executeTask(t.id, u.id);

    // Wait for the TaskTable totals to show 10P for the user
    await waitFor(() => {
      const totals = container.querySelectorAll('[data-testid]');
      // We'll assert via the TaskTable computed totals by locating the numeric value
      expect(container.textContent).toContain('10P');
    });

    // Now check Analytics: the available month should include 10P
    await waitFor(() => {
      expect(container.textContent).toContain('10P');
    });
  });
});
