import { TaskExecution, Task, User } from '../types';

export interface UserAnalytics {
  userId: string;
  user: User;
  totalPoints: number;
  totalTasks: number;
  averagePointsPerTask: number;
  favoriteTask: { task: Task; count: number } | null;
  avoidedTask: { task: Task; count: number } | null;
  hotTaskCount: number;
  hotTaskPoints: number;
  regularPoints: number;
  bonusPoints: number;
  streak: number;
  achievements: Achievement[];
  taskDistribution: TaskDistribution[];
  weeklyProgress: WeeklyProgress[];
  timeOfDayStats: TimeStats[];
}

export interface Achievement {
  id: string;
  title: string;
  emoji: string;
  description: string;
  unlocked: boolean;
  progress?: number;
  target?: number;
}

export interface TaskDistribution {
  taskId: string;
  task: Task;
  count: number;
  percentage: number;
  totalPoints: number;
}

export interface WeeklyProgress {
  week: number;
  points: number;
  tasks: number;
}

export interface TimeStats {
  hour: number;
  count: number;
  percentage: number;
}

export interface OverallAnalytics {
  totalPoints: number;
  totalTasks: number;
  totalUsers: number;
  leaderboard: UserAnalytics[];
  topTasks: TaskDistribution[];
  totalHotTasks: number;
  teamAchievements: Achievement[];
}

export class AnalyticsService {
  static calculateUserAnalytics(
    userId: string,
    user: User,
    executions: TaskExecution[],
    tasks: Task[]
  ): UserAnalytics {
    const userExecutions = executions.filter(e => e.executedBy === userId);
    const taskMap = new Map(tasks.map(t => [t.id, t]));

    // Debug logging für Analytics-Debugging
    console.log(`🔍 [Analytics] User ${user.name}: ${userExecutions.length} executions`);
    userExecutions.forEach(e => {
      const task = taskMap.get(e.taskId);
      console.log(`  📊 ${task?.title || e.taskId}: ${e.pointsAwarded}P (${new Date(e.executedAt).toLocaleDateString()})`);
    });

    // Basis-Statistiken
    const totalPoints = userExecutions.reduce((sum, e) => sum + (e.pointsAwarded || 0), 0);
    const totalTasks = userExecutions.length;
    const averagePointsPerTask = totalTasks > 0 ? Math.round(totalPoints / totalTasks) : 0;
    
    console.log(`  💰 Total: ${totalPoints}P from ${totalTasks} tasks (avg: ${averagePointsPerTask}P/task)`);

    // Task-Verteilung berechnen
    const taskCounts = new Map<string, number>();
    const taskPoints = new Map<string, number>();
    
    userExecutions.forEach(exec => {
      taskCounts.set(exec.taskId, (taskCounts.get(exec.taskId) || 0) + 1);
      taskPoints.set(exec.taskId, (taskPoints.get(exec.taskId) || 0) + exec.pointsAwarded);
    });

    const taskDistribution: TaskDistribution[] = Array.from(taskCounts.entries())
      .map(([taskId, count]) => ({
        taskId,
        task: taskMap.get(taskId)!,
        count,
        percentage: Math.round((count / totalTasks) * 100),
        totalPoints: taskPoints.get(taskId) || 0
      }))
      .filter(td => td.task)
      .sort((a, b) => b.count - a.count);

    // Lieblings- und vermiedene Tasks
    const favoriteTask = taskDistribution.length > 0 ? taskDistribution[0] : null;
    const allTasks = tasks.filter(t => t.wgId === (user as any).wgId);
    const avoidedTasks = allTasks
      .filter(t => !taskCounts.has(t.id))
      .map(task => ({ task, count: 0 }));
    const avoidedTask = avoidedTasks.length > 0 ? avoidedTasks[0] : null;

    // Hot Task Statistiken
    const hotTaskExecutions = userExecutions.filter(e => {
      const task = taskMap.get(e.taskId);
      return task?.isAlarmed || e.pointsAwarded > (task?.pointsPerExecution || 0);
    });
    const hotTaskCount = hotTaskExecutions.length;
    const hotTaskPoints = hotTaskExecutions.reduce((sum, e) => sum + e.pointsAwarded, 0);
    const regularPoints = totalPoints - hotTaskPoints;

    // Streak berechnen
    const streak = this.calculateStreak(userExecutions);

    // Achievements
    const achievements = this.calculateAchievements(userExecutions, tasks, user);

    // Wöchentlicher Fortschritt
    const weeklyProgress = this.calculateWeeklyProgress(userExecutions);

    // Tageszeit-Statistiken
    const timeOfDayStats = this.calculateTimeOfDayStats(userExecutions);

    return {
      userId,
      user,
      totalPoints,
      totalTasks,
      averagePointsPerTask,
      favoriteTask: favoriteTask ? { task: favoriteTask.task, count: favoriteTask.count } : null,
      avoidedTask,
      hotTaskCount,
      hotTaskPoints,
      regularPoints,
      bonusPoints: 0, // TODO: Implement bonus calculation
      streak,
      achievements,
      taskDistribution,
      weeklyProgress,
      timeOfDayStats
    };
  }

