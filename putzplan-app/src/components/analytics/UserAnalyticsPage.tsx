import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button, Card, ProgressBar, Badge } from '../ui';
import { usePutzplanStore } from '../../hooks/usePutzplanStore';
import { AnalyticsService, UserAnalytics, Achievement } from '../../services/analyticsService';

interface UserAnalyticsPageProps {
  userId: string;
  onBack: () => void;
}

export const UserAnalyticsPage: React.FC<UserAnalyticsPageProps> = ({ userId, onBack }) => {
  const { state, currentWG } = usePutzplanStore() as any;
  const [selectedTab, setSelectedTab] = useState<'overview' | 'achievements' | 'tasks' | 'progress'>('overview');

  const userAnalytics = useMemo(() => {
    if (!currentWG || !userId) return null;

    const user = state.users[userId];
    if (!user) return null;

    const executions = Object.values(state.executions || {}).filter((e: any) => {
      const task = state.tasks[e.taskId];
      return task && task.wgId === currentWG.id && e.executedBy === userId;
    });

    const tasks = Object.values(state.tasks || {}).filter((t: any) => t.wgId === currentWG.id);

    return AnalyticsService.calculateUserAnalytics(userId, user, executions as any, tasks as any);
  }, [state, currentWG, userId]);

  if (!userAnalytics) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-500">Benutzer nicht gefunden</div>
      </div>
    );
  }

  const tabs = [
    { id: 'overview', label: 'Übersicht', icon: '📊' },
    { id: 'achievements', label: 'Erfolge', icon: '🏅' },
    { id: 'tasks', label: 'Tasks', icon: '📋' },
    { id: 'progress', label: 'Fortschritt', icon: '📈' }
  ] as const;

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-rose-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm border-b shadow-sm sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" onClick={onBack} size="sm">
                ← Zurück
              </Button>
              <div className="flex items-center gap-3">
                <span className="text-4xl">{userAnalytics.user.avatar}</span>
                <div>
                  <h1 className="text-2xl font-bold text-slate-800">{userAnalytics.user.name}</h1>
                  <p className="text-slate-600">Persönliche Analytics</p>
                </div>
              </div>
            </div>
            
            {/* Schnell-Stats */}
            <div className="hidden md:flex gap-6">
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">{userAnalytics.totalPoints}P</div>
                <div className="text-xs text-slate-500">Gesamt Punkte</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{userAnalytics.totalTasks}</div>
                <div className="text-xs text-slate-500">Tasks erledigt</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-600">{userAnalytics.streak}</div>
                <div className="text-xs text-slate-500">Tage Streak</div>
              </div>
            </div>
          </div>
          
          {/* Tab Navigation */}
          <div className="flex gap-2 mt-4 overflow-x-auto">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setSelectedTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg whitespace-nowrap transition-all ${
                  selectedTab === tab.id
                    ? 'bg-purple-100 text-purple-700 font-medium'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <span>{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8">
        <AnimatePresence mode="wait">
          {selectedTab === 'overview' && (
            <OverviewTab key="overview" analytics={userAnalytics} />
          )}
          {selectedTab === 'achievements' && (
            <AchievementsTab key="achievements" analytics={userAnalytics} />
          )}
          {selectedTab === 'tasks' && (
            <TasksTab key="tasks" analytics={userAnalytics} />
          )}
          {selectedTab === 'progress' && (
            <ProgressTab key="progress" analytics={userAnalytics} />
          )}
        </AnimatePresence>
      </main>
    </div>
  );
};

// Overview Tab
const OverviewTab: React.FC<{ analytics: UserAnalytics }> = ({ analytics }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: -20 }}
    className="space-y-8"
  >
    {/* Hero Stats */}
    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
      <StatsCard
        title="Gesamt Punkte"
        value={analytics.totalPoints}
        suffix="P"
        emoji="🎯"
        color="purple"
        subtitle={`Ø ${analytics.averagePointsPerTask}P pro Task`}
      />
      <StatsCard
        title="Tasks erledigt"
        value={analytics.totalTasks}
        emoji="✅"
        color="green"
        subtitle="Alle Zeit"
      />
      <StatsCard
        title="Hot Tasks"
        value={analytics.hotTaskCount}
        emoji="🔥"
        color="red"
        subtitle={`${analytics.hotTaskPoints}P Bonus`}
      />
      <StatsCard
        title="Streak"
        value={analytics.streak}
        emoji="⚡"
        color="orange"
        subtitle="Tage hintereinander"
      />
    </div>

    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      {/* Lieblings-Task */}
      <FavoriteTaskCard analytics={analytics} />

      {/* Punkte-Breakdown */}
      <PointsBreakdownCard analytics={analytics} />

      {/* Achievements Preview */}
      <AchievementsPreviewCard analytics={analytics} />

      {/* Time of Day Chart */}
      <TimeOfDayCard analytics={analytics} />
    </div>
  </motion.div>
);

