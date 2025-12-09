import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import App from '../App.jsx';
import { ensureDebugEnabled, openWG } from './testUtils';
import { dataManager } from '../services/dataManager';

/** Tests für TaskTable Verbesserungen: Spaltenbreite, Borders, größere Task-Namen */

describe('TaskTable Improvements', () => {
  beforeEach(() => { 
    localStorage.clear(); 
  });

  it('maintains consistent column widths even with absent users', async () => {
    render(<App />);
    await ensureDebugEnabled();
    await openWG();
    
    // Navigate to task table
    const taskTableBtn = await screen.findByRole('button', { name: /Task-Tabelle/i });
    fireEvent.click(taskTableBtn);

    // Wait for task table to load
    const taskTable = await screen.findByTestId('task-table');
    expect(taskTable).toBeDefined();

    // Check if table has CSS constraints that prevent expansion
    const styledContainer = taskTable.closest('[style*="--col-member-width"]') as HTMLElement;
    expect(styledContainer).toBeDefined();
    
    // Check if CSS variables contain constraints
    const computedStyle = window.getComputedStyle(styledContainer);
    const memberWidth = computedStyle.getPropertyValue('--col-member-width');
    
    // Should have minmax with minimum width constraint
    expect(memberWidth).toContain('110px'); // Updated minimum width
    expect(memberWidth).toContain('minmax'); // Grid minmax function
    
    // Check member headers have consistent structure
    const memberHeaders = screen.getAllByTestId(/col-member-/);
    expect(memberHeaders.length).toBeGreaterThan(2);
    
    // All member headers should have the same CSS classes for consistency
    const firstHeaderClasses = memberHeaders[0].className;
    const secondHeaderClasses = memberHeaders[1].className;
    
    // Should have similar styling for consistent appearance
    expect(firstHeaderClasses).toContain('border-r');
    expect(secondHeaderClasses).toContain('border-r');
  });

  it('displays proper table borders and grid structure', async () => {
    render(<App />);
    await ensureDebugEnabled();
    await openWG();
    
    const taskTableBtn = await screen.findByRole('button', { name: /Task-Tabelle/i });
    fireEvent.click(taskTableBtn);

    const taskTable = await screen.findByTestId('task-table');
    expect(taskTable).toBeDefined();
    
    // Check if table has border
    expect(taskTable.classList.contains('border-2')).toBe(true);
    expect(taskTable.classList.contains('border-slate-300')).toBe(true);
    
    // Check header row has proper border
    const headerRow = taskTable.querySelector('thead tr');
    expect(headerRow?.classList.contains('border-b-2')).toBe(true);
    expect(headerRow?.classList.contains('border-slate-400')).toBe(true);
    
    // Check task column has right border
    const taskHeader = screen.getByTestId('col-task');
    expect(taskHeader.classList.contains('border-r')).toBe(true);
    expect(taskHeader.classList.contains('border-slate-300')).toBe(true);
    
    // Check member columns have right borders
    const memberHeaders = screen.getAllByTestId(/col-member-/);
    memberHeaders.forEach(header => {
      expect(header.classList.contains('border-r')).toBe(true);
      expect(header.classList.contains('border-slate-300')).toBe(true);
    });
  });

  it('has larger responsive text sizes for task names and emoji', async () => {
    render(<App />);
    await ensureDebugEnabled();
    await openWG();
    
    const taskTableBtn = await screen.findByRole('button', { name: /Task-Tabelle/i });
    fireEvent.click(taskTableBtn);

    const taskTable = await screen.findByTestId('task-table');
    expect(taskTable).toBeDefined();
    
    // Check table has responsive text size
    expect(taskTable.classList.contains('text-[16px]') || taskTable.classList.contains('md:text-[18px]')).toBe(true);
    
    // Check task buttons exist and have larger styling
    const taskButtons = screen.getAllByTestId(/tt-task-/);
    expect(taskButtons.length).toBeGreaterThan(0);
    
    const firstTaskButton = taskButtons[0];
    
    // Check task button has proper spacing (now larger)
    expect(firstTaskButton.classList.contains('gap-2')).toBe(true);
    expect(firstTaskButton.classList.contains('px-3')).toBe(true);
    expect(firstTaskButton.classList.contains('py-3')).toBe(true);
    expect(firstTaskButton.classList.contains('min-h-[60px]')).toBe(true);
    
    // Check for emoji size (now larger)
    const emoji = firstTaskButton.querySelector('span[aria-hidden]');
    expect(emoji?.classList.contains('text-2xl') || emoji?.classList.contains('md:text-3xl')).toBe(true);
    
    // Check task title has responsive text (now larger)
    const titleSpan = firstTaskButton.querySelector('span[data-testid*="task-title"]');
    expect(titleSpan?.classList.contains('text-base') || titleSpan?.classList.contains('md:text-lg')).toBe(true);
    
    // Check points badge has responsive text (now larger)
    const pointsSpan = firstTaskButton.querySelector('span[data-testid*="task-points"]');
    expect(pointsSpan?.classList.contains('text-sm') || pointsSpan?.classList.contains('md:text-base')).toBe(true);
  });

  it('has improved spacing in header and footer rows', async () => {
    render(<App />);
    await ensureDebugEnabled();
    await openWG();
    
    const taskTableBtn = await screen.findByRole('button', { name: /Task-Tabelle/i });
    fireEvent.click(taskTableBtn);

    const taskTable = await screen.findByTestId('task-table');
    expect(taskTable).toBeDefined();
    
    // Check header padding
    const taskHeader = screen.getByTestId('col-task');
    expect(taskHeader.classList.contains('py-4') || taskHeader.classList.contains('md:py-5')).toBe(true);
    
    // Check member headers have proper padding
    const memberHeaders = screen.getAllByTestId(/col-member-/);
    memberHeaders.forEach(header => {
      expect(header.classList.contains('py-4') || header.classList.contains('md:py-5')).toBe(true);
    });
    
    // Check if footer rows exist and have proper spacing
    const footerRows = taskTable.querySelectorAll('tfoot tr');
    expect(footerRows.length).toBeGreaterThan(0);
    
    footerRows.forEach(row => {
      const cells = row.querySelectorAll('th, td');
      cells.forEach(cell => {
        expect(
          cell.classList.contains('py-4') || 
          cell.classList.contains('md:py-5') ||
          cell.classList.contains('py-3') ||
          cell.classList.contains('md:py-4')
        ).toBe(true);
      });
    });
  });

  it('maintains responsive design across different screen sizes', async () => {
    render(<App />);
    await ensureDebugEnabled();
    await openWG();
    
    const taskTableBtn = await screen.findByRole('button', { name: /Task-Tabelle/i });
    fireEvent.click(taskTableBtn);

    const taskTable = await screen.findByTestId('task-table');
    expect(taskTable).toBeDefined();
    
    // Check table wrapper has overflow handling
    const tableWrapper = taskTable.closest('div');
    expect(tableWrapper).toBeDefined();
    
    // Check if CSS variables are set for responsive column sizing
    const containerWithStyle = taskTable.closest('[style*="--col-task-width"]');
    expect(containerWithStyle).toBeDefined();
    
    // Task column should have responsive text sizing
    const taskColumn = screen.getByTestId('col-task');
    expect(taskColumn.classList.contains('text-base') || taskColumn.classList.contains('md:text-lg') || taskColumn.classList.contains('py-4')).toBe(true);
    
    // Member columns should have responsive padding
    const memberHeaders = screen.getAllByTestId(/col-member-/);
    memberHeaders.forEach(header => {
      expect(header.classList.contains('py-4') || header.classList.contains('md:py-5')).toBe(true);
    });
  });

  it('handles many tasks without layout breaking', async () => {
    render(<App />);
    await ensureDebugEnabled();
    await openWG();
    
    const taskTableBtn = await screen.findByRole('button', { name: /Task-Tabelle/i });
    fireEvent.click(taskTableBtn);

    const taskTable = await screen.findByTestId('task-table');
    expect(taskTable).toBeDefined();
    
    // Check if task rows exist (we already have demo tasks from seed data)
    const taskButtons = screen.getAllByTestId(/tt-task-/);
    expect(taskButtons.length).toBeGreaterThan(5); // Should have multiple tasks
    
    // Check if all task rows are properly structured
    taskButtons.forEach(button => {
      expect(button.querySelector('span[aria-hidden]')).toBeDefined(); // Emoji
      expect(button.querySelector('span[data-testid*="task-title"]')).toBeDefined(); // Title
      expect(button.querySelector('span[data-testid*="task-points"]')).toBeDefined(); // Points
    });
    
    // Check if footer totals exist and are working
    const totalCells = screen.getAllByTestId(/total-/);
    expect(totalCells.length).toBeGreaterThan(0);
    
    // Check if each total cell shows points and percentages
    totalCells.forEach(cell => {
      const text = cell.textContent || '';
      expect(text).toMatch(/\d+P/); // Should show points
      expect(text).toMatch(/\d+%/); // Should show percentage
    });
    
    // Check if table maintains structure with scrolling capability
    const tableWrapper = taskTable.closest('div');
    expect(tableWrapper).toBeDefined();
  });

  it('properly handles CSS custom properties for column sizing', async () => {
    render(<App />);
    await ensureDebugEnabled();
    await openWG();
    
    const taskTableBtn = await screen.findByRole('button', { name: /Task-Tabelle/i });
    fireEvent.click(taskTableBtn);

    const taskTable = await screen.findByTestId('task-table');
    expect(taskTable).toBeDefined();
    
    // Get the container with CSS variables
    const styledContainer = taskTable.closest('[style*="--col-task-width"]') as HTMLElement;
    expect(styledContainer).toBeDefined();
    
    // Check if CSS variables are properly set
    const computedStyle = window.getComputedStyle(styledContainer);
    const taskWidth = computedStyle.getPropertyValue('--col-task-width');
    const memberWidth = computedStyle.getPropertyValue('--col-member-width');
    
    expect(taskWidth).toContain('clamp');
    expect(taskWidth).toContain('260px'); // Updated minimum
    expect(taskWidth).toContain('360px'); // Updated maximum
    
    expect(memberWidth).toContain('110px'); // Updated minimum
    expect(memberWidth).toContain('calc');
    
    // Check if columns actually use these variables
    const taskHeader = screen.getByTestId('col-task');
    const taskHeaderStyle = window.getComputedStyle(taskHeader);
    expect(taskHeaderStyle.width).toBeDefined();
    expect(taskHeaderStyle.minWidth).toBeDefined();
    expect(taskHeaderStyle.maxWidth).toBeDefined();
  });
});