import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import App from '../App.jsx';
import {
  ensureDebugEnabled,
  openWG,
  openTaskEditor,
  openRatingsOverview
} from './testUtils';

describe('Debug Mode Utilities', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('toggles debug mode (ProfileOverview only) and shows toggle active', async () => {
    render(<App />);
    await ensureDebugEnabled();
    expect(screen.getByTestId('toggle-debug-mode')).toHaveTextContent(/AN/);
  });

  it('prefills multiple distinct demo tasks; repeated click adds only new titles', async () => {
    render(<App />);
    await ensureDebugEnabled();
    await openWG();
    openTaskEditor();
    const btn = screen.getByTestId('debug-prefill-task');
    fireEvent.click(btn);
    const list1 = screen.getByTestId('task-list');
    const firstTitles = Array.from(within(list1).getAllByRole('listitem')).map(li=> li.textContent || '');
    // Second click should add more (if available in name pool) but not duplicate existing titles
    fireEvent.click(btn);
    const list2 = screen.getByTestId('task-list');
    const secondTitles = Array.from(within(list2).getAllByRole('listitem')).map(li=> li.textContent || '');
    const dupes = secondTitles.filter((t,i,arr)=> arr.indexOf(t)!==i);
    expect(dupes.length).toBe(0);
    expect(secondTitles.length).toBeGreaterThanOrEqual(firstTitles.length);
  });

  it('auto-rates all tasks for all members', async () => {
  render(<App />);
  await ensureDebugEnabled();
  await openWG();
  await openRatingsOverview();
    const autoBtn = screen.getByTestId('debug-auto-rate');
    fireEvent.click(autoBtn);
    // All member cards should become completed (Fertig)
    const memberGrid = screen.getByTestId('ratings-member-grid');
    const cards = within(memberGrid).getAllByTestId(/ratings-user-/);
    cards.forEach(card => {
      expect(card).toHaveTextContent(/Fertig/);
    });
  });

  it('auto-rates all tasks for a single member via member page debug button', async () => {
  render(<App />);
  await ensureDebugEnabled();
  await openWG();
  await openRatingsOverview();
    // Open first member rating page
    const memberGrid = screen.getByTestId('ratings-member-grid');
    const firstMemberCard = within(memberGrid).getAllByTestId(/ratings-user-/)[0];
    const openBtn = within(firstMemberCard).getByRole('button');
    fireEvent.click(openBtn);
    await screen.findByTestId('member-ratings-title');
    // Use member auto-rate
    const memberAutoBtn = screen.getByTestId('debug-auto-rate-member');
    fireEvent.click(memberAutoBtn);
    // Save all to persist (though auto uses upsert already, this ensures state)
    fireEvent.click(screen.getByTestId('save-all-ratings-btn'));
    // All task cards for this member should show 'Gespeichert'
    const list = screen.getByTestId('member-task-rating-list');
    const taskCards = within(list).getAllByTestId(/rating-task-/);
    taskCards.forEach(card => {
      expect(card).toHaveTextContent(/Gespeichert/);
    });

    // Idempotency check: clicking again should not change card count or introduce duplicates
    const countBefore = taskCards.length;
    fireEvent.click(memberAutoBtn);
    fireEvent.click(screen.getByTestId('save-all-ratings-btn'));
    const list2 = screen.getByTestId('member-task-rating-list');
    const taskCards2 = within(list2).getAllByTestId(/rating-task-/);
    expect(taskCards2.length).toBe(countBefore);
  });
});
