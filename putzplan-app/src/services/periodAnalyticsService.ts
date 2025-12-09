import { dataManager } from './dataManager';

export interface PeriodDefinition {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  targetPoints: number;
  isActive: boolean;
  createdAt: string;
}

export interface PeriodAnalytics {
  period: PeriodDefinition;
  memberProgress: {
    userId: string;
    user: any;
    currentPoints: number;
    targetPoints: number;
    achievement: number; // percentage
    isCompleted: boolean;
    dailyProgress: { date: string; points: number; cumulative: number }[];
  }[];
  teamStats: {
    totalPoints: number;
    totalTarget: number;
    averageAchievement: number;
    completedMembers: number;
    pendingMembers: number;
  };
  timeline: {
    date: string;
    totalPoints: number;
    memberPoints: Record<string, number>;
  }[];
}

export class PeriodAnalyticsService {
  
  // Erstelle neuen Zeitraum
  static createPeriod(name: string, startDate: Date, endDate: Date, targetPoints: number): PeriodDefinition {
    const state = dataManager.getState();
    const currentWG = dataManager.getCurrentWG();
    
    if (!currentWG) throw new Error('No WG selected');
    
    const period: PeriodDefinition = {
      id: `period_${Date.now()}`,
      name,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      targetPoints,
      isActive: true,
      createdAt: new Date().toISOString()
    };
    
    // Speichere Period in WG
    const updatedWG = {
      ...currentWG,
      periods: [...(currentWG.periods || []), period]
    };
    
    dataManager.updateWG(updatedWG);
    return period;
  }
  
  // Hole alle aktiven Zeiträume für aktuelle WG
  static getPeriods(): PeriodDefinition[] {
    const currentWG = dataManager.getCurrentWG();
    if (!currentWG) return [];
    
    // Nur aktive Periods zurückgeben, um Konsistenz mit getHistoricalPeriods zu gewährleisten
    return (currentWG.periods || []).filter(p => p.isActive);
  }
  
  // Aktueller aktiver Zeitraum
  static getCurrentPeriod(): PeriodDefinition | null {
    const periods = this.getPeriods();
    return periods.find(p => p.isActive) || null;
  }
  
  // Beende aktuellen Zeitraum und starte neuen
  static endCurrentPeriodAndStartNew(newPeriodName: string, startDate: Date, endDate: Date, targetPoints: number): PeriodDefinition {
    const currentWG = dataManager.getCurrentWG();
    if (!currentWG) throw new Error('No WG selected');
    
    // Beende aktuellen Zeitraum
    const updatedPeriods = (currentWG.periods || []).map(p => 
      p.isActive ? { ...p, isActive: false } : p
    );
    
    // Erstelle neuen Zeitraum
    const newPeriod: PeriodDefinition = {
      id: `period_${Date.now()}`,
      name: newPeriodName,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      targetPoints,
      isActive: true,
      createdAt: new Date().toISOString()
    };
    
    updatedPeriods.push(newPeriod);
    
    const updatedWG = {
      ...currentWG,
      periods: updatedPeriods
    };
    
    dataManager.updateWG(updatedWG);
    return newPeriod;
  }
  
