import { describe, it, expect } from 'vitest';
import { dataManager } from '../services/dataManager';
import { ensureSeed } from '../services/seed';

/**
 * Extreme Minutes Clamp Test
 * Verifiziert, dass sehr hohe Minutenwerte (estimatedMinutes) durch den timeMultiplier Clamp (max 3.0x) begrenzt werden.
 * Ablauf:
 * 1. Seed laden
 * 2. Einen Task ("Küche") wählen
 * 3. Recalc -> Basis-Punkte
 * 4. Extrem hohe Minuten (480) für alle Mitglieder setzen -> Punkte steigen
 * 5. Noch extremere Minuten (2000) setzen -> Punkte steigen NICHT weiter (Clamp erreicht)
 */

describe('Extreme Minutes Clamp', () => {
  it('begrenzen Punkte-Zuwachs nach Erreichen des Zeit-Clamps', () => {
    ensureSeed();
    dataManager.recalculateTaskPoints();
    const initialState = dataManager.getState();
    const task = Object.values(initialState.tasks).find(t => t.title.toLowerCase().includes('küche')) as any;
    if (!task) throw new Error('Kein Task Küche gefunden');
    const members = initialState.currentWG!.memberIds;

    const before = dataManager.getState().tasks[task.id].pointsPerExecution;

    // Setze extreme (aber plausible) Minutenwerte
    members.forEach(uid => {
      dataManager.upsertTaskRatingForUser(uid, task.id, {
        estimatedMinutes: 480, // 8h
        painLevel: 5,
        importance: 5,
        suggestedFrequency: 4
      });
    });
    dataManager.recalculateTaskPoints();
    const afterFirst = dataManager.getState().tasks[task.id].pointsPerExecution;
    expect(afterFirst).toBeGreaterThan(before);

    // Noch extremer -> sollte wegen Clamp keinen weiteren Anstieg bringen
    members.forEach(uid => {
      dataManager.upsertTaskRatingForUser(uid, task.id, {
        estimatedMinutes: 2000, // > 33h
        painLevel: 5,
        importance: 5,
        suggestedFrequency: 4
      });
    });
    dataManager.recalculateTaskPoints();
    const afterSecond = dataManager.getState().tasks[task.id].pointsPerExecution;
    expect(afterSecond).toBe(afterFirst);
  });
});