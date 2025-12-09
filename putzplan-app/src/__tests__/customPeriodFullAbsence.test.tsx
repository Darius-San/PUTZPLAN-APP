import { describe, it, expect, beforeEach } from 'vitest';
import { dataManager } from '../services/dataManager';

/** Test für exakt den Bug den der User gefunden hat */

describe('Custom Period Full Absence Bug', () => {
  beforeEach(() => {
    dataManager.clearAllData();
  });

  it('should give 0 target points when absence covers entire custom period', () => {
    // Create user
    const user = dataManager.createUser({
      name: 'Test User',
      targetMonthlyPoints: 100,
      avatar: '👤',
      isActive: true
    });

    // Create custom period: 09.10. bis 09.11. (exactly like user described)
    const customStart = new Date('2025-10-09');
    const customEnd = new Date('2025-11-09');
    
    dataManager.setCustomPeriod(customStart, customEnd);
    const period = dataManager.ensureCurrentPeriod();
    
    console.log(`Custom period: ${period.start.toDateString()} to ${period.end.toDateString()}`);
    console.log(`Period days: ${period.days}`);

    // Add absence for EXACT same period
    dataManager.addAbsence({
      userId: user.id,
      reason: 'Full period absence',
      startDate: customStart,
      endDate: customEnd
    });

    const adjustedTarget = dataManager.getAdjustedMonthlyTarget(user, period);
    
    console.log(`Original target: 100`);
    console.log(`Adjusted target: ${adjustedTarget}`);
    console.log(`Expected: 0 (because absence covers entire period)`);
    
    // This should be 0 but probably isn't!
    expect(adjustedTarget).toBe(0);
  });

  it('should work correctly with calendar month for comparison', () => {
    // Create user
    const user = dataManager.createUser({
      name: 'Test User',
      targetMonthlyPoints: 100,
      avatar: '👤',
      isActive: true
    });

    // Use current calendar month
    const period = dataManager.ensureCurrentPeriod();
    
    console.log(`Calendar period: ${period.start.toDateString()} to ${period.end.toDateString()}`);
    console.log(`Period days: ${period.days}`);

    // Add absence for full calendar month
    dataManager.addAbsence({
      userId: user.id,
      reason: 'Full calendar month absence',
      startDate: period.start,
      endDate: period.end
    });

    const adjustedTarget = dataManager.getAdjustedMonthlyTarget(user, period);
    
    console.log(`Calendar - Original target: 100`);
    console.log(`Calendar - Adjusted target: ${adjustedTarget}`);
    
    // This should be 0 and probably works
    expect(adjustedTarget).toBe(0);
  });
});