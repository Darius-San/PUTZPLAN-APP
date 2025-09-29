import { Task, TaskRating, User, TaskExecution, TaskSuggestion, SuggestionReason, MonthlyUserStats, ExecutionStatus } from '../types';

// ========================================
// PUNKTESYSTEM & BEWERTUNGSLOGIK
// ========================================

/**
 * Berechnet die finalen Punkte für einen Task basierend auf:
 * - Grundpunkten
 * - Gemittelten Bewertungen aller WG-Mitglieder
 * - Schwierigkeit und Unangenehmheit
 */
export function calculateTaskPoints(task: Task, ratings: TaskRating[]): number {
  const basePoints = task.basePoints || 10;
  
  if (ratings.length === 0) {
    // Fallback auf Task-eigene Bewertungen
    const difficultyMultiplier = 1 + (task.difficultyScore - 1) * 0.2; // 1.0 - 1.8
    const unpleasantnessMultiplier = 1 + (task.unpleasantnessScore - 1) * 0.3; // 1.0 - 2.2
    return Math.round(basePoints * difficultyMultiplier * unpleasantnessMultiplier);
  }
  
  // Durchschnittswerte aus allen Bewertungen
  const avgDifficulty = ratings.reduce((sum, r) => sum + r.difficultyRating, 0) / ratings.length;
  const avgUnpleasantness = ratings.reduce((sum, r) => sum + r.unpleasantnessRating, 0) / ratings.length;
  
  // Multiplier berechnen
  const difficultyMultiplier = 1 + (avgDifficulty - 1) * 0.2; // 1.0 - 1.8
  const unpleasantnessMultiplier = 1 + (avgUnpleasantness - 1) * 0.3; // 1.0 - 2.2
  
  const finalPoints = basePoints * difficultyMultiplier * unpleasantnessMultiplier;
  return Math.round(finalPoints);
}

/**
 * Prüft, ob ein Task überfällig ist
 */
export function isTaskOverdue(task: Task, lastExecution?: TaskExecution): boolean {
  if (!lastExecution) {
    // Neuer Task - überfällig nach maxDaysBetween
    const daysSinceCreation = Math.floor(
      (Date.now() - new Date(task.createdAt).getTime()) / (1000 * 60 * 60 * 24)
    );
    return daysSinceCreation > task.constraints.maxDaysBetween;
  }
  
  const daysSinceLastExecution = Math.floor(
    (Date.now() - new Date(lastExecution.executedAt).getTime()) / (1000 * 60 * 60 * 24)
  );
  
  return daysSinceLastExecution > task.constraints.maxDaysBetween;
}

/**
 * Prüft, ob ein User einen Task ausführen kann
 */
export function canUserExecuteTask(
  task: Task, 
  userId: string, 
  userExecutions: TaskExecution[]
): { canExecute: boolean; reason?: string } {
  
  // Prüfe erlaubte/verbotene Users
  if (task.constraints.allowedUsers && !task.constraints.allowedUsers.includes(userId)) {
    return { canExecute: false, reason: 'User ist nicht berechtigt für diesen Task' };
  }
  
  if (task.constraints.forbiddenUsers?.includes(userId)) {
    return { canExecute: false, reason: 'User ist für diesen Task ausgeschlossen' };
  }
  
  // Prüfe Mindestabstand
  if (task.constraints.minDaysBetween) {
    const lastUserExecution = userExecutions
      .filter(e => e.taskId === task.id && e.executedBy === userId)
      .sort((a, b) => new Date(b.executedAt).getTime() - new Date(a.executedAt).getTime())[0];
    
    if (lastUserExecution) {
      const daysSince = Math.floor(
        (Date.now() - new Date(lastUserExecution.executedAt).getTime()) / (1000 * 60 * 60 * 24)
      );
      
      if (daysSince < task.constraints.minDaysBetween) {
        return { 
          canExecute: false, 
          reason: `Mindestabstand von ${task.constraints.minDaysBetween} Tagen noch nicht erreicht` 
        };
      }
    }
  }
  
  // Prüfe monatliches Maximum
  if (task.constraints.maxExecutionsPerMonth) {
    const currentMonth = new Date().toISOString().slice(0, 7); // 'YYYY-MM'
    const thisMonthExecutions = userExecutions.filter(e => 
      e.taskId === task.id && 
      e.executedBy === userId &&
      e.executedAt.toISOString().slice(0, 7) === currentMonth
    ).length;
    
    if (thisMonthExecutions >= task.constraints.maxExecutionsPerMonth) {
      return { 
        canExecute: false, 
        reason: `Monatslimit von ${task.constraints.maxExecutionsPerMonth} bereits erreicht` 
      };
    }
  }
  
  return { canExecute: true };
}

/**
 * Generiert Task-Vorschläge für einen User basierend auf:
 * - Überfällige Tasks
 * - Punktestand des Users
 * - Präferenzen/Historie
 * - Ausgewogenheit der Arbeitsverteilung
 */
