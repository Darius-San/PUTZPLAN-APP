import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { dataManager } from '../services/dataManager';
import TaskTablePage from '../components/taskTable/TaskTablePage';
import { UrgentTaskProvider } from '../contexts/UrgentTaskContext';

// Helper to wrap TaskTablePage with required providers
const renderTaskTable = () => render(
  <UrgentTaskProvider>
    <TaskTablePage />
  </UrgentTaskProvider>
);

/** Test für Konsistenz der Prozentberechnungen zwischen Gesamt und Erfüllung Zeilen */

describe('TaskTable Percentage Consistency', () => {
  beforeEach(() => {
    dataManager.clearAllData();
  });

  it('shows consistent percentages between Gesamt and Erfüllung rows for 100% absence', () => {
    // Setup: Create WG and user
    const wg = dataManager.createWG('Test WG', ['👤', '🧑']);
    dataManager.setCurrentWG(wg.id);
    
    const user = dataManager.createUser({
      name: 'Test User',
      targetMonthlyPoints: 100,
      avatar: '👤',
      isActive: true
    });
    
    dataManager.addUserToWG(wg.id, user.id);
    dataManager.setCurrentUser(user.id);

    const period = dataManager.ensureCurrentPeriod();
    
    // Add full month absence
    dataManager.addAbsence({
      userId: user.id,
      reason: 'Full month away',
      startDate: period.start,
      endDate: period.end
    });

    // Render component
    renderTaskTable();

    // Find percentage cells
    const gesamtPercentageElement = screen.getByText(/\((\d+)%\)/);
    const erfuellungPercentageElement = screen.getByTestId(`percent-${user.id}`);

    // Extract percentage values
    const gesamtMatch = gesamtPercentageElement.textContent?.match(/\((\d+)%\)/);
    const gesamtPercentage = gesamtMatch ? parseInt(gesamtMatch[1]) : null;
    const erfuellungPercentage = parseInt(erfuellungPercentageElement.textContent?.replace('%', '') || '0');

    // Both should show 100% for fully absent user with 0 target points
    expect(gesamtPercentage).toBe(100);
    expect(erfuellungPercentage).toBe(100);
    expect(gesamtPercentage).toBe(erfuellungPercentage);
  });

  it('shows consistent percentages for partial achievement', () => {
    // Setup: Create WG and user
    const wg = dataManager.createWG('Test WG', ['👤', '🧑']);
    dataManager.setCurrentWG(wg.id);
    
    const user = dataManager.createUser({
      name: 'Test User',
      targetMonthlyPoints: 100,
      avatar: '👤',
      isActive: true
    });
    
    dataManager.addUserToWG(wg.id, user.id);
    dataManager.setCurrentUser(user.id);

    // Create a task and execute it (worth some points)
    const task = dataManager.createTask({
      title: 'Test Task',
      points: 50,
      emoji: '🧽',
      assignedUserId: user.id
    });

    dataManager.addExecution({
      taskId: task.id,
      userId: user.id,
      points: 50,
      quality: 'gut'
    });

    // Render component
    renderTaskTable();

    // Find percentage cells
    const gesamtPercentageElement = screen.getByText(/\((\d+)%\)/);
    const erfuellungPercentageElement = screen.getByTestId(`percent-${user.id}`);

    // Extract percentage values
    const gesamtMatch = gesamtPercentageElement.textContent?.match(/\((\d+)%\)/);
    const gesamtPercentage = gesamtMatch ? parseInt(gesamtMatch[1]) : null;
    const erfuellungPercentage = parseInt(erfuellungPercentageElement.textContent?.replace('%', '') || '0');

    // Both should show 50% (50 points earned / 100 target)
    expect(gesamtPercentage).toBe(50);
    expect(erfuellungPercentage).toBe(50);
    expect(gesamtPercentage).toBe(erfuellungPercentage);
  });

  it('shows consistent percentages with absence reduction', () => {
    // Setup: Create WG and user
    const wg = dataManager.createWG('Test WG', ['👤', '🧑']);
    dataManager.setCurrentWG(wg.id);
    
    const user = dataManager.createUser({
      name: 'Test User',
      targetMonthlyPoints: 100,
      avatar: '👤',
      isActive: true
    });
    
    dataManager.addUserToWG(wg.id, user.id);
    dataManager.setCurrentUser(user.id);

    const period = dataManager.ensureCurrentPeriod();
    
    // Add 7-day absence (roughly 1/4 of month)
    const absenceStart = new Date(period.start);
    const absenceEnd = new Date(period.start);
    absenceEnd.setDate(absenceEnd.getDate() + 6); // 7 days
    
    dataManager.addAbsence({
      userId: user.id,
      reason: '7 days away',
      startDate: absenceStart,
      endDate: absenceEnd
    });

    // Create a task and execute it for points
    const task = dataManager.createTask({
      title: 'Test Task',
      points: 50,
      emoji: '🧽',
      assignedUserId: user.id
    });

    dataManager.addExecution({
      taskId: task.id,
      userId: user.id,
      points: 50,
      quality: 'gut'
    });

    // Render component
    renderTaskTable();

    // Find percentage cells
    const gesamtPercentageElement = screen.getByText(/\((\d+)%\)/);
    const erfuellungPercentageElement = screen.getByTestId(`percent-${user.id}`);

    // Extract percentage values
    const gesamtMatch = gesamtPercentageElement.textContent?.match(/\((\d+)%\)/);
    const gesamtPercentage = gesamtMatch ? parseInt(gesamtMatch[1]) : null;
    const erfuellungPercentage = parseInt(erfuellungPercentageElement.textContent?.replace('%', '') || '0');

    // Both should show the same percentage (based on adjusted target)
    expect(gesamtPercentage).toBe(erfuellungPercentage);
    expect(gesamtPercentage).toBeGreaterThan(50); // Should be higher than 50% due to reduced target
  });
});
