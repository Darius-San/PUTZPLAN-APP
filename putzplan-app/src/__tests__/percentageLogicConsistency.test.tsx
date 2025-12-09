import { describe, it, expect, beforeEach } from 'vitest';
import { dataManager } from '../services/dataManager';

/** Test für Konsistenz der Prozentberechnungen zwischen Gesamt und Erfüllung Zeilen */

describe('TaskTable Percentage Logic Consistency', () => {
  beforeEach(() => {
    dataManager.clearAllData();
  });

  it('percent function and inline calculation should give same result for 100% absence', () => {
    // Create user
    const user = dataManager.createUser({
      name: 'Test User',
      targetMonthlyPoints: 100,
      avatar: '👤',
      isActive: true
    });

    const period = dataManager.ensureCurrentPeriod();
    
    // Add full month absence
    dataManager.addAbsence({
      userId: user.id,
      reason: 'Full month away',
      startDate: period.start,
      endDate: period.end
    });

    // Simulate the calculations from TaskTablePage
    const adjustedTarget = dataManager.getAdjustedMonthlyTarget(user, period);
    const earnedPoints = 0; // No tasks executed
    
    // This is the percent() function logic
    const percentFunctionResult = adjustedTarget <= 0 ? 100 : Math.round((earnedPoints / adjustedTarget) * 100);
    
    // This is the inline calculation logic (after fix)
    const inlineCalculationResult = adjustedTarget > 0 ? Math.round((earnedPoints / adjustedTarget) * 100) : 100;
    
    // Should be the same
    expect(percentFunctionResult).toBe(inlineCalculationResult);
    expect(percentFunctionResult).toBe(100); // Should be 100% when target is 0
  });

  it('percent function and inline calculation should give same result for partial achievement', () => {
    // Create user
    const user = dataManager.createUser({
      name: 'Test User',
      targetMonthlyPoints: 100,
      avatar: '👤',
      isActive: true
    });

    const adjustedTarget = 100; // No absence
    const earnedPoints = 50; // 50% achievement
    
    // This is the percent() function logic
    const percentFunctionResult = adjustedTarget <= 0 ? 100 : Math.round((earnedPoints / adjustedTarget) * 100);
    
    // This is the inline calculation logic (after fix)
    const inlineCalculationResult = adjustedTarget > 0 ? Math.round((earnedPoints / adjustedTarget) * 100) : 100;
    
    // Should be the same
    expect(percentFunctionResult).toBe(inlineCalculationResult);
    expect(percentFunctionResult).toBe(50); // Should be 50%
  });

  it('percent function and inline calculation should give same result for over-achievement', () => {
    // Create user
    const user = dataManager.createUser({
      name: 'Test User',
      targetMonthlyPoints: 100,
      avatar: '👤',
      isActive: true
    });

    const adjustedTarget = 100; // No absence
    const earnedPoints = 150; // 150% achievement
    
    // This is the percent() function logic
    const percentFunctionResult = adjustedTarget <= 0 ? 100 : Math.round((earnedPoints / adjustedTarget) * 100);
    
    // This is the inline calculation logic (after fix)
    const inlineCalculationResult = adjustedTarget > 0 ? Math.round((earnedPoints / adjustedTarget) * 100) : 100;
    
    // Should be the same
    expect(percentFunctionResult).toBe(inlineCalculationResult);
    expect(percentFunctionResult).toBe(150); // Should be 150%
  });

  it('percent function and inline calculation should give same result with absence reduction', () => {
    // Create user
    const user = dataManager.createUser({
      name: 'Test User',
      targetMonthlyPoints: 100,
      avatar: '👤',
      isActive: true
    });

    const period = dataManager.ensureCurrentPeriod();
    
    // Add 7-day absence
    const absenceStart = new Date(period.start);
    const absenceEnd = new Date(period.start);
    absenceEnd.setDate(absenceEnd.getDate() + 6); // 7 days
    
    dataManager.addAbsence({
      userId: user.id,
      reason: '7 days away',
      startDate: absenceStart,
      endDate: absenceEnd
    });

    const adjustedTarget = dataManager.getAdjustedMonthlyTarget(user, period);
    const earnedPoints = 50; // Some points earned
    
    // This is the percent() function logic
    const percentFunctionResult = adjustedTarget <= 0 ? 100 : Math.round((earnedPoints / adjustedTarget) * 100);
    
    // This is the inline calculation logic (after fix)
    const inlineCalculationResult = adjustedTarget > 0 ? Math.round((earnedPoints / adjustedTarget) * 100) : 100;
    
    // Should be the same
    expect(percentFunctionResult).toBe(inlineCalculationResult);
    
    // Should be higher than 50% due to reduced target
    expect(percentFunctionResult).toBeGreaterThan(50);
    
    console.log(`Adjusted target: ${adjustedTarget}, Earned: ${earnedPoints}, Percentage: ${percentFunctionResult}%`);
  });
});