  static calculateOverallAnalytics(
    executions: TaskExecution[],
    tasks: Task[],
    users: User[]
  ): OverallAnalytics {
    // Debug logging für Overall Analytics
    console.log(`🌍 [Analytics] Overall: ${executions.length} executions, ${tasks.length} tasks, ${users.length} users`);
    
    const totalPoints = executions.reduce((sum, e) => sum + (e.pointsAwarded || 0), 0);
    const totalTasks = executions.length;
    const totalUsers = users.length;
    
    console.log(`  💰 Overall Total: ${totalPoints}P from ${totalTasks} executions`);

    // Leaderboard erstellen
    const leaderboard = users
      .map(user => this.calculateUserAnalytics(user.id, user, executions, tasks))
      .sort((a, b) => b.totalPoints - a.totalPoints);
      
    // Debug: Leaderboard-Summe prüfen
    const leaderboardSum = leaderboard.reduce((sum, user) => sum + user.totalPoints, 0);
    console.log(`  🏆 Leaderboard Sum: ${leaderboardSum}P (should equal ${totalPoints}P)`);
    if (leaderboardSum !== totalPoints) {
      console.warn(`⚠️ Leaderboard sum mismatch! Expected ${totalPoints}P, got ${leaderboardSum}P`);
    }

    // Top Tasks
    const taskCounts = new Map<string, number>();
    const taskMap = new Map(tasks.map(t => [t.id, t]));
    
    executions.forEach(exec => {
      taskCounts.set(exec.taskId, (taskCounts.get(exec.taskId) || 0) + 1);
    });

    const topTasks: TaskDistribution[] = Array.from(taskCounts.entries())
      .map(([taskId, count]) => ({
        taskId,
        task: taskMap.get(taskId)!,
        count,
        percentage: Math.round((count / totalTasks) * 100),
        totalPoints: executions
          .filter(e => e.taskId === taskId)
          .reduce((sum, e) => sum + e.pointsAwarded, 0)
      }))
      .filter(td => td.task)
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // Hot Tasks zählen
    const totalHotTasks = executions.filter(e => {
      const task = taskMap.get(e.taskId);
      return task?.isAlarmed || e.pointsAwarded > (task?.pointsPerExecution || 0);
    }).length;

    // Team Achievements
    const teamAchievements = this.calculateTeamAchievements(executions, tasks, users);

    return {
      totalPoints,
      totalTasks,
      totalUsers,
      leaderboard,
      topTasks,
      totalHotTasks,
      teamAchievements
    };
  }

  private static calculateStreak(executions: TaskExecution[]): number {
    if (executions.length === 0) return 0;

    const sortedExecs = executions
      .sort((a, b) => new Date(b.executedAt).getTime() - new Date(a.executedAt).getTime());

    let streak = 0;
    let currentDate = new Date();
    currentDate.setHours(0, 0, 0, 0);

    for (const exec of sortedExecs) {
      const execDate = new Date(exec.executedAt);
      execDate.setHours(0, 0, 0, 0);

      const daysDiff = Math.floor((currentDate.getTime() - execDate.getTime()) / (1000 * 60 * 60 * 24));

      if (daysDiff === streak) {
        streak++;
      } else if (daysDiff > streak) {
        break;
      }
    }

    return streak;
  }

