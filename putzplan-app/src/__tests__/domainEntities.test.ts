import { renderHook, act } from '@testing-library/react';
import { usePutzplanStore } from '../hooks/usePutzplanStore';

// Basic smoke tests for new domain entity APIs

describe('Domain entity integrations', () => {
  test('create absence and filter active', () => {
    const { result } = renderHook(() => usePutzplanStore());

    // Ensure a user exists
    let user = result.current.currentUser;
    if (!user) {
      act(() => {
        user = result.current.createUser({ name: 'Anna', targetMonthlyPoints: 100 });
      });
    }
    expect(user).toBeTruthy();

    const start = new Date();
    const end = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);

    act(() => {
      result.current.createAbsence({
        userId: user!.id,
        type: 'vacation' as any,
        reason: 'Urlaub',
        startDate: start,
        endDate: end,
        createdBy: user!.id,
        autoApprove: true
      });
    });

    const active = result.current.listActiveAbsencesForUser(user!.id);
    expect(active.length).toBe(1);
    expect(active[0].reason).toBe('Urlaub');
  });

  test('temporary resident active listing', () => {
    const { result } = renderHook(() => usePutzplanStore());
    const now = new Date();
    const later = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000);

    act(() => {
      result.current.addTemporaryResident({
        name: 'Gast',
        icon: '🧪',
        startDate: now,
        endDate: later,
        profileId: 'demo-profile'
      });
    });

    const list = result.current.activeTemporaryResidents;
    expect(list.length).toBe(1);
    expect(list[0].name).toBe('Gast');
  });

  test('urgent task lifecycle', () => {
    const { result } = renderHook(() => usePutzplanStore());

    // create user & task first
    let user = result.current.currentUser;
    if (!user) {
      act(() => {
        user = result.current.createUser({ name: 'Paul', targetMonthlyPoints: 80 });
      });
    }

    act(() => {
      result.current.createUrgentTask({
        taskId: 'fake-task',
        createdBy: user!.id,
        reason: 'Spontan Kontrolle'
      });
    });

    expect(result.current.activeUrgentTasks.length).toBe(1);
    const urg = result.current.activeUrgentTasks[0];

    act(() => {
      result.current.resolveUrgentTask(urg.id, user!.id);
    });

    expect(result.current.activeUrgentTasks.length).toBe(0);
  });
});
