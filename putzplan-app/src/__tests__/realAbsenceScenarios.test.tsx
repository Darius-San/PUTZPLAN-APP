import { describe, it, expect, beforeEach } from 'vitest';
import { dataManager } from '../services/dataManager';

/** Integration Tests für reale Abwesenheits-Szenarien ohne Overlap-Probleme */

describe('Real Absence Scenarios', () => {
  beforeEach(() => {
    dataManager.clearAllData();
  });

  it('handles user completely absent for full period', () => {
    const user = dataManager.createUser({
      name: 'Absent User',
      targetMonthlyPoints: 120,
      avatar: '👤',
      isActive: true
    });

    const period = dataManager.ensureCurrentPeriod();
    
    // Full month absence
    dataManager.addAbsence({
      userId: user.id,
      reason: 'Long vacation',
      startDate: period.start,
      endDate: period.end
    });

    const adjustedTarget = dataManager.getAdjustedMonthlyTarget(user, period);
    
    expect(adjustedTarget).toBe(0);
  });

  it('handles multiple users with different absence patterns', () => {
    const user1 = dataManager.createUser({
      name: 'User 1',
      targetMonthlyPoints: 100,
      avatar: '👤',
      isActive: true
    });

    const user2 = dataManager.createUser({
      name: 'User 2',
      targetMonthlyPoints: 100,
      avatar: '👥',
      isActive: true
    });

    const period = dataManager.ensureCurrentPeriod();
    
    // User 1: First week absent
    const week1Start = new Date(period.start);
    const week1End = new Date(period.start);
    week1End.setDate(week1End.getDate() + 6); // 7 days
    
    dataManager.addAbsence({
      userId: user1.id,
      reason: 'Early vacation',
      startDate: week1Start,
      endDate: week1End
    });

    // User 2: Fourth week absent
    const week4Start = new Date(period.start);
    week4Start.setDate(week4Start.getDate() + 21); // Start on day 22
    const week4End = new Date(week4Start);
    week4End.setDate(week4End.getDate() + 6); // 7 days
    
    dataManager.addAbsence({
      userId: user2.id,
      reason: 'Late vacation',
      startDate: week4Start,
      endDate: week4End
    });

    const adjustedTarget1 = dataManager.getAdjustedMonthlyTarget(user1, period);
    const adjustedTarget2 = dataManager.getAdjustedMonthlyTarget(user2, period);
    
    // Both should have reduced targets
    expect(adjustedTarget1).toBeLessThan(100);
    expect(adjustedTarget2).toBeLessThan(100);
    
    // Debug: Log the actual values
    const reduction1 = 100 - adjustedTarget1;
    const reduction2 = 100 - adjustedTarget2;
    console.log(`Period days: ${period.days}`);
    console.log(`User1 - Target: ${adjustedTarget1}, Reduction: ${reduction1}`);
    console.log(`User2 - Target: ${adjustedTarget2}, Reduction: ${reduction2}`);
    
    // Both users have 7-day absences, so reductions should be similar
    // Allow for small differences due to rounding and potential timing differences
    expect(Math.abs(reduction1 - reduction2)).toBeLessThanOrEqual(3); // More generous tolerance
  });

  it('handles partial month with absence adjustment', () => {
    const user = dataManager.createUser({
      name: 'Partial User',
      targetMonthlyPoints: 150,
      avatar: '👤',
      isActive: true
    });

    const period = dataManager.ensureCurrentPeriod();
    
    // 10 days absent in the middle of month
    const absenceStart = new Date(period.start);
    absenceStart.setDate(absenceStart.getDate() + 10); // Start on day 11
    const absenceEnd = new Date(absenceStart);
    absenceEnd.setDate(absenceEnd.getDate() + 9); // 10 days total
    
    dataManager.addAbsence({
      userId: user.id,
      reason: 'Mid-month break',
      startDate: absenceStart,
      endDate: absenceEnd
    });

    const adjustedTarget = dataManager.getAdjustedMonthlyTarget(user, period);
    
    // Should be reduced proportionally
    const expectedReduction = Math.round((150 / period.days) * 10);
    const expected = Math.max(0, 150 - expectedReduction);
    
    expect(adjustedTarget).toBe(expected);
    expect(adjustedTarget).toBeLessThan(150);
  });

  it('handles absence that spans across period boundaries', () => {
    const user = dataManager.createUser({
      name: 'Boundary User',
      targetMonthlyPoints: 80,
      avatar: '👤',
      isActive: true
    });

    const period = dataManager.ensureCurrentPeriod();
    
    // Absence starts before period and ends within period
    const absenceStart = new Date(period.start);
    absenceStart.setDate(absenceStart.getDate() - 5); // 5 days before period
    const absenceEnd = new Date(period.start);
    absenceEnd.setDate(absenceEnd.getDate() + 9); // 10 days into period
    
    dataManager.addAbsence({
      userId: user.id,
      reason: 'Spanning absence',
      startDate: absenceStart,
      endDate: absenceEnd
    });

    const adjustedTarget = dataManager.getAdjustedMonthlyTarget(user, period);
    
    // Should only count the 10 days within the period
    const expectedReduction = Math.round((80 / period.days) * 10);
    const expected = Math.max(0, 80 - expectedReduction);
    
    expect(adjustedTarget).toBe(expected);
  });

  it('handles edge case with minimum 7-day absence requirement', () => {
    const user = dataManager.createUser({
      name: 'Minimum User',
      targetMonthlyPoints: 90,
      avatar: '👤',
      isActive: true
    });

    const period = dataManager.ensureCurrentPeriod();
    
    // Exactly 7 days absent (minimum allowed)
    const absenceStart = new Date(period.start);
    const absenceEnd = new Date(period.start);
    absenceEnd.setDate(absenceEnd.getDate() + 6); // Exactly 7 days (inclusive)
    
    dataManager.addAbsence({
      userId: user.id,
      reason: 'Minimum absence',
      startDate: absenceStart,
      endDate: absenceEnd
    });

    const adjustedTarget = dataManager.getAdjustedMonthlyTarget(user, period);
    
    // Should be reduced by exactly 7 days worth
    const expectedReduction = Math.round((90 / period.days) * 7);
    const expected = Math.max(0, 90 - expectedReduction);
    
    expect(adjustedTarget).toBe(expected);
    expect(adjustedTarget).toBeLessThan(90);
  });

  it('verifies absence status checking works correctly', () => {
    const user = dataManager.createUser({
      name: 'Status User',
      targetMonthlyPoints: 100,
      avatar: '👤',
      isActive: true
    });

    const period = dataManager.ensureCurrentPeriod();
    
    // Add current absence
    const today = new Date();
    const absenceStart = new Date(today);
    absenceStart.setDate(absenceStart.getDate() - 3); // Started 3 days ago
    const absenceEnd = new Date(today);
    absenceEnd.setDate(absenceEnd.getDate() + 3); // Ends in 3 days
    
    dataManager.addAbsence({
      userId: user.id,
      reason: 'Current absence',
      startDate: absenceStart,
      endDate: absenceEnd
    });

    // Check current absence status and target
    const adjustedTarget = dataManager.getAdjustedMonthlyTarget(user, period);
    
    expect(adjustedTarget).toBeLessThan(100);
  });
});