  // Berechne Analytics für einen Zeitraum
  static calculatePeriodAnalytics(periodId: string): PeriodAnalytics | null {
    const state = dataManager.getState();
    const currentWG = dataManager.getCurrentWG();
    
    if (!currentWG) return null;
    
    const period = currentWG.periods?.find(p => p.id === periodId);
    if (!period) return null;
    
    const startDate = new Date(period.startDate);
    const endDate = new Date(period.endDate);
    
    // Filtere Executions für Zeitraum
    const executions = Object.values(state.executions).filter((e: any) => {
      const execDate = new Date(e.date);
      const task = state.tasks[e.taskId];
      return task && 
             task.wgId === currentWG.id && 
             execDate >= startDate && 
             execDate <= endDate;
    });
    
    // Member Progress berechnen
    const members = currentWG.memberIds.map(id => state.users[id]).filter(Boolean);
    const memberProgress = members.map(user => {
      const userExecutions = executions.filter((e: any) => e.executedBy === user.id);
      const currentPoints = userExecutions.reduce((sum: number, e: any) => sum + (e.pointsAwarded || 0), 0);
      const achievement = period.targetPoints > 0 ? Math.round((currentPoints / period.targetPoints) * 100) : 0;
      
      // Daily Progress für Line Chart
      const dailyProgress = this.calculateDailyProgress(userExecutions, startDate, endDate);
      
      return {
        userId: user.id,
        user,
        currentPoints,
        targetPoints: period.targetPoints,
        achievement,
        isCompleted: currentPoints >= period.targetPoints,
        dailyProgress
      };
    });
    
    // Team Stats
    const totalPoints = memberProgress.reduce((sum, mp) => sum + mp.currentPoints, 0);
    const totalTarget = memberProgress.length * period.targetPoints;
    const completedMembers = memberProgress.filter(mp => mp.isCompleted).length;
    const averageAchievement = memberProgress.length > 0 
      ? Math.round(memberProgress.reduce((sum, mp) => sum + mp.achievement, 0) / memberProgress.length)
      : 0;
    
    // Timeline für Chart
    const timeline = this.calculateTimeline(executions, members, startDate, endDate);
    
    return {
      period,
      memberProgress,
      teamStats: {
        totalPoints,
        totalTarget,
        averageAchievement,
        completedMembers,
        pendingMembers: members.length - completedMembers
      },
      timeline
    };
  }
  
  // Berechne tägliche Fortschritte für einen User
  private static calculateDailyProgress(userExecutions: any[], startDate: Date, endDate: Date) {
    const dailyMap = new Map<string, number>();
    
    // Initialisiere alle Tage mit 0
    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
      dailyMap.set(d.toISOString().split('T')[0], 0);
    }
    
    // Summiere Punkte pro Tag
    userExecutions.forEach(exec => {
      const date = new Date(exec.date).toISOString().split('T')[0];
      dailyMap.set(date, (dailyMap.get(date) || 0) + (exec.pointsAwarded || 0));
    });
    
    // Konvertiere zu Array mit kumulativen Werten
    let cumulative = 0;
    return Array.from(dailyMap.entries()).map(([date, points]) => {
      cumulative += points;
      return { date, points, cumulative };
    });
  }
  
  // Berechne Timeline für Chart
  private static calculateTimeline(executions: any[], members: any[], startDate: Date, endDate: Date) {
    const timelineMap = new Map<string, { totalPoints: number; memberPoints: Record<string, number> }>();
    
    // Initialisiere alle Tage
    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
      const dateStr = d.toISOString().split('T')[0];
      timelineMap.set(dateStr, {
        totalPoints: 0,
        memberPoints: Object.fromEntries(members.map(m => [m.id, 0]))
      });
    }
    
    // Summiere Executions pro Tag
    executions.forEach(exec => {
      const dateStr = new Date(exec.date).toISOString().split('T')[0];
      const dayData = timelineMap.get(dateStr);
      if (dayData) {
        dayData.totalPoints += exec.pointsAwarded || 0;
        dayData.memberPoints[exec.executedBy] = (dayData.memberPoints[exec.executedBy] || 0) + (exec.pointsAwarded || 0);
      }
    });
    
    return Array.from(timelineMap.entries()).map(([date, data]) => ({
      date,
      totalPoints: data.totalPoints,
      memberPoints: data.memberPoints
    }));
  }
  
  // Finde Mitglieder die ihre Ziele nicht erreicht haben
  static getMembersNotMeetingTargets(periodIds: string[]): { 
    userId: string; 
    user: any; 
    periods: { periodId: string; period: PeriodDefinition; achievement: number; missing: number }[] 
  }[] {
    const members = dataManager.getCurrentWG()?.memberIds.map(id => dataManager.getState().users[id]).filter(Boolean) || [];
    
    return members.map(user => {
      const periods = periodIds.map(periodId => {
        const analytics = this.calculatePeriodAnalytics(periodId);
        if (!analytics) return null;
        
        const memberProgress = analytics.memberProgress.find(mp => mp.userId === user.id);
        if (!memberProgress) return null;
        
        return {
          periodId,
          period: analytics.period,
          achievement: memberProgress.achievement,
          missing: Math.max(0, memberProgress.targetPoints - memberProgress.currentPoints)
        };
      }).filter(Boolean);
      
      return {
        userId: user.id,
        user,
        periods
      };
    }).filter(member => member.periods.some(p => p.achievement < 100));
  }
}