  private static calculateAchievements(
    executions: TaskExecution[],
    tasks: Task[],
    user: User
  ): Achievement[] {
    const achievements: Achievement[] = [];

    // Task-Zähler
    const taskCount = executions.length;
    
    // Erste Schritte
    achievements.push({
      id: 'first-task',
      title: 'Erste Schritte',
      emoji: '🎯',
      description: 'Ersten Task erledigt',
      unlocked: taskCount >= 1
    });

    // Fleißiger Helfer
    achievements.push({
      id: 'busy-bee',
      title: 'Fleißiger Helfer',
      emoji: '🐝',
      description: '10 Tasks erledigt',
      unlocked: taskCount >= 10,
      progress: Math.min(taskCount, 10),
      target: 10
    });

    // Task-Master
    achievements.push({
      id: 'task-master',
      title: 'Task-Master',
      emoji: '👑',
      description: '50 Tasks erledigt',
      unlocked: taskCount >= 50,
      progress: Math.min(taskCount, 50),
      target: 50
    });

    // Streak Achievements
    const streak = this.calculateStreak(executions);
    achievements.push({
      id: 'week-streak',
      title: 'Wochenserie',
      emoji: '🔥',
      description: '7 Tage hintereinander Tasks erledigt',
      unlocked: streak >= 7,
      progress: Math.min(streak, 7),
      target: 7
    });

    // Hot Task Champion
    const hotTasks = executions.filter(e => {
      const task = tasks.find(t => t.id === e.taskId);
      return task?.isAlarmed || e.pointsAwarded > (task?.pointsPerExecution || 0);
    });
    
    achievements.push({
      id: 'hot-task-champion',
      title: 'Hot Task Champion',
      emoji: '🌶️',
      description: '5 Hot Tasks erledigt',
      unlocked: hotTasks.length >= 5,
      progress: Math.min(hotTasks.length, 5),
      target: 5
    });

    // Punkte-Sammler
    const totalPoints = executions.reduce((sum, e) => sum + e.pointsAwarded, 0);
    achievements.push({
      id: 'point-collector',
      title: 'Punkte-Sammler',
      emoji: '💰',
      description: '500 Punkte gesammelt',
      unlocked: totalPoints >= 500,
      progress: Math.min(totalPoints, 500),
      target: 500
    });

    return achievements;
  }

  private static calculateWeeklyProgress(executions: TaskExecution[]): WeeklyProgress[] {
    const weeklyData = new Map<number, { points: number; tasks: number }>();
    
    executions.forEach(exec => {
      const date = new Date(exec.executedAt);
      const weekOfYear = this.getWeekOfYear(date);
      
      const current = weeklyData.get(weekOfYear) || { points: 0, tasks: 0 };
      current.points += exec.pointsAwarded;
      current.tasks += 1;
      weeklyData.set(weekOfYear, current);
    });

    return Array.from(weeklyData.entries())
      .map(([week, data]) => ({ week, ...data }))
      .sort((a, b) => a.week - b.week)
      .slice(-8); // Letzte 8 Wochen
  }

  private static calculateTimeOfDayStats(executions: TaskExecution[]): TimeStats[] {
    const hourCounts = new Array(24).fill(0);
    
    executions.forEach(exec => {
      const hour = new Date(exec.executedAt).getHours();
      hourCounts[hour]++;
    });

    const total = executions.length;
    
    return hourCounts.map((count, hour) => ({
      hour,
      count,
      percentage: total > 0 ? Math.round((count / total) * 100) : 0
    }));
  }

  private static calculateTeamAchievements(
    executions: TaskExecution[],
    tasks: Task[],
    users: User[]
  ): Achievement[] {
    const achievements: Achievement[] = [];

    const totalTasks = executions.length;
    const totalPoints = executions.reduce((sum, e) => sum + e.pointsAwarded, 0);

    // Team-Leistung
    achievements.push({
      id: 'team-effort',
      title: 'Team-Leistung',
      emoji: '🤝',
      description: '100 Tasks als Team erledigt',
      unlocked: totalTasks >= 100,
      progress: Math.min(totalTasks, 100),
      target: 100
    });

    // Punkte-Power
    achievements.push({
      id: 'point-power',
      title: 'Punkte-Power',
      emoji: '⚡',
      description: '1000 Punkte als Team gesammelt',
      unlocked: totalPoints >= 1000,
      progress: Math.min(totalPoints, 1000),
      target: 1000
    });

    return achievements;
  }

  private static getWeekOfYear(date: Date): number {
    const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
    const pastDaysOfYear = (date.getTime() - firstDayOfYear.getTime()) / 86400000;
    return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
  }
}

// Global export für Debug-Zwecke in Development
if (typeof window !== 'undefined') {
  (window as any).AnalyticsService = AnalyticsService;
}