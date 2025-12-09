import { dataManager } from '../services/dataManager';

/**
 * Hilfsfunktion zum Generieren von IDs
 */
export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

/**
 * Prüft ob ein User aktuell abwesend ist (gone fishing)
 */
export function isUserCurrentlyAbsent(userId: string, date: Date = new Date()): boolean {
  const activeAbsences = dataManager.getActiveAbsences(userId, date);
  return activeAbsences.length > 0;
}