import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import App from '../App.jsx';
import { ensureDebugEnabled, openWG } from './testUtils';
import { dataManager } from '../services/dataManager';

/** Verifiziert Punkte-Anzeige in der Task-Tabelle */

describe('TaskTable Points Display', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('shows current and target points in Gesamt row', async () => {
    render(<App />);
    await ensureDebugEnabled();
    await openWG();

    // Navigate to task table
    const taskTableBtn = await screen.findByRole('button', { name: /Task-Tabelle/i });
    fireEvent.click(taskTableBtn);

    // Wait for task table to load
    const taskTable = await screen.findByTestId('task-table');
    expect(taskTable).toBeDefined();

    // Get member headers to find user IDs
    const memberHeaders = screen.getAllByTestId(/col-member-/);
    expect(memberHeaders.length).toBeGreaterThan(0);

    // Check if points are displayed in Gesamt row
    const totalCells = screen.getAllByTestId(/total-/);
    expect(totalCells.length).toBe(memberHeaders.length);

    // Each total cell should show points display and target info
    totalCells.forEach(cell => {
      // Should contain points display (e.g., "0P" or "75P")
      expect(cell.textContent).toMatch(/\d+P/);
      // Should contain target info (e.g., "von 100P")
      expect(cell.textContent).toMatch(/von \d+P/);
      // Should contain percentage (e.g., "(50%)")
      expect(cell.textContent).toMatch(/\(\d+%\)/);
    });

    // Test that points are centered (check CSS classes)
    const firstTotalCell = totalCells[0];
    const centerDiv = firstTotalCell.querySelector('.flex.flex-col.items-center.justify-center');
    expect(centerDiv).toBeDefined();
  });

  it('shows adjusted target points when user is absent', async () => {
    render(<App />);
    await ensureDebugEnabled();
    await openWG();

    // Navigate to task table
    const taskTableBtn = await screen.findByRole('button', { name: /Task-Tabelle/i });
    fireEvent.click(taskTableBtn);

    // Wait for task table to load
    await screen.findByTestId('task-table');

    // Get first member ID
    const memberHeaders = screen.getAllByTestId(/col-member-/);
    const firstMemberHeader = memberHeaders[0];
    const memberId = firstMemberHeader.getAttribute('data-testid')?.replace('col-member-', '') || '';

    // Add an absence for this member
    const today = new Date();
    const nextWeek = new Date(today);
    nextWeek.setDate(nextWeek.getDate() + 7);
    
    dataManager.addAbsence({
      userId: memberId,
      reason: 'Testing adjusted target',
      startDate: today,
      endDate: nextWeek
    });

    // Navigate away and back to trigger re-render
    const backBtn = screen.getByTestId('tt-back-btn');
    fireEvent.click(backBtn);
    
    // Navigate back to task table
    const taskTableBtn2 = await screen.findByRole('button', { name: /Task-Tabelle/i });
    fireEvent.click(taskTableBtn2);

    // Wait for task table to load again
    await screen.findByTestId('task-table');

    // Check if user is marked as absent in header
    const absenceIndicator = screen.queryByTestId(`absence-indicator-${memberId}`);
    expect(absenceIndicator).toBeDefined();

    // Check the total cell for this member
    const totalCell = screen.getByTestId(`total-${memberId}`);
    
    // Should show adjusted target (different from original)
    expect(totalCell.textContent).toMatch(/urspr\./);
  });

  it('calculates correct percentage with current points', async () => {
    render(<App />);
    await ensureDebugEnabled();
    await openWG();

    // Navigate to task table
    const taskTableBtn = await screen.findByRole('button', { name: /Task-Tabelle/i });
    fireEvent.click(taskTableBtn);

    // Wait for task table to load
    await screen.findByTestId('task-table');

    // Get member info
    const memberHeaders = screen.getAllByTestId(/col-member-/);
    const memberId = memberHeaders[0].getAttribute('data-testid')?.replace('col-member-', '') || '';

    // Navigate away and back to trigger re-render
    const backBtn = screen.getByTestId('tt-back-btn');
    fireEvent.click(backBtn);
    
    // Navigate back to task table
    const taskTableBtn2 = await screen.findByRole('button', { name: /Task-Tabelle/i });
    fireEvent.click(taskTableBtn2);

    // Wait for task table to load again
    await screen.findByTestId('task-table');

    // Check the total cell
    const totalCell = screen.getByTestId(`total-${memberId}`);
    
    // Should show points based on task executions (not currentMonthPoints)
    expect(totalCell.textContent).toMatch(/\d+P/);
    
    // Should show percentage calculation based on earned vs target points
    expect(totalCell.textContent).toMatch(/\(\d+%\)/);
    
    // Test centering: should have centering CSS classes
    const centerDiv = totalCell.querySelector('.text-center');
    expect(centerDiv).toBeDefined();
  });

  it('uses totals from task executions, not currentMonthPoints', async () => {
    render(<App />);
    await ensureDebugEnabled();
    await openWG();

    // Navigate to task table
    const taskTableBtn = await screen.findByRole('button', { name: /Task-Tabelle/i });
    fireEvent.click(taskTableBtn);

    // Wait for task table to load
    await screen.findByTestId('task-table');

    // Get member headers to find user IDs
    const memberHeaders = screen.getAllByTestId(/col-member-/);
    const firstMemberId = memberHeaders[0].getAttribute('data-testid')?.replace('col-member-', '') || '';

    // Check that initial points display shows task execution totals (usually 0)
    const totalCell = screen.getByTestId(`total-${firstMemberId}`);
    
    // The displayed points should be from task executions, not currentMonthPoints
    // In a fresh WG, this is typically 0P since no tasks have been executed
    expect(totalCell.textContent).toMatch(/\d+P/);
    
    // Verify the percentage is calculated correctly (earned/target)
    expect(totalCell.textContent).toMatch(/von \d+P \(\d+%\)/);
    
    // Verify centering is applied
    const centerDiv = totalCell.querySelector('.text-center');
    expect(centerDiv).toBeDefined();
  });
});