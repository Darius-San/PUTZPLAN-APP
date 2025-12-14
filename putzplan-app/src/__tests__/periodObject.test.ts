import { dataManager } from '../services/dataManager';

describe('PeriodObject migration and mutation', () => {
  it('toggles a task on a period and persists it as PeriodObject', () => {
    // Reset environment
    (dataManager as any).clearAllData?.();

    // Create user and WG
    const user = dataManager.createUser({ name: 'Tester', avatar: '👤', joinedAt: new Date(), isActive: true, currentMonthPoints: 0, targetMonthlyPoints: 100, totalCompletedTasks: 0 } as any);
    const wg = dataManager.createWG({ name: 'TestWG', description: 'desc', settings: { monthlyPointsTarget: 100, reminderSettings: { lowPointsThreshold: 20, overdueDaysThreshold: 3, enablePushNotifications: false } } } as any);
    dataManager.updateWG(wg.id, { memberIds: [user.id] });
    dataManager.setCurrentWG(wg.id);
    dataManager.setCurrentUser(user.id);

    // Create a task
    const task = dataManager.createTask({ title: 'T1', description: 'd', emoji: '🧽', category: 'general', averageMinutes: 10, averagePainLevel: 3, averageImportance: 3, monthlyFrequency: 2, difficultyScore: 3, unpleasantnessScore: 2, pointsPerExecution: 10, totalMonthlyPoints: 0, constraints: { maxDaysBetween: 7, requiresPhoto: false }, isActive: true, setupComplete: true } as any);

    // Create a custom period
    const s = new Date();
    const e = new Date();
    e.setDate(e.getDate() + 10);
    const period = dataManager.setCustomPeriod(s, e, false);
    expect(period).toBeDefined();

    // Toggle task on the period (should convert/attach PeriodObject tasks[])
    dataManager.toggleTaskOnPeriod(period.id, task.id);

    const p = dataManager.getPeriod(period.id);
    expect(p).not.toBeNull();
    expect(Array.isArray(p?.tasks)).toBeTruthy();
    const entry = p?.tasks?.find(t => t.taskId === task.id);
    expect(entry).toBeDefined();
    expect(entry?.checkedAt).toBeDefined();
    expect(entry?.checkedBy).toBe(user.id);

    // Toggle again to uncheck
    dataManager.toggleTaskOnPeriod(period.id, task.id);
    const p2 = dataManager.getPeriod(period.id);
    const entry2 = p2?.tasks?.find(t => t.taskId === task.id);
    expect(entry2).toBeDefined();
    expect(entry2?.checkedAt).toBeUndefined();
  });
});
