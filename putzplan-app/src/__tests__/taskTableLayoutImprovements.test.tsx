import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import App from '../App.jsx';
import { ensureDebugEnabled, openWG } from './testUtils';

/** Tests für TaskTable Verbesserungen: Kleinere Margins und bessere Zelllinien */

describe('TaskTable Layout Improvements', () => {
  beforeEach(() => { 
    localStorage.clear(); 
  });

  it('has reduced margins and padding for compact task layout', async () => {
    render(<App />);
    await ensureDebugEnabled();
    await openWG();
    
    // Navigate to task table
    const taskTableBtn = await screen.findByRole('button', { name: /Task-Tabelle/i });
    fireEvent.click(taskTableBtn);

    const taskTable = await screen.findByTestId('task-table');
    expect(taskTable).toBeDefined();
    
    // Check task buttons for reduced spacing
    const taskButtons = screen.getAllByTestId(/tt-task-/);
    expect(taskButtons.length).toBeGreaterThan(0);
    
    const firstTaskButton = taskButtons[0];
    
    // Should have reduced gap (gap-1 instead of gap-3)
    expect(firstTaskButton.classList.contains('gap-1')).toBe(true);
    expect(firstTaskButton.classList.contains('gap-3')).toBe(false);
    
    // Should have reduced padding (p-1 instead of p-2)
    expect(firstTaskButton.classList.contains('p-1')).toBe(true);
    expect(firstTaskButton.classList.contains('p-2')).toBe(false);
    
    // Check emoji size is reduced
    const emojiSpan = firstTaskButton.querySelector('span[aria-hidden]');
    expect(emojiSpan?.classList.contains('text-lg') || emojiSpan?.classList.contains('md:text-xl')).toBe(true);
    expect(emojiSpan?.classList.contains('text-xl') || emojiSpan?.classList.contains('md:text-2xl')).toBe(false);
    
    // Check task title has reduced margin
    const titleSpan = firstTaskButton.querySelector('span[data-testid*="task-title"]');
    expect(titleSpan?.classList.contains('pr-1')).toBe(true);
    expect(titleSpan?.classList.contains('pr-2')).toBe(false);
    
    // Check points badge has reduced size
    const pointsSpan = firstTaskButton.querySelector('span[data-testid*="task-points"]');
    expect(pointsSpan?.classList.contains('px-2')).toBe(true);
    expect(pointsSpan?.classList.contains('py-0.5')).toBe(true);
    expect(pointsSpan?.classList.contains('px-3')).toBe(false);
    expect(pointsSpan?.classList.contains('py-1')).toBe(false);
  });

  it('has consistent cell borders throughout the table', async () => {
    render(<App />);
    await ensureDebugEnabled();
    await openWG();
    
    const taskTableBtn = await screen.findByRole('button', { name: /Task-Tabelle/i });
    fireEvent.click(taskTableBtn);

    const taskTable = await screen.findByTestId('task-table');
    expect(taskTable).toBeDefined();
    
    // Check main table border
    expect(taskTable.classList.contains('border')).toBe(true);
    expect(taskTable.classList.contains('border-slate-300')).toBe(true);
    
    // Check header row has strong bottom border
    const headerRow = taskTable.querySelector('thead tr');
    expect(headerRow?.classList.contains('border-b-2')).toBe(true);
    expect(headerRow?.classList.contains('border-slate-400')).toBe(true);
    
    // Check task column has strong right border
    const taskHeader = screen.getByTestId('col-task');
    expect(taskHeader.classList.contains('border-r-2')).toBe(true);
    expect(taskHeader.classList.contains('border-slate-300')).toBe(true);
    
    // Check member columns have right borders
    const memberHeaders = screen.getAllByTestId(/col-member-/);
    memberHeaders.forEach(header => {
      expect(header.classList.contains('border-r')).toBe(true);
      expect(header.classList.contains('border-slate-300')).toBe(true);
    });
    
    // Check task rows have bottom borders
    const taskRows = taskTable.querySelectorAll('tbody tr');
    expect(taskRows.length).toBeGreaterThan(0);
    
    taskRows.forEach(row => {
      expect(row.classList.contains('border-b')).toBe(true);
      expect(row.classList.contains('border-slate-200')).toBe(true);
    });
  });

  it('has proper cell borders in task execution cells', async () => {
    render(<App />);
    await ensureDebugEnabled();
    await openWG();
    
    const taskTableBtn = await screen.findByRole('button', { name: /Task-Tabelle/i });
    fireEvent.click(taskTableBtn);

    const taskTable = await screen.findByTestId('task-table');
    expect(taskTable).toBeDefined();
    
    // Check execution cells have consistent borders
    const executionCells = screen.getAllByTestId(/exec-/);
    expect(executionCells.length).toBeGreaterThan(0);
    
    executionCells.forEach(cell => {
      // Should have right border for column separation
      expect(cell.classList.contains('border-r')).toBe(true);
      expect(cell.classList.contains('border-slate-300')).toBe(true);
    });
    
    // Check task cells maintain strong borders
    const taskCells = taskTable.querySelectorAll('tbody td:first-child');
    expect(taskCells.length).toBeGreaterThan(0);
    
    taskCells.forEach(cell => {
      expect(cell.classList.contains('border-r-2')).toBe(true);
      expect(cell.classList.contains('border-slate-300')).toBe(true);
    });
  });

  it('has reduced vertical padding for compact rows', async () => {
    render(<App />);
    await ensureDebugEnabled();
    await openWG();
    
    const taskTableBtn = await screen.findByRole('button', { name: /Task-Tabelle/i });
    fireEvent.click(taskTableBtn);

    const taskTable = await screen.findByTestId('task-table');
    expect(taskTable).toBeDefined();
    
    // Check task cells have reduced padding
    const taskCells = taskTable.querySelectorAll('tbody td:first-child');
    expect(taskCells.length).toBeGreaterThan(0);
    
    taskCells.forEach(cell => {
      expect(cell.classList.contains('py-2') || cell.classList.contains('md:py-3')).toBe(true);
      expect(cell.classList.contains('py-3') || cell.classList.contains('md:py-4')).toBe(false);
    });
    
    // Check execution cells have reduced padding
    const executionCells = screen.getAllByTestId(/exec-/);
    executionCells.forEach(cell => {
      expect(cell.classList.contains('py-2') || cell.classList.contains('md:py-3')).toBe(true);
      expect(cell.classList.contains('py-3') || cell.classList.contains('md:py-4')).toBe(false);
    });
  });

  it('maintains footer borders with proper separation', async () => {
    render(<App />);
    await ensureDebugEnabled();
    await openWG();
    
    const taskTableBtn = await screen.findByRole('button', { name: /Task-Tabelle/i });
    fireEvent.click(taskTableBtn);

    const taskTable = await screen.findByTestId('task-table');
    expect(taskTable).toBeDefined();
    
    // Check footer section exists
    const footerSection = taskTable.querySelector('tfoot');
    expect(footerSection).toBeDefined();
    
    // Check first footer row (totals) has strong top border
    const totalRow = footerSection?.querySelector('tr:first-child');
    expect(totalRow?.classList.contains('border-t-2')).toBe(true);
    expect(totalRow?.classList.contains('border-slate-400')).toBe(true);
    
    // Check second footer row (percentage) has top border
    const percentRow = footerSection?.querySelector('tr:last-child');
    expect(percentRow?.classList.contains('border-t')).toBe(true);
    expect(percentRow?.classList.contains('border-slate-400')).toBe(true);
    
    // Check total cells have proper structure
    const totalCells = screen.getAllByTestId(/total-/);
    expect(totalCells.length).toBeGreaterThan(0);
    
    totalCells.forEach(cell => {
      expect(cell.classList.contains('border-r')).toBe(true);
      expect(cell.classList.contains('border-slate-300')).toBe(true);
    });
  });

  it('handles hover effects with borders maintained', async () => {
    render(<App />);
    await ensureDebugEnabled();
    await openWG();
    
    const taskTableBtn = await screen.findByRole('button', { name: /Task-Tabelle/i });
    fireEvent.click(taskTableBtn);

    const taskTable = await screen.findByTestId('task-table');
    expect(taskTable).toBeDefined();
    
    // Check task rows have hover effects
    const taskRows = taskTable.querySelectorAll('tbody tr');
    expect(taskRows.length).toBeGreaterThan(0);
    
    taskRows.forEach(row => {
      expect(row.classList.contains('hover:bg-slate-25')).toBe(true);
      expect(row.classList.contains('transition-colors')).toBe(true);
    });
    
    // Check task buttons have hover effects
    const taskButtons = screen.getAllByTestId(/tt-task-/);
    taskButtons.forEach(button => {
      expect(button.classList.contains('hover:bg-amber-50/80')).toBe(true);
    });
  });

  it('maintains responsive design with compact layout', async () => {
    render(<App />);
    await ensureDebugEnabled();
    await openWG();
    
    const taskTableBtn = await screen.findByRole('button', { name: /Task-Tabelle/i });
    fireEvent.click(taskTableBtn);

    const taskTable = await screen.findByTestId('task-table');
    expect(taskTable).toBeDefined();
    
    // Check table has responsive text
    expect(taskTable.classList.contains('text-[16px]') || taskTable.classList.contains('md:text-[18px]')).toBe(true);
    
    // Check task titles have responsive sizes
    const taskTitles = screen.getAllByTestId(/task-title-/);
    taskTitles.forEach(title => {
      expect(title.classList.contains('text-sm') || title.classList.contains('md:text-base')).toBe(true);
    });
    
    // Check points badges have responsive sizes
    const pointsBadges = screen.getAllByTestId(/task-points-/);
    pointsBadges.forEach(badge => {
      expect(badge.classList.contains('text-xs') || badge.classList.contains('md:text-sm')).toBe(true);
    });
    
    // Check emojis have responsive sizes
    const taskButtons = screen.getAllByTestId(/tt-task-/);
    taskButtons.forEach(button => {
      const emoji = button.querySelector('span[aria-hidden]');
      expect(emoji?.classList.contains('text-lg') || emoji?.classList.contains('md:text-xl')).toBe(true);
    });
  });

  it('has consistent border system across all table elements', async () => {
    render(<App />);
    await ensureDebugEnabled();
    await openWG();
    
    const taskTableBtn = await screen.findByRole('button', { name: /Task-Tabelle/i });
    fireEvent.click(taskTableBtn);

    const taskTable = await screen.findByTestId('task-table');
    expect(taskTable).toBeDefined();
    
    // Check border consistency throughout table
    const allCells = taskTable.querySelectorAll('th, td');
    expect(allCells.length).toBeGreaterThan(0);
    
    // Count cells with right borders
    const cellsWithRightBorder = Array.from(allCells).filter(cell => 
      cell.classList.contains('border-r') || cell.classList.contains('border-r-2')
    );
    
    // Should have many cells with right borders for proper grid structure
    expect(cellsWithRightBorder.length).toBeGreaterThan(allCells.length / 2);
    
    // Check that slate-300 is the primary border color
    const cellsWithSlateBorder = Array.from(allCells).filter(cell =>
      cell.className.includes('border-slate-300')
    );
    expect(cellsWithSlateBorder.length).toBeGreaterThan(0);
  });
});