export function generateTaskSuggestions(
  user: User,
  allTasks: Task[],
  allExecutions: TaskExecution[],
  allRatings: TaskRating[],
  allUsers: User[]
): TaskSuggestion[] {
  
  const suggestions: TaskSuggestion[] = [];
  const currentMonth = new Date().toISOString().slice(0, 7);
  
  for (const task of allTasks.filter(t => t.isActive)) {
    const { canExecute, reason } = canUserExecuteTask(task, user.id, allExecutions);
    if (!canExecute) continue;
    
    const lastExecution = allExecutions
      .filter(e => e.taskId === task.id)
      .sort((a, b) => new Date(b.executedAt).getTime() - new Date(a.executedAt).getTime())[0];
    
    const isOverdue = isTaskOverdue(task, lastExecution);
    const daysOverdue = isOverdue ? Math.floor(
      (Date.now() - (lastExecution ? 
        new Date(lastExecution.executedAt).getTime() : 
        new Date(task.createdAt).getTime()
      )) / (1000 * 60 * 60 * 24)
    ) - task.constraints.maxDaysBetween : undefined;
    
    // Priorität berechnen
    let priority = 0.1; // Grundpriorität
    const reasons: SuggestionReason[] = [];
    
    // Überfällige Tasks haben höchste Priorität
    if (isOverdue && daysOverdue) {
      priority += 0.5 + (daysOverdue * 0.1); // Je überfälliger, desto höher
      reasons.push(SuggestionReason.OVERDUE);
    }
    
    // User braucht Punkte
    const pointsNeeded = user.targetMonthlyPoints - user.currentMonthPoints;
    if (pointsNeeded > 0) {
      const taskPoints = calculateTaskPoints(task, allRatings.filter(r => r.taskId === task.id));
      if (taskPoints >= pointsNeeded * 0.2) { // Task bringt mindestens 20% der fehlenden Punkte
        priority += 0.3;
        reasons.push(SuggestionReason.USER_BEHIND_POINTS);
      }
    }
    
    // Ausgewogenheit: Tasks, die andere selten machen, höher priorisieren
    const thisMonthExecutions = allExecutions.filter(e => 
      e.taskId === task.id && 
      e.executedAt.toISOString().slice(0, 7) === currentMonth
    );
    
    if (thisMonthExecutions.length === 0) {
      priority += 0.2; // Noch nie diesen Monat gemacht
      reasons.push(SuggestionReason.BALANCED_WORKLOAD);
    }
    
    // User-Präferenz basierend auf Historie
    const userTaskHistory = allExecutions.filter(e => 
      e.executedBy === user.id && 
      e.taskId === task.id
    ).length;
    
    if (userTaskHistory > 0) {
      priority += 0.1; // Leichte Präferenz für bekannte Tasks
      reasons.push(SuggestionReason.USER_PREFERENCE);
    }
    
    // Zeitfenster läuft ab
    if (lastExecution) {
      const daysSince = Math.floor(
        (Date.now() - new Date(lastExecution.executedAt).getTime()) / (1000 * 60 * 60 * 24)
      );
      const daysUntilOverdue = task.constraints.maxDaysBetween - daysSince;
      
      if (daysUntilOverdue <= 2 && daysUntilOverdue > 0) {
        priority += 0.25;
        reasons.push(SuggestionReason.CONSTRAINT_ENDING);
      }
    }
    
    // Priorität begrenzen
    priority = Math.min(priority, 1);
    
    if (reasons.length > 0) { // Nur Tasks mit Gründen vorschlagen
      suggestions.push({
        task,
        priority,
        reason: reasons,
        daysOverdue,
        lastExecutedAt: lastExecution?.executedAt,
        pointsForUser: calculateTaskPoints(task, allRatings.filter(r => r.taskId === task.id))
      });
    }
  }
  
  // Sortieren nach Priorität (höchste zuerst)
  return suggestions.sort((a, b) => b.priority - a.priority);
}

/**
 * Berechnet monatliche Statistiken für einen User
 */
export function calculateMonthlyStats(
  userId: string,
  month: string, // 'YYYY-MM'
  executions: TaskExecution[],
  tasks: Task[],
  ratings: TaskRating[],
  targetPoints: number
): MonthlyUserStats {
  
  const monthExecutions = executions.filter(e => 
    e.executedBy === userId && 
    e.executedAt.toISOString().slice(0, 7) === month &&
    e.status === ExecutionStatus.VERIFIED
  );
  
  const earnedPoints = monthExecutions.reduce((sum, e) => sum + e.pointsAwarded, 0);
  
  // Tasks nach Kategorien
  const completedTasksByCategory = monthExecutions.reduce((acc, execution) => {
    const task = tasks.find(t => t.id === execution.taskId);
    if (task) {
      acc[task.category] = (acc[task.category] || 0) + 1;
    }
    return acc;
  }, {} as Record<string, number>);
  
  // Durchschnittliche Bearbeitungszeit (vereinfacht)
  const averageCompletionTime = monthExecutions.length > 0 ? 
    monthExecutions.reduce((sum, e) => {
      const task = tasks.find(t => t.id === e.taskId);
      return sum + (task?.timeEstimate || 30);
    }, 0) / monthExecutions.length : 0;
  
  const photosUploaded = monthExecutions.filter(e => e.photo).length;
  const verificationsGiven = executions.filter(e => 
    e.verifiedBy === userId && 
    e.verifiedAt && 
    e.verifiedAt.toISOString().slice(0, 7) === month
  ).length;
  
  return {
    id: `${userId}-${month}`,
    userId,
    month,
    targetPoints,
    earnedPoints,
    completedTasks: monthExecutions.length,
    completedTasksByCategory: completedTasksByCategory as any,
    averageCompletionTime,
    photosUploaded,
    verificationsGiven,
    completionRate: targetPoints > 0 ? (earnedPoints / targetPoints) * 100 : 0,
    rank: 1 // Wird später basierend auf anderen Usern berechnet
  };
}

/**
 * Hilfsfunktion: Generiert eine eindeutige ID
 */
export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

/**
 * Hilfsfunktion: Formatiert Datum für Anzeige
 */
export function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  }).format(date);
}

/**
 * Hilfsfunktion: Formatiert Datum mit Zeit für Anzeige
 */
export function formatDateTime(date: Date): string {
  return new Intl.DateTimeFormat('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(date);
}