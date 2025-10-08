import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import App from '../App.jsx';
import { dataManager } from '../services/dataManager';
import { ensureDebugEnabled, openWG } from './testUtils';

async function openAbsenceView() {
  render(<App />);
  await ensureDebugEnabled();
  await openWG();
  fireEvent.click(await screen.findByTestId('absence-management-btn'));
  await screen.findByTestId('member-selection-cards');
}

describe('Absence Member Anzahl Varianten', () => {
  beforeEach(() => {
    localStorage.clear();
    (dataManager as any)._TEST_reset?.();
  });

  it('funktioniert mit nur einem Mitglied', async () => {
    // künstlich WG mit einem Member bauen
    // noop fallback (falls künftig Hilfsfunktion existiert)
    if (typeof (dataManager as any).updateTestState === 'function') {
      (dataManager as any).updateTestState();
    }
    const state = dataManager.getState();
    // Minimal ein User
    const singleUser = { id: 'solo', name: 'Solo', avatar: '🧍', email: 'solo@example.com', joinedAt: new Date(), isActive: true, currentMonthPoints:0, targetMonthlyPoints:100, totalCompletedTasks:0 };
    (state as any).users = { solo: singleUser };
    (state as any).currentUser = singleUser;
    const wg = { id:'wgSolo', name:'SoloWG', description:'', memberIds:['solo'], inviteCode:'X', createdAt:new Date(), settings:{ monthlyPointsTarget:100, reminderSettings:{ lowPointsThreshold:20, overdueDaysThreshold:3, enablePushNotifications:false } } };
    (state as any).currentWG = wg;
    (state as any).wgs = { [wg.id]: wg };
    // direct mutate + persist
    (dataManager as any).state = state; // internal override for test
    (dataManager as any).saveToStorage?.();

    await openAbsenceView();
    const grid = screen.getByTestId('member-selection-cards');
    expect(grid.querySelectorAll('[data-testid^="member-card-"]').length).toBe(1);
  });

  it('funktioniert mit zehn Mitgliedern', async () => {
    const state = dataManager.getState();
    const users: any = {};
    const memberIds: string[] = [];
    for (let i=1;i<=10;i++) {
      const id = 'uX'+i;
      memberIds.push(id);
      users[id] = { id, name: 'User'+i, avatar: '😀', email: id+'@ex.com', joinedAt:new Date(), isActive:true, currentMonthPoints:0, targetMonthlyPoints:100, totalCompletedTasks:0 };
    }
    (state as any).users = users;
    (state as any).currentUser = users['uX1'];
    const wg = { id:'wg10', name:'WG10', description:'', memberIds, inviteCode:'Y', createdAt:new Date(), settings:{ monthlyPointsTarget:100, reminderSettings:{ lowPointsThreshold:20, overdueDaysThreshold:3, enablePushNotifications:false } } };
    (state as any).currentWG = wg;
    (state as any).wgs = { [wg.id]: wg };
    (dataManager as any).state = state;
    (dataManager as any).saveToStorage?.();

    await openAbsenceView();
    const cards = screen.getAllByTestId(/member-card-/);
    expect(cards.length).toBe(10);
  });
});
