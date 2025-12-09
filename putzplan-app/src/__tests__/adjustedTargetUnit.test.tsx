import { describe, it, expect, beforeEach } from 'vitest';
import { dataManager } from '../services/dataManager';

/** Unit Tests für getAdjustedMonthlyTarget Logik */

describe('getAdjustedMonthlyTarget Unit Tests', () => {
  beforeEach(() => {
    dataManager.clearAllData();
  });

  it('returns original target for no absence', () => {
    const user = dataManager.createUser({
      name: 'Test User',
      targetMonthlyPoints: 100,
      avatar: '👤',
      isActive: true
    });

    const period = dataManager.ensureCurrentPeriod();
    const adjustedTarget = dataManager.getAdjustedMonthlyTarget(user, period);
    
    expect(adjustedTarget).toBe(100);
  });

  it('returns 0 for full month absence', () => {
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

    const adjustedTarget = dataManager.getAdjustedMonthlyTarget(user, period);
    
    expect(adjustedTarget).toBe(0);
  });

  it('calculates correct reduction for partial absence', () => {
    const user = dataManager.createUser({
      name: 'Test User',
      targetMonthlyPoints: 100,
      avatar: '👤',
      isActive: true
    });

    const period = dataManager.ensureCurrentPeriod();
    
    // Add 10 days absence in a 31-day month
    const startDate = new Date(period.start);
    const endDate = new Date(period.start);
    endDate.setDate(endDate.getDate() + 9); // 10 days (inclusive)
    
    dataManager.addAbsence({
      userId: user.id,
      reason: '10 days away',
      startDate,
      endDate
    });

    const adjustedTarget = dataManager.getAdjustedMonthlyTarget(user, period);
    
    // Expected: 100 - (100/31 * 10) = 100 - 32.26 = 68 (rounded)
    const expectedReduction = Math.round((100 / period.days) * 10);
    const expected = Math.max(0, 100 - expectedReduction);
    
    expect(adjustedTarget).toBe(expected);
  });

  it('handles absence outside period boundaries', () => {
    const user = dataManager.createUser({
      name: 'Test User',
      targetMonthlyPoints: 100,
      avatar: '👤',
      isActive: true
    });

    const period = dataManager.ensureCurrentPeriod();
    
    // Absence completely outside period (7+ days)
    const outsideStart = new Date(period.end);
    outsideStart.setDate(outsideStart.getDate() + 1);
    const outsideEnd = new Date(outsideStart);
    outsideEnd.setDate(outsideEnd.getDate() + 6); // 7 days total
    
    dataManager.addAbsence({
      userId: user.id,
      reason: 'Outside period',
      startDate: outsideStart,
      endDate: outsideEnd
    });

    const adjustedTarget = dataManager.getAdjustedMonthlyTarget(user, period);
    
    // Should be unchanged
    expect(adjustedTarget).toBe(100);
  });

  it('clips absence to period boundaries', () => {
    const user = dataManager.createUser({
      name: 'Test User',
      targetMonthlyPoints: 100,
      avatar: '👤',
      isActive: true
    });

    const period = dataManager.ensureCurrentPeriod();
    
    // Absence starts before period and ends within period
    const beforeStart = new Date(period.start);
    beforeStart.setDate(beforeStart.getDate() - 5);
    const withinEnd = new Date(period.start);
    withinEnd.setDate(withinEnd.getDate() + 9); // 10 days into period
    
    dataManager.addAbsence({
      userId: user.id,
      reason: 'Spanning period start',
      startDate: beforeStart,
      endDate: withinEnd
    });

    const adjustedTarget = dataManager.getAdjustedMonthlyTarget(user, period);
    
    // Should only count the 10 days within period
    const expectedReduction = Math.round((100 / period.days) * 10);
    const expected = Math.max(0, 100 - expectedReduction);
    
    expect(adjustedTarget).toBe(expected);
  });

  it('handles multiple non-overlapping absences', () => {
    const user = dataManager.createUser({
      name: 'Test User',
      targetMonthlyPoints: 100,
      avatar: '👤',
      isActive: true
    });

    const period = dataManager.ensureCurrentPeriod();
    
    // Add first absence: days 1-7 (7 days)
    const firstStart = new Date(period.start);
    const firstEnd = new Date(period.start);
    firstEnd.setDate(firstEnd.getDate() + 6); // 7 days
    
    dataManager.addAbsence({
      userId: user.id,
      reason: 'First absence',
      startDate: firstStart,
      endDate: firstEnd
    });

    // Add second absence: days 15-21 (7 days, non-overlapping)
    const secondStart = new Date(period.start);
    secondStart.setDate(secondStart.getDate() + 14); // day 15
    const secondEnd = new Date(period.start);
    secondEnd.setDate(secondEnd.getDate() + 20); // day 21
    
    dataManager.addAbsence({
      userId: user.id,
      reason: 'Second absence',
      startDate: secondStart,
      endDate: secondEnd
    });

    const adjustedTarget = dataManager.getAdjustedMonthlyTarget(user, period);
    
    // Should sum both absences: 7 + 7 = 14 days
    const expectedReduction = Math.round((100 / period.days) * 14);
    const expected = Math.max(0, 100 - expectedReduction);
    
    expect(adjustedTarget).toBe(expected);
  });
});