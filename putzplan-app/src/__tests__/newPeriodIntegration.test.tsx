import { describe, it, expect, beforeEach, vi } from 'vitest';
import { dataManager } from '../services/dataManager';
import { PeriodAnalyticsService } from '../services/periodAnalyticsService';

describe('New Period Integration Tests', () => {
  beforeEach(() => {
    dataManager._TEST_reset();
  });

  it('should reset hot tasks when creating new period with reset', () => {
    // Setup: Create user, WG, and task
    const user = dataManager.createUser({ name: 'TestUser', avatar: '👤' } as any);
    const wg = dataManager.createWG({ 
      name: 'TestWG', 
      description: 'test',
      settings: { 
        monthlyPointsTarget: 100,
        hotTaskBonus: { enabled: true, percent: 500 }
      }
    } as any);
    
    dataManager.updateWG(wg.id, { memberIds: [user.id] } as any);
    dataManager.setCurrentUser(user.id);

    const task = dataManager.createTask({
      title: 'TestTask',
      emoji: '🔥',
      pointsPerExecution: 10,
      wgId: wg.id,
      isActive: true
    } as any);

    // Mark task as hot
    dataManager.updateTask(task.id, { isAlarmed: true } as any);
    
    // Verify task is hot
    const taskBefore = dataManager.getState().tasks[task.id];
    expect(taskBefore.isAlarmed).toBe(true);

    // Execute task to have some data
    dataManager.executeTaskForUser(task.id, user.id, {});

    // Verify execution was recorded
    const executionsBefore = Object.values(dataManager.getState().executions);
    expect(executionsBefore.length).toBe(1);

    // Create new period with reset
    const startDate = new Date('2025-12-01');
    const endDate = new Date('2025-12-31');
    
    dataManager.setCustomPeriod(startDate, endDate, true); // true = reset data

    // Verify hot task was reset
    const taskAfter = dataManager.getState().tasks[task.id];
    expect(taskAfter.isAlarmed).toBe(false);

    // Verify executions were cleared
    const executionsAfter = Object.values(dataManager.getState().executions);
    expect(executionsAfter.length).toBe(0);

    // Verify user points were reset
    const userAfter = dataManager.getState().users[user.id];
    expect(userAfter.totalPoints).toBe(0);
  });

  it('should create analytics period when creating new period', () => {
    // Setup
    const user = dataManager.createUser({ name: 'AnalyticsUser', avatar: '👤' } as any);
    const wg = dataManager.createWG({ 
      name: 'AnalyticsWG', 
      description: 'test',
      settings: { monthlyPointsTarget: 75 }
    } as any);
    
    dataManager.updateWG(wg.id, { memberIds: [user.id] } as any);
    dataManager.setCurrentUser(user.id);

    // Verify no periods exist initially
    const periodsBefore = PeriodAnalyticsService.getPeriods();
    expect(periodsBefore.length).toBe(0);

    // Create new period
    const startDate = new Date('2025-12-01');
    const endDate = new Date('2025-12-31');
    
    const period = dataManager.setCustomPeriod(startDate, endDate, false);

    // Verify analytics period was created
    const periodsAfter = PeriodAnalyticsService.getPeriods();
    expect(periodsAfter.length).toBe(1);
    
    const analyticsPeriod = periodsAfter[0];
    expect(analyticsPeriod.id).toBe(period.id);
    expect(analyticsPeriod.isActive).toBe(true);
    expect(analyticsPeriod.targetPoints).toBe(75); // from WG settings
    expect(new Date(analyticsPeriod.startDate)).toEqual(startDate);
    expect(new Date(analyticsPeriod.endDate)).toEqual(endDate);

    // Verify current period is correct
    const currentPeriod = PeriodAnalyticsService.getCurrentPeriod();
    expect(currentPeriod).toBeTruthy();
    expect(currentPeriod?.id).toBe(period.id);
  });

  it('should deactivate previous analytics periods when creating new one', () => {
    // Setup
    const user = dataManager.createUser({ name: 'DeactivateUser', avatar: '👤' } as any);
    const wg = dataManager.createWG({ 
      name: 'DeactivateWG', 
      description: 'test',
      settings: { monthlyPointsTarget: 50 }
    } as any);
    
    dataManager.updateWG(wg.id, { memberIds: [user.id] } as any);
    dataManager.setCurrentUser(user.id);

    // Create first period
    const startDate1 = new Date('2025-11-01');
    const endDate1 = new Date('2025-11-30');
    dataManager.setCustomPeriod(startDate1, endDate1, false);

    // Verify first period is active
    let currentPeriod = PeriodAnalyticsService.getCurrentPeriod();
    expect(currentPeriod?.isActive).toBe(true);

    // Create second period
    const startDate2 = new Date('2025-12-01');
    const endDate2 = new Date('2025-12-31');
    dataManager.setCustomPeriod(startDate2, endDate2, false);

    // Verify only new period is active
    const periods = PeriodAnalyticsService.getPeriods();
    expect(periods.length).toBe(2);
    
    const activePeriods = periods.filter(p => p.isActive);
    expect(activePeriods.length).toBe(1);
    expect(activePeriods[0].startDate).toBe(startDate2.toISOString());

    // Verify current period is the new one
    currentPeriod = PeriodAnalyticsService.getCurrentPeriod();
    expect(currentPeriod?.startDate).toBe(startDate2.toISOString());
  });

  it('should preserve hot tasks when creating period without reset', () => {
    // Setup
    const user = dataManager.createUser({ name: 'PreserveUser', avatar: '👤' } as any);
    const wg = dataManager.createWG({ 
      name: 'PreserveWG', 
      description: 'test',
      settings: { monthlyPointsTarget: 100 }
    } as any);
    
    dataManager.updateWG(wg.id, { memberIds: [user.id] } as any);
    dataManager.setCurrentUser(user.id);

    const task = dataManager.createTask({
      title: 'PreserveTask',
      emoji: '🔥',
      pointsPerExecution: 10,
      wgId: wg.id,
      isActive: true
    } as any);

    // Mark task as hot
    dataManager.updateTask(task.id, { isAlarmed: true } as any);

    // Execute task
    dataManager.executeTaskForUser(task.id, user.id, {});

    // Create new period WITHOUT reset
    const startDate = new Date('2025-12-01');
    const endDate = new Date('2025-12-31');
    
    dataManager.setCustomPeriod(startDate, endDate, false); // false = no reset

    // Verify hot task is preserved
    const taskAfter = dataManager.getState().tasks[task.id];
    expect(taskAfter.isAlarmed).toBe(true);

    // Verify executions are preserved
    const executionsAfter = Object.values(dataManager.getState().executions);
    expect(executionsAfter.length).toBe(1);

    // Verify user points are preserved (currentMonthPoints is the actual field used)
    const userAfter = dataManager.getState().users[user.id];
    expect(userAfter.currentMonthPoints || 0).toBeGreaterThan(0);
  });
});