// Achievements Tab
const AchievementsTab: React.FC<{ analytics: UserAnalytics }> = ({ analytics }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: -20 }}
    className="space-y-6"
  >
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {analytics.achievements.map((achievement) => (
        <AchievementCard key={achievement.id} achievement={achievement} />
      ))}
    </div>
  </motion.div>
);

// Tasks Tab
const TasksTab: React.FC<{ analytics: UserAnalytics }> = ({ analytics }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: -20 }}
    className="space-y-6"
  >
    <Card className="p-6">
      <h3 className="text-lg font-bold text-slate-800 mb-6">📊 Task-Verteilung</h3>
      <div className="space-y-4">
        {analytics.taskDistribution.map((task) => (
          <div key={task.taskId} className="p-4 rounded-lg border border-slate-200">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <span className="text-2xl">{task.task.emoji}</span>
                <div>
                  <div className="font-medium text-slate-800">{task.task.title}</div>
                  <div className="text-sm text-slate-500">
                    {task.count}x erledigt • {task.totalPoints}P gesamt
                  </div>
                </div>
              </div>
              <Badge variant="default">{task.percentage}%</Badge>
            </div>
            <ProgressBar 
              value={task.count} 
              max={Math.max(...analytics.taskDistribution.map(t => t.count))}
              className="h-2"
            />
          </div>
        ))}
      </div>
    </Card>
  </motion.div>
);

// Progress Tab
const ProgressTab: React.FC<{ analytics: UserAnalytics }> = ({ analytics }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: -20 }}
    className="space-y-6"
  >
    <WeeklyProgressCard analytics={analytics} />
  </motion.div>
);

// Component: Stats Card
const StatsCard: React.FC<{
  title: string;
  value: number;
  suffix?: string;
  emoji: string;
  color: 'purple' | 'green' | 'red' | 'orange';
  subtitle?: string;
}> = ({ title, value, suffix = '', emoji, color, subtitle }) => {
  const colorClasses = {
    purple: 'from-purple-500 to-purple-600',
    green: 'from-green-500 to-green-600',
    red: 'from-red-500 to-red-600',
    orange: 'from-orange-500 to-orange-600'
  };

  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      className="relative overflow-hidden"
    >
      <Card className="p-6 relative">
        <div className={`absolute inset-0 bg-gradient-to-r ${colorClasses[color]} opacity-5`} />
        <div className="relative z-10">
          <div className="flex items-center justify-between mb-3">
            <span className="text-3xl">{emoji}</span>
          </div>
          <div className="text-3xl font-bold text-slate-800 mb-1">
            {value.toLocaleString()}{suffix}
          </div>
          <div className="text-sm text-slate-600 mb-1">{title}</div>
          {subtitle && (
            <div className="text-xs text-slate-500">{subtitle}</div>
          )}
        </div>
      </Card>
    </motion.div>
  );
};

// Component: Favorite Task Card
const FavoriteTaskCard: React.FC<{ analytics: UserAnalytics }> = ({ analytics }) => (
  <Card className="p-6">
    <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
      ⭐ Lieblings-Task
    </h3>
    {analytics.favoriteTask ? (
      <div className="text-center">
        <div className="text-6xl mb-4">{analytics.favoriteTask.task.emoji}</div>
        <div className="text-xl font-bold text-slate-800 mb-2">
          {analytics.favoriteTask.task.title}
        </div>
        <div className="text-slate-600">
          {analytics.favoriteTask.count}x erledigt
        </div>
        <div className="text-sm text-slate-500 mt-2">
          Das ist {Math.round((analytics.favoriteTask.count / analytics.totalTasks) * 100)}% aller Tasks!
        </div>
      </div>
    ) : (
      <div className="text-center text-slate-500 py-8">
        Noch keine Tasks erledigt
      </div>
    )}
  </Card>
);

// Component: Points Breakdown Card
const PointsBreakdownCard: React.FC<{ analytics: UserAnalytics }> = ({ analytics }) => (
  <Card className="p-6">
    <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
      💰 Punkte-Aufschlüsselung
    </h3>
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-2">
          <div className="w-3 h-3 bg-green-500 rounded-full"></div>
          Normale Tasks
        </span>
        <span className="font-bold">{analytics.regularPoints}P</span>
      </div>
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-2">
          <div className="w-3 h-3 bg-red-500 rounded-full"></div>
          Hot Tasks
        </span>
        <span className="font-bold">{analytics.hotTaskPoints}P</span>
      </div>
      
      {/* Stacked Progress Bar */}
      <div className="h-4 bg-gray-200 rounded-full overflow-hidden flex">
        <div 
          className="bg-green-500" 
          style={{ width: `${(analytics.regularPoints / analytics.totalPoints) * 100}%` }}
        />
        <div 
          className="bg-red-500" 
          style={{ width: `${(analytics.hotTaskPoints / analytics.totalPoints) * 100}%` }}
        />
      </div>
      
      <div className="text-center">
        <div className="text-2xl font-bold text-purple-600">{analytics.totalPoints}P</div>
        <div className="text-sm text-slate-500">Gesamt</div>
      </div>
    </div>
  </Card>
);

