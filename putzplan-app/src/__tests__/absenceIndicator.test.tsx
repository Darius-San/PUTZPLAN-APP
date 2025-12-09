import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import App from '../App.jsx';
import { ensureDebugEnabled, openWG } from './testUtils';
import { dataManager } from '../services/dataManager';

/** Verifiziert Abwesenheits-Indikator (Gone Fishing) in der Task-Tabelle */

describe('Absence Indicator (Gone Fishing)', () => {
  beforeEach(() => { 
    localStorage.clear(); 
  });

  it('shows fishing indicator for absent users in task table header', async () => {
    render(<App />);
    await ensureDebugEnabled();
    await openWG();
    
    // Navigate to task table
    const taskTableBtn = await screen.findByRole('button', { name: /Task-Tabelle/i });
    fireEvent.click(taskTableBtn);

    // Wait for task table to load
    const taskTable = await screen.findByTestId('task-table');
    expect(taskTable).toBeDefined();

    // Get first member from the table header
    const memberHeaders = screen.getAllByTestId(/col-member-/);
    expect(memberHeaders.length).toBeGreaterThan(0);
    
    const firstMemberHeader = memberHeaders[0];
    const memberId = firstMemberHeader.getAttribute('data-testid')?.replace('col-member-', '') || '';
    
    // Initially no absence indicator should be present
    const initialAbsenceIndicator = screen.queryByTestId(`absence-indicator-${memberId}`);
    expect(initialAbsenceIndicator).toBeNull();

    // Add an absence for this member (must be at least 7 days)
    const today = new Date();
    const nextWeek = new Date(today);
    nextWeek.setDate(nextWeek.getDate() + 7);
    
    dataManager.addAbsence({
      userId: memberId,
      reason: 'Testing gone fishing indicator',
      startDate: today,
      endDate: nextWeek
    });

    // Go back and forth to task table to trigger re-render
    const backBtn = screen.getByTestId('tt-back-btn');
    fireEvent.click(backBtn);
    
    const taskTableBtn2 = await screen.findByRole('button', { name: /Task-Tabelle/i });
    fireEvent.click(taskTableBtn2);

    // Now the absence indicator should appear (there will be one exec-cell per task for this member)
    const absenceIndicators = await screen.findAllByTestId(`absence-indicator-${memberId}`);
    expect(absenceIndicators.length).toBeGreaterThan(0);

    // Verify each indicator contains the combined fishing emoji + wave and has the indicator class
    absenceIndicators.forEach(ind => {
      expect(ind.textContent).toBe('🎣〜');
      expect(ind.classList.contains('absence-indicator')).toBe(true);
      // Verify tooltip
      expect(ind.getAttribute('title')).toBe('Abwesend (Gone Fishing)');
    });
  });

  it('hides absence indicator when user is not absent', async () => {
    render(<App />);
    await ensureDebugEnabled();
    await openWG();
    
    // Navigate to task table
    const taskTableBtn = await screen.findByRole('button', { name: /Task-Tabelle/i });
    fireEvent.click(taskTableBtn);

    // Wait for task table to load
    await screen.findByTestId('task-table');

    // Get second member (to avoid conflicts with first test)
    const memberHeaders = screen.getAllByTestId(/col-member-/);
    expect(memberHeaders.length).toBeGreaterThan(1);
    const secondMemberHeader = memberHeaders[1];
    const memberId = secondMemberHeader.getAttribute('data-testid')?.replace('col-member-', '') || '';

    // Add an absence in the past (not current) - must be at least 7 days
    const lastMonth = new Date();
    lastMonth.setDate(lastMonth.getDate() - 14);
    const weekAfter = new Date(lastMonth);
    weekAfter.setDate(weekAfter.getDate() + 7);
    
    dataManager.addAbsence({
      userId: memberId,
      reason: 'Past absence',
      startDate: lastMonth,
      endDate: weekAfter
    });

    // Go back and forth to trigger re-render
    const backBtn = screen.getByTestId('tt-back-btn');
    fireEvent.click(backBtn);
    
    const taskTableBtn2 = await screen.findByRole('button', { name: /Task-Tabelle/i });
    fireEvent.click(taskTableBtn2);

    // Wait for task table again
    await screen.findByTestId('task-table');

  // Absence indicator should NOT appear for past absences (no exec-cell indicator)
  const absenceIndicator = screen.queryByTestId(`absence-indicator-${memberId}`);
  expect(absenceIndicator).toBeNull();

  // Verify this specific member has no ABWESEND badge in their column header (we removed header badges)
  const memberHeader = screen.getByTestId(`col-member-${memberId}`);
  const absenceBadgeInThisColumn = memberHeader.querySelector('.absence-badge');
  expect(absenceBadgeInThisColumn).toBeNull();
  });

  it('applies correct CSS classes for animation', async () => {
    render(<App />);
    await ensureDebugEnabled();
    await openWG();
    
    const taskTableBtn = await screen.findByRole('button', { name: /Task-Tabelle/i });
    fireEvent.click(taskTableBtn);

    // Wait for task table to load
    await screen.findByTestId('task-table');

    const memberHeaders = screen.getAllByTestId(/col-member-/);
    expect(memberHeaders.length).toBeGreaterThan(2);
    // Use third member to avoid conflicts
    const thirdMemberHeader = memberHeaders[2] || memberHeaders[0];
    const memberId = thirdMemberHeader.getAttribute('data-testid')?.replace('col-member-', '') || '';
    
    // Add current absence (must be at least 7 days)
    const today = new Date();
    const twoWeeksLater = new Date(today);
    twoWeeksLater.setDate(twoWeeksLater.getDate() + 14);
    
    dataManager.addAbsence({
      userId: memberId,
      reason: 'Testing CSS classes',
      startDate: today,
      endDate: twoWeeksLater
    });

    // Go back and forth to trigger re-render
    const backBtn = screen.getByTestId('tt-back-btn');
    fireEvent.click(backBtn);
    
    const taskTableBtn2 = await screen.findByRole('button', { name: /Task-Tabelle/i });
    fireEvent.click(taskTableBtn2);

    // Wait for task table again
    await screen.findByTestId('task-table');

  const absenceIndicators = await screen.findAllByTestId(`absence-indicator-${memberId}`);
  expect(absenceIndicators.length).toBeGreaterThan(0);

  // Verify CSS classes are applied and content is correct for at least one indicator
  const absenceIndicator = absenceIndicators[0];
  expect(absenceIndicator.classList.contains('absence-indicator')).toBe(true);
  expect(absenceIndicator.textContent).toBe('🎣〜');
  });
});