// Component: Achievements Preview Card
const AchievementsPreviewCard: React.FC<{ analytics: UserAnalytics }> = ({ analytics }) => {
  const unlockedCount = analytics.achievements.filter(a => a.unlocked).length;
  const totalCount = analytics.achievements.length;
  
  return (
    <Card className="p-6">
      <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
        🏅 Erfolge
      </h3>
      <div className="text-center mb-4">
        <div className="text-3xl font-bold text-yellow-600 mb-1">
          {unlockedCount}/{totalCount}
        </div>
        <div className="text-sm text-slate-600">freigeschaltet</div>
        <ProgressBar 
          value={unlockedCount} 
          max={totalCount}
          className="mt-3"
        />
      </div>
      
      <div className="grid grid-cols-3 gap-2">
        {analytics.achievements.slice(0, 6).map((achievement) => (
          <div 
            key={achievement.id}
            className={`text-center p-2 rounded-lg ${
              achievement.unlocked ? 'bg-yellow-50' : 'bg-gray-50'
            }`}
          >
            <div className={`text-2xl ${achievement.unlocked ? '' : 'grayscale opacity-50'}`}>
              {achievement.emoji}
            </div>
            <div className="text-xs text-slate-600 mt-1">
              {achievement.title}
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
};

// Component: Time of Day Card
const TimeOfDayCard: React.FC<{ analytics: UserAnalytics }> = ({ analytics }) => {
  const maxCount = Math.max(...analytics.timeOfDayStats.map(t => t.count));
  
  return (
    <Card className="p-6">
      <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
        🕐 Aktivitätszeiten
      </h3>
      <div className="grid grid-cols-8 gap-1">
        {analytics.timeOfDayStats.map((stat) => (
          <div 
            key={stat.hour}
            className="text-center"
          >
            <div 
              className="bg-blue-500 rounded mb-1 flex items-end justify-center"
              style={{ 
                height: `${Math.max(10, (stat.count / maxCount) * 40)}px`,
                opacity: stat.count > 0 ? 0.7 + (stat.count / maxCount) * 0.3 : 0.1
              }}
            />
            <div className="text-xs text-slate-500">
              {stat.hour}h
            </div>
          </div>
        ))}
      </div>
      <div className="text-center text-sm text-slate-500 mt-3">
        Am aktivsten um {analytics.timeOfDayStats.reduce((max, stat) => 
          stat.count > max.count ? stat : max
        ).hour}:00 Uhr
      </div>
    </Card>
  );
};

// Component: Achievement Card
const AchievementCard: React.FC<{ achievement: Achievement }> = ({ achievement }) => (
  <motion.div
    whileHover={{ scale: 1.02 }}
    className={`p-6 rounded-lg border ${
      achievement.unlocked 
        ? 'bg-gradient-to-br from-yellow-50 to-orange-50 border-yellow-200' 
        : 'bg-gray-50 border-gray-200'
    }`}
  >
    <div className="text-center">
      <div className={`text-6xl mb-3 ${achievement.unlocked ? '' : 'grayscale opacity-50'}`}>
        {achievement.emoji}
      </div>
      <div className="font-bold text-slate-800 mb-2">{achievement.title}</div>
      <div className="text-sm text-slate-600 mb-4">{achievement.description}</div>
      
      {achievement.unlocked ? (
        <Badge variant="success">✨ Erreicht!</Badge>
      ) : (
        achievement.progress !== undefined && achievement.target && (
          <div>
            <div className="text-sm text-slate-600 mb-2">
              {achievement.progress}/{achievement.target}
            </div>
            <ProgressBar 
              value={achievement.progress} 
              max={achievement.target}
              className="h-2"
            />
          </div>
        )
      )}
    </div>
  </motion.div>
);

// Component: Weekly Progress Card
const WeeklyProgressCard: React.FC<{ analytics: UserAnalytics }> = ({ analytics }) => {
  const maxPoints = Math.max(...analytics.weeklyProgress.map(w => w.points));
  
  return (
    <Card className="p-6">
      <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
        📈 Wöchentlicher Fortschritt
      </h3>
      <div className="space-y-4">
        {analytics.weeklyProgress.map((week) => (
          <div key={week.week} className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span>Woche {week.week}</span>
              <span className="text-slate-500">{week.points}P • {week.tasks} Tasks</span>
            </div>
            <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-blue-400 to-purple-500 rounded-full transition-all duration-500"
                style={{ 
                  width: `${maxPoints > 0 ? (week.points / maxPoints) * 100 : 0}%` 
                }}
              />
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
};