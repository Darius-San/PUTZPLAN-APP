import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button, Card, ProgressBar, Badge } from '../ui';
import { usePutzplanStore } from '../../hooks/usePutzplanStore';
import { formatShortLabel } from '../period/periodUtils';
import { AnalyticsService, OverallAnalytics, UserAnalytics } from '../../services/analyticsService';
import { PeriodAnalyticsService, PeriodAnalytics, PeriodDefinition } from '../../services/periodAnalyticsService';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { User } from '../../types';
import PeriodCompare from '../period/PeriodCompare';

interface AnalyticsPageProps {
  onBack: () => void;
  onUserSelect: (userId: string) => void;
}

export const AnalyticsPage: React.FC<AnalyticsPageProps> = ({ onBack, onUserSelect }) => {
  const { state, currentWG, getHistoricalPeriods } = usePutzplanStore() as any;
  const [selectedPeriod, setSelectedPeriod] = useState<'month' | 'all'>('all');

  // Read historical periods directly from the store on every render so the UI stays in sync
  const rawHistoricalPeriods = getHistoricalPeriods ? getHistoricalPeriods() : [];
  // normalize periods so Analytics and PeriodSettings share the same canonical shape
  // import dynamically to avoid circular issues at module init
  // (we import relative util at top via static import)
  const historicalPeriods = rawHistoricalPeriods;
  const [showLineChart, setShowLineChart] = useState(false);
  const [debugMode, setDebugMode] = useState(false);
  const [debugHistoricalPeriods, setDebugHistoricalPeriods] = useState<any[]>([]);
  const [openPeriods, setOpenPeriods] = useState<Record<string, boolean>>({});
  const [showDebugCreateModal, setShowDebugCreateModal] = useState(false);
  const [chartRefreshKey, setChartRefreshKey] = useState(Date.now()); // Cache busting

  const analytics = useMemo(() => {
    if (!currentWG) return null;

    const executions = Object.values(state.executions || {}).filter((e: any) => {
      const task = state.tasks[e.taskId];
      return task && task.wgId === currentWG.id;
    });

    const now = new Date();
    let filteredExecutions;
    if (selectedPeriod === 'month') {
      filteredExecutions = executions.filter((e: any) => {
        const execDate = new Date(e.date || e.executedAt);
        return execDate.getMonth() === now.getMonth() && execDate.getFullYear() === now.getFullYear();
      });
    } else {
      filteredExecutions = executions;
    }

    const tasks = Object.values(state.tasks || {}).filter((t: any) => t.wgId === currentWG.id && t.isActive);
    const users = currentWG.memberIds.map((id: string) => state.users[id]).filter(Boolean);

    // Debug: Vergleiche mit TaskTable Datenquelle
    console.log(`📊 [Analytics] Using ${filteredExecutions.length}/${executions.length} executions (period: ${selectedPeriod})`);
    console.log(`👥 [Analytics] Users: ${users.map((u: any) => u.name).join(', ')}`);

    const analytics = AnalyticsService.calculateOverallAnalytics(filteredExecutions as any, tasks as any, users);
    console.log(`💰 [Analytics] Total points in filtered executions: ${analytics.totalPoints}P`);

    return analytics;
  }, [state, currentWG, selectedPeriod]);

  // Load historical periods based on custom periods from PeriodSettings
  const currentPeriodData = useMemo(() => {
    if (!currentWG || !state.currentPeriod) return null;
    
    // Create period definition from current period
    const currentPeriod: PeriodDefinition = {
      id: 'current',
      name: `Aktueller Zeitraum`,
      startDate: new Date(state.currentPeriod.start).toISOString(),
      endDate: new Date(state.currentPeriod.end).toISOString(),
      targetPoints: currentWG.settings?.monthlyPointsTarget || 50,
      isActive: true,
      createdAt: new Date().toISOString()
    };

    return PeriodAnalyticsService.calculatePeriodAnalytics(currentPeriod.id);
  }, [state, currentWG]);

  // Generate chart data for line chart
  const chartData = useMemo(() => {
    if (!analytics || !currentWG) return [];

    const users = currentWG.memberIds?.map((id: string) => state.users[id]).filter(Boolean) || [];
    const executions = Object.values(state.executions || {}).filter((e: any) => {
      const task = state.tasks[e.taskId];
      return task && task.wgId === currentWG.id;
    });

    // Get period bounds
    const startDate = state.currentPeriod ? new Date(state.currentPeriod.start) : new Date();
    const endDate = state.currentPeriod ? new Date(state.currentPeriod.end) : new Date();
    
    // Create timeline data
    const timelineMap = new Map();
    
    // Initialize all days
    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
      const dateStr = d.toISOString().split('T')[0];
      const dataPoint: any = {
        date: new Date(d).toLocaleDateString('de-DE'),
        originalDate: dateStr
      };
      
        // Initialize user points
        users.forEach((user: any) => {
          dataPoint[user.name] = 0;
        });
      
      // Calculate target line
      const daysSinceStart = Math.floor((d.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
      const periodDuration = Math.floor((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
      const targetPoints = currentWG.settings?.monthlyPointsTarget || 50;
      dataPoint.target = Math.round((targetPoints * daysSinceStart) / Math.max(periodDuration, 1));
      
      timelineMap.set(dateStr, dataPoint);
    }
    
    // Calculate cumulative points for each user
    const userCumulativePoints = new Map(users.map((u: any) => [u.id, 0]));
    
    // Sort executions by date
    const sortedExecutions = executions
      .filter((e: any) => {
        const execDate = new Date(e.executedAt || e.date);
        return execDate >= startDate && execDate <= endDate;
      })
      .sort((a: any, b: any) => new Date(a.executedAt || a.date).getTime() - new Date(b.executedAt || b.date).getTime());

    sortedExecutions.forEach((exec: any) => {
      const dateStr = new Date(exec.executedAt || exec.date).toISOString().split('T')[0];
      const user = users.find((u: any) => u.id === exec.executedBy);
      
      if (user) {
        const currentPoints = userCumulativePoints.get(user.id) || 0;
        const newPoints = currentPoints + (exec.pointsAwarded || 0);
        userCumulativePoints.set(user.id, newPoints);
        
        // Update all subsequent days with new cumulative value
        for (let d = new Date(dateStr); d <= endDate; d.setDate(d.getDate() + 1)) {
          const dayStr = d.toISOString().split('T')[0];
          const dayData = timelineMap.get(dayStr);
          if (dayData) {
            dayData[user.name] = newPoints;
          }
        }
      }
    });

    return Array.from(timelineMap.values());
  }, [analytics, state, currentWG]);

  const generateColors = (count: number) => {
    const colors = [
      '#8884d8', '#82ca9d', '#ffc658', '#ff7300', 
      '#8dd1e1', '#d084d0', '#ffb347', '#87ceeb'
    ];
    return Array.from({ length: count }, (_, i) => colors[i % colors.length]);
  };

  // (historical periods are read directly from the store via `getHistoricalPeriods()`)
    // No need for a separate effect — `historicalPeriods` is read directly from the store
    React.useEffect(() => {
      if (!getHistoricalPeriods) {
        console.log('❌ [Analytics] getHistoricalPeriods not available');
        return;
      }

      try {
        const rawPeriods = getHistoricalPeriods();
        console.log('📊 [Analytics] Loading historical periods (raw):', rawPeriods.length);
      } catch (err) {
        console.warn('⚠️ [Analytics] Error while loading historical periods', err);
      }
    }, [getHistoricalPeriods, state]);

  // Add current WG periods debugging
  React.useEffect(() => {
    if (currentWG?.periods) {
      console.log('📊 [Analytics] Current WG periods:', currentWG.periods.length);
      currentWG.periods.forEach((period: any, index: number) => {
        console.log(`📊 [Analytics] WG Period ${index}:`, {
          id: period.id,
          name: period.name,
          startDate: period.startDate,
          endDate: period.endDate,
          isActive: period.isActive
        });
      });
    }
  }, [currentWG]);

  // Check für Debug Mode via URL hash
  React.useEffect(() => {
    const checkDebugMode = () => {
      const isDebug = window.location.hash.includes('debug') || window.location.search.includes('debug=true');
      setDebugMode(isDebug);
      if (!isDebug) {
        // Clear debug periods wenn debug mode deaktiviert wird
        setDebugHistoricalPeriods([]);
      }
    };
    
    checkDebugMode();
    window.addEventListener('hashchange', checkDebugMode);
    window.addEventListener('popstate', checkDebugMode);
    
    return () => {
      window.removeEventListener('hashchange', checkDebugMode);
      window.removeEventListener('popstate', checkDebugMode);
    };
  }, []);

  // Show compare panel when ?compare=true is present in the URL
  const showCompare = typeof window !== 'undefined' && window.location.search.includes('compare=true');

  // Debug Functions
  const createDebugPeriod = (periodData: {
    name: string;
    startDate: string;
    endDate: string;
    targetPoints: number;
    totalPoints: number;
    totalExecutions: number;
    memberStats: { userId: string; points: number; executions: number; achievement: number; }[];
  }) => {
    if (!debugMode || !currentWG) return;

    const debugPeriod = {
      id: `debug_period_${Date.now()}`,
      name: periodData.name,
      startDate: periodData.startDate,
      endDate: periodData.endDate,
      targetPoints: periodData.targetPoints,
      isActive: false,
      createdAt: new Date().toISOString(),
      archivedAt: new Date().toISOString(),
      summary: {
        totalExecutions: periodData.totalExecutions,
        totalPoints: periodData.totalPoints,
        memberStats: periodData.memberStats
      },
      __DEBUG__: true // Marker für debug periods
    };

    setDebugHistoricalPeriods(prev => [...prev, debugPeriod]);
    console.log('🛠️ Debug Period created:', debugPeriod);
  };

  const generateRandomDebugPeriod = () => {
    if (!currentWG) return;

    const members = currentWG.memberIds?.map((id: string) => state.users[id]).filter(Boolean) || [];
    const today = new Date();
    const monthsBack = 1 + Math.floor(Math.random() * 6); // 1-6 Monate zurück
    const startDate = new Date(today.getFullYear(), today.getMonth() - monthsBack, 1);
    const endDate = new Date(today.getFullYear(), today.getMonth() - monthsBack + 1, 0);
    
    const targetPoints = 30 + Math.floor(Math.random() * 70); // 30-100 Punkte
    
    const memberStats = members.map((member: any) => {
      const basePoints = targetPoints * (0.4 + Math.random() * 0.9); // 40-130% vom Ziel
      const points = Math.floor(basePoints);
      const executions = Math.floor(points / (2 + Math.random() * 6)); // 2-8 Punkte pro Execution
      const achievement = Math.round((points / targetPoints) * 100);
      
      return {
        userId: member.id,
        points,
        executions,
        achievement
      };
    });
    
    const totalPoints = memberStats.reduce((sum: number, m: any) => sum + m.points, 0);
    const totalExecutions = memberStats.reduce((sum: number, m: any) => sum + m.executions, 0);
    
    createDebugPeriod({
      name: `🛠️ Debug ${startDate.toLocaleDateString('de-DE')} - ${endDate.toLocaleDateString('de-DE')}`,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      targetPoints,
      totalPoints,
      totalExecutions,
      memberStats
    });
  };

  // Combine real and debug historical periods - use the store as single source of truth
  const allHistoricalPeriods = useMemo(() => {
    const realPeriods = Array.isArray(historicalPeriods) ? historicalPeriods : [];

    // Normalize periods using the shared helper (to match PeriodSettings)
    // Avoid heavy transforms if already normalized
    let normalizedReal: any[] = realPeriods;
    try {
      const { normalizePeriods } = require('../period/periodUtils');
      normalizedReal = normalizePeriods(realPeriods);
    } catch (e) {
      // fallback: use raw periods
      normalizedReal = realPeriods;
    }

    // Build combined list starting from store-provided periods
    const base = [...normalizedReal];

    // Append debug periods if debugMode
    const combined = debugMode ? [...base, ...debugHistoricalPeriods] : base;

    // Deduplicate primarily by start/end (fallback to id).
    // If multiple entries share the same date range prefer an active/live period over archived ones.
    const byRange = new Map<string, any>();
    combined.forEach(p => {
      const start = p.startDate || p.start || '';
      const end = p.endDate || p.end || '';
      const rangeKey = start && end ? `${start}__${end}` : (p.id || JSON.stringify(p));

      if (!byRange.has(rangeKey)) {
        byRange.set(rangeKey, p);
        return;
      }

      // If there's already an entry for this range, prefer active/live entries
      const existing = byRange.get(rangeKey);
      const existingPriority = existing.isActive || existing.__LIVE_PERIOD__ ? 2 : 1;
      const newPriority = p.isActive || p.__LIVE_PERIOD__ ? 2 : 1;

      if (newPriority > existingPriority) {
        byRange.set(rangeKey, p);
      }
    });

    const deduped = Array.from(byRange.values());

    // Filter to match what 'Zeiträume' shows: include past (historical) periods
    // and also include currently active periods so Analytics shows them too.
    // Keep debug periods visible in debug mode regardless of dates.
    const today = new Date();
    const filtered = deduped.filter((p: any) => {
      if (p.__DEBUG__) return true;
      // Include active/current periods explicitly
      if (p.isActive || p.__LIVE_PERIOD__) return true;
      const endStr = p.endDate || p.end;
      if (!endStr) return false;
      const end = new Date(endStr);
      return end < today;
    });

    // Debug logging
    console.log('🔍 [Analytics] Combined periods for display (deduped, filtered):', filtered.length);
    filtered.forEach((period: any, idx: number) => {
      console.log(`  [${idx}] ${period.id || 'no-id'}: ${period.startDate || period.start} -> ${period.endDate || period.end}`);
    });

    return filtered;
  }, [historicalPeriods, debugHistoricalPeriods, debugMode]);

  // Helper to produce a stable key for a period
  const getPeriodKey = (p: any) => p?.id || p?.startDate || p?.start || `${p?.name || ''}-${p?.endDate || p?.end || ''}`;
  // Initialize open state for periods on first load
  React.useEffect(() => {
    if (!allHistoricalPeriods) return;
    // Default: collapse all periods on first load
    if (Object.keys(openPeriods).length === 0 && allHistoricalPeriods.length > 0) {
      const map: Record<string, boolean> = {};
      allHistoricalPeriods.forEach(p => { map[getPeriodKey(p)] = false; });
      setOpenPeriods(map);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allHistoricalPeriods]);
  React.useEffect(() => {
    if (analytics && state.executions) {
      const allExecutions = Object.values(state.executions || {}).filter((e: any) => {
        const task = state.tasks[e.taskId];
        return task && task.wgId === currentWG.id;
      });
      
      console.log('🔍 [Analytics] Debug Comparison:');
      console.log(`📊 All Executions: ${allExecutions.length}`);
      console.log(`📈 Analytics Total: ${analytics.totalPoints}P from ${analytics.totalTasks} tasks`);
      
      // Manual calculation
      const manualTotal = allExecutions.reduce((sum: number, e: any) => sum + (e.pointsAwarded || 0), 0);
      console.log(`🧮 Manual Total: ${manualTotal}P from ${allExecutions.length} executions`);
      
      if (analytics.totalPoints !== manualTotal) {
        console.warn(`⚠️ MISMATCH! Analytics: ${analytics.totalPoints}P vs Manual: ${manualTotal}P`);
      }
    }
  }, [analytics, state.executions, currentWG]);

  if (!analytics || !currentWG) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-500">Keine Daten verfügbar</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm border-b shadow-sm sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" onClick={onBack} size="sm">
                ← Zurück
              </Button>
              <div>
                <h1 className="text-2xl font-bold text-slate-800">
                  📊 Team Analytics 
                  {debugMode && <span className="ml-2 text-sm bg-orange-500 text-white px-2 py-1 rounded">🛠️ DEBUG</span>}
                </h1>
                <p className="text-slate-600">{currentWG.name}</p>
              </div>
            </div>
            
            <div className="flex gap-2 items-center">
              {debugMode && (
                <>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={generateRandomDebugPeriod}
                    className="bg-orange-100 text-orange-700 hover:bg-orange-200"
                  >
                    🛠️ Random Period
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowDebugCreateModal(true)}
                    className="bg-blue-100 text-blue-700 hover:bg-blue-200"
                  >
                    📝 Custom Period
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setDebugHistoricalPeriods([])}
                    className="bg-red-100 text-red-700 hover:bg-red-200"
                  >
                    🗑️ Clear Debug
                  </Button>
                  <div className="h-6 w-px bg-gray-300 mx-2"></div>
                </>
              )}
              <Button
                variant={selectedPeriod === 'month' ? 'primary' : 'outline'}
                size="sm"
                onClick={() => setSelectedPeriod('month')}
              >
                Dieser Monat
              </Button>
              <Button
                variant={selectedPeriod === 'all' ? 'primary' : 'outline'}
                size="sm"
                onClick={() => setSelectedPeriod('all')}
              >
                Gesamt
              </Button>
              <div className="h-6 w-px bg-gray-300 mx-2"></div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  // collapse all
                  const map: Record<string, boolean> = {};
                  allHistoricalPeriods.forEach((p: any) => { map[getPeriodKey(p)] = false; });
                  setOpenPeriods(map);
                }}
                title="Alle zuklappen"
              >
                ▸ Alle zuklappen
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  const map: Record<string, boolean> = {};
                  allHistoricalPeriods.forEach((p: any) => { map[getPeriodKey(p)] = true; });
                  setOpenPeriods(map);
                }}
                title="Alle aufklappen"
              >
                ▾ Alle aufklappen
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8">
        {/* Übersicht Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <OverviewCard
            title="Gesamt Punkte"
            value={analytics.totalPoints}
            suffix="P"
            emoji="🎯"
            color="blue"
          />
          <OverviewCard
            title="Tasks erledigt"
            value={analytics.totalTasks}
            emoji="✅"
            color="green"
          />
          <OverviewCard
            title="Hot Tasks"
            value={analytics.totalHotTasks}
            emoji="🔥"
            color="red"
          />
          <OverviewCard
            title="Team-Mitglieder"
            value={analytics.totalUsers}
            emoji="👥"
            color="purple"
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Leaderboard */}
          <LeaderboardWidget analytics={analytics} onUserSelect={onUserSelect} />

          {/* Top Tasks */}
          <TopTasksWidget analytics={analytics} />

          {/* Team Achievements */}
          <TeamAchievementsWidget analytics={analytics} />

          {/* Aktivitäts-Heatmap */}
          <ActivityHeatmapWidget analytics={analytics} />
        </div>

        {/* Period Analytics Line Chart */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-8 mb-8"
        >
          <Card className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-slate-800">📈 Punkte-Entwicklung über Zeit</h3>
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setChartRefreshKey(Date.now()); // Force chart refresh
                    console.log('🔄 Chart refresh triggered');
                  }}
                  className="text-slate-600 hover:text-slate-800"
                >
                  🔄 Aktualisieren
                </Button>
                <Button
                  variant={showLineChart ? 'primary' : 'outline'}
                  size="sm"
                  onClick={() => {
                    setShowLineChart(!showLineChart);
                    setChartRefreshKey(Date.now()); // Refresh on toggle
                  }}
                >
                  {showLineChart ? 'Ausblenden' : 'Anzeigen'}
                </Button>
              </div>
            </div>
            
            {showLineChart && chartData && chartData.length > 0 && (
              <div key={chartRefreshKey} style={{ width: '100%', height: 400 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis 
                      dataKey="date" 
                      tick={{ fontSize: 12, fill: '#64748b' }}
                      angle={-45}
                      textAnchor="end"
                      height={80}
                      label={{ 
                        value: 'Zeit ⏰', 
                        position: 'insideBottom', 
                        offset: -10,
                        style: { textAnchor: 'middle', fontWeight: 'bold' }
                      }}
                    />
                    <YAxis 
                      tick={{ fontSize: 12, fill: '#64748b' }}
                      label={{ 
                        value: 'Punkte 🎯', 
                        angle: -90, 
                        position: 'insideLeft',
                        style: { textAnchor: 'middle', fontWeight: 'bold' }
                      }}
                    />
                    <Tooltip 
                      labelFormatter={(value, payload) => {
                        const dataPoint = payload?.[0]?.payload;
                        return dataPoint ? `${value} (${new Date(dataPoint.originalDate).toLocaleDateString('de-DE')})` : value;
                      }}
                    />
                    <Legend />
                    
                    {/* Gestrichelte Ziel-Linie (Target Line) */}
                    <Line
                      type="monotone"
                      dataKey="target"
                      stroke="#ef4444"
                      strokeWidth={4}
                      strokeDasharray="12 8"
                      name="🎯 Ziel-Punkte (gestrichelt)"
                      dot={false}
                      connectNulls={false}
                    />
                    
                    {/* Member Lines */}
                    {analytics.leaderboard.map((userAnalytic: any, index: number) => {
                      const colors = generateColors(analytics.leaderboard.length);
                      return (
                        <Line
                          key={userAnalytic.user.id}
                          type="monotone"
                          dataKey={userAnalytic.user.name}
                          stroke={colors[index]}
                          strokeWidth={2}
                          name={`${userAnalytic.user.avatar || '👤'} ${userAnalytic.user.name}`}
                        />
                      );
                    })}
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </Card>
        </motion.div>

        {/* Historical Periods Section */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <Card className="p-6">
            <h3 className="text-xl font-bold text-slate-800 mb-6">
              📅 Vergangene Zeiträume
              {debugMode && debugHistoricalPeriods.length > 0 && (
                <span className="ml-2 text-sm bg-orange-100 text-orange-700 px-2 py-1 rounded">
                  {debugHistoricalPeriods.length} Debug Period(s)
                </span>
              )}
            </h3>
            
            {allHistoricalPeriods.length === 0 ? (
              <div className="text-center py-8 text-slate-500">
                <div className="text-4xl mb-4">📊</div>
                <div className="text-lg font-medium mb-2">Keine historischen Zeiträume</div>
                <div className="text-sm">
                  {debugMode ? (
                    <>
                      <div className="mb-2">🛠️ <strong>Debug Mode aktiv!</strong></div>
                      <div>Klicke "Random Period" oder "Custom Period" um Test-Zeiträume zu erstellen.</div>
                      <div className="mt-2 text-xs">Debug-Zeiträume sind nur im Debug Mode sichtbar.</div>
                    </>
                  ) : (
                    <>
                      Abgelaufene Zeiträume aus den "Zeitraum" Einstellungen werden hier automatisch gespeichert und angezeigt.
                      <br />
                      <strong>Hinweis:</strong> Diese Funktion wird aktiviert, sobald der erste Zeitraum abläuft.
                      <br />
                      <div className="mt-3 text-xs bg-yellow-50 border border-yellow-200 rounded p-2 inline-block">
                        💡 <strong>Debug Tip:</strong> Füge <code>?debug=true</code> zur URL hinzu oder besuche{' '}
                        <button 
                          onClick={() => window.location.href = window.location.href + (window.location.search ? '&debug=true' : '?debug=true')}
                          className="underline text-blue-600 hover:text-blue-800"
                        >
                          Debug Mode
                        </button> um Test-Zeiträume zu erstellen.
                      </div>
                    </>
                  )}
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {allHistoricalPeriods.map(period => {
                  // Calculate live stats for active periods
                  let totalMembers, completedMembers, avgAchievement;
                  
                  if (period.__LIVE_PERIOD__ && currentWG) {
                    // Berechne Live-Statistiken für aktive Periods
                    const periodExecutions = Object.values(state.executions || {}).filter((e: any) => {
                      const task = state.tasks[e.taskId];
                      const execDate = new Date(e.date || e.executedAt);
                      const periodStart = new Date(period.startDate);
                      const periodEnd = new Date(period.endDate);
                      return task && task.wgId === currentWG.id && 
                             execDate >= periodStart && execDate <= periodEnd;
                    });
                    
                    const memberIds = currentWG.memberIds || [];
                    const memberStats = memberIds.map((memberId: string) => {
                      const memberExecs = periodExecutions.filter((e: any) => e.executedBy === memberId);
                      const points = memberExecs.reduce((sum: number, e: any) => sum + (e.pointsAwarded || 0), 0);
                      return {
                        userId: memberId,
                        executions: memberExecs.length,
                        points,
                        achievement: period.targetPoints > 0 ? (points / period.targetPoints) * 100 : 0
                      };
                    });
                    
                    totalMembers = memberStats.length;
                    completedMembers = memberStats.filter((m: any) => m.achievement >= 100).length;
                    avgAchievement = totalMembers > 0 
                      ? Math.round(memberStats.reduce((sum: number, m: any) => sum + m.achievement, 0) / totalMembers)
                      : 0;
                  } else {
                    // Verwende vorberechnete Statistiken für archivierte Periods
                    totalMembers = period.summary.memberStats.length;
                    completedMembers = period.summary.memberStats.filter((m: any) => m.achievement >= 100).length;
                    avgAchievement = totalMembers > 0 
                      ? Math.round(period.summary.memberStats.reduce((sum: number, m: any) => sum + m.achievement, 0) / totalMembers)
                      : 0;
                  }
                  
                  return (
                    <motion.div 
                      key={period.id}
                      data-testid={`analytics-period-${period.id}`}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      className={`border rounded-lg p-4 hover:bg-slate-50 cursor-pointer transition-colors ${
                        period.__DEBUG__ 
                          ? 'border-orange-300 bg-orange-50' 
                          : period.__LIVE_PERIOD__ 
                            ? 'border-green-300 bg-green-50' 
                            : 'border-slate-200'
                      }`}
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                            <h4
                              className="font-medium text-lg flex items-center gap-2 cursor-pointer"
                              data-testid={`analytics-period-${period.id}-name`}
                              onClick={() => {
                                const key = getPeriodKey(period);
                                setOpenPeriods(prev => ({ ...prev, [key]: !prev[key] }));
                              }}
                            >
                                {/* Use consistent short date label like in Periods menu: TT.MM – TT.MM */}
                                {formatShortLabel(period)}
                                <span className="ml-2 text-xs text-slate-500">
                                  {openPeriods[getPeriodKey(period)] ? '▾' : '▸'}
                                </span>
                            {period.__DEBUG__ && (
                              <span className="text-xs bg-orange-500 text-white px-2 py-1 rounded">🛠️ DEBUG</span>
                            )}
                            {period.__LIVE_PERIOD__ && (
                              <span className="text-xs bg-green-500 text-white px-2 py-1 rounded">
                                {period.isActive ? '🟢 AKTIV' : '📊 LIVE'}
                              </span>
                            )}
                            {!period.__DEBUG__ && !period.__LIVE_PERIOD__ && (
                              <span className="text-xs bg-gray-500 text-white px-2 py-1 rounded">📁 ARCHIV</span>
                            )}
                          </h4>
                          <p className="text-sm text-slate-600 mb-3">
                            {formatShortLabel(period)}
                          </p>
                          
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                            <div>
                              <span className="text-slate-500">Gesamt Punkte:</span>
                              <div className="font-medium text-blue-600" data-testid={`analytics-period-${period.id}-totalPoints`}>{period.summary.totalPoints}P</div>
                            </div>
                            <div>
                              <span className="text-slate-500">Executions:</span>
                              <div className="font-medium" data-testid={`analytics-period-${period.id}-executions`}>{period.summary.totalExecutions}</div>
                            </div>
                            <div>
                              <span className="text-slate-500">Ziele erreicht:</span>
                              <div className="font-medium text-green-600" data-testid={`analytics-period-${period.id}-completed`}>{completedMembers} / {totalMembers}</div>
                            </div>
                            <div>
                              <span className="text-slate-500">Ø Zielerreichung:</span>
                              <div className={`font-medium ${avgAchievement >= 100 ? 'text-green-600' : avgAchievement >= 75 ? 'text-yellow-600' : 'text-red-600'}`} data-testid={`analytics-period-${period.id}-avgAchievement`}>
                                {avgAchievement}%
                              </div>
                            </div>
                          </div>
                        </div>
                        
                        <div className="text-right ml-4">
                          <div className="text-xs text-slate-500 mb-1">Ziel</div>
                          <div className="text-lg font-bold text-slate-700">{period.targetPoints}P</div>
                          <div className="text-xs text-slate-500">pro Person</div>
                        </div>
                      </div>
                      
                      {/* Member Summary - collapsible */}
                      <AnimatePresence>
                        {openPeriods[getPeriodKey(period)] && (
                          <motion.div
                            key={`members-${period.id}`}
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            transition={{ duration: 0.18 }}
                            className="mt-4 pt-4 border-t border-slate-200 overflow-hidden"
                          >
                            <div className="text-xs text-slate-500 mb-2">Member Performance:</div>
                            <div className="flex flex-wrap gap-2">
                              {period.summary.memberStats.map((memberStat: any) => {
                                const user = state.users[memberStat.userId];
                                if (!user) return null;
                                
                                return (
                                  <div key={memberStat.userId} className="flex items-center gap-1 text-xs bg-slate-100 rounded-full px-2 py-1">
                                    <span>{user.avatar || '👤'}</span>
                                    <span className="font-medium">{user.name}</span>
                                    <span className={`ml-1 ${memberStat.achievement >= 100 ? 'text-green-600' : 'text-orange-600'}`}>
                                      {Math.round(memberStat.achievement)}%
                                    </span>
                                  </div>
                                );
                              })}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </Card>
        </motion.div>
      </main>

      {/* Debug Create Modal */}
      {debugMode && showDebugCreateModal && (
        <DebugCreateModal 
          onClose={() => setShowDebugCreateModal(false)}
          onCreatePeriod={createDebugPeriod}
          members={currentWG?.memberIds?.map((id: string) => state.users[id]).filter(Boolean) || []}
        />
      )}
      {showCompare && <PeriodCompare />}
    </div>
  );
};

// Debug Create Modal Component
const DebugCreateModal: React.FC<{
  onClose: () => void;
  onCreatePeriod: (periodData: any) => void;
  members: any[];
}> = ({ onClose, onCreatePeriod, members }) => {
  const [formData, setFormData] = useState({
    name: '',
    startDate: '',
    endDate: '',
    targetPoints: 50,
    memberStats: members.map(member => ({
      userId: member.id,
      points: 40,
      executions: 8,
      achievement: 80
    }))
  });

  React.useEffect(() => {
    // Set default dates (1 month ago)
    const today = new Date();
    const startDate = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    const endDate = new Date(today.getFullYear(), today.getMonth(), 0);
    
    setFormData(prev => ({
      ...prev,
      name: `Debug Zeitraum ${startDate.toLocaleDateString('de-DE')}`,
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0]
    }));
  }, []);

  const handleMemberStatChange = (userId: string, field: string, value: number) => {
    setFormData(prev => ({
      ...prev,
      memberStats: prev.memberStats.map(stat =>
        stat.userId === userId ? { 
          ...stat, 
          [field]: value,
          achievement: field === 'points' ? Math.round((value / prev.targetPoints) * 100) : stat.achievement
        } : stat
      )
    }));
  };

  const handleCreate = () => {
    const totalPoints = formData.memberStats.reduce((sum, stat) => sum + stat.points, 0);
    const totalExecutions = formData.memberStats.reduce((sum, stat) => sum + stat.executions, 0);
    
    onCreatePeriod({
      name: formData.name,
      startDate: new Date(formData.startDate).toISOString(),
      endDate: new Date(formData.endDate).toISOString(),
      targetPoints: formData.targetPoints,
      totalPoints,
      totalExecutions,
      memberStats: formData.memberStats
    });
    
    onClose();
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
      onClick={onClose}
    >
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-bold">🛠️ Debug Zeitraum erstellen</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">✕</button>
        </div>

        <div className="space-y-4">
          {/* Basic Info */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Name</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                className="w-full border rounded px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Ziel Punkte</label>
              <input
                type="number"
                value={formData.targetPoints}
                onChange={(e) => setFormData(prev => ({ ...prev, targetPoints: parseInt(e.target.value) || 0 }))}
                className="w-full border rounded px-3 py-2"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Start Datum</label>
              <input
                type="date"
                value={formData.startDate}
                onChange={(e) => setFormData(prev => ({ ...prev, startDate: e.target.value }))}
                className="w-full border rounded px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">End Datum</label>
              <input
                type="date"
                value={formData.endDate}
                onChange={(e) => setFormData(prev => ({ ...prev, endDate: e.target.value }))}
                className="w-full border rounded px-3 py-2"
              />
            </div>
          </div>

          {/* Member Stats */}
          <div>
            <h4 className="font-medium mb-3">Member Performance</h4>
            <div className="space-y-3">
              {formData.memberStats.map(stat => {
                const member = members.find(m => m.id === stat.userId);
                if (!member) return null;

                return (
                  <div key={stat.userId} className="flex items-center gap-3 p-3 bg-slate-50 rounded">
                    <div className="flex items-center gap-2 w-32">
                      <span>{member.avatar || '👤'}</span>
                      <span className="font-medium">{member.name}</span>
                    </div>
                    
                    <div className="flex gap-2 flex-1">
                      <div className="flex-1">
                        <label className="block text-xs text-slate-500">Punkte</label>
                        <input
                          type="number"
                          value={stat.points}
                          onChange={(e) => handleMemberStatChange(stat.userId, 'points', parseInt(e.target.value) || 0)}
                          className="w-full border rounded px-2 py-1 text-sm"
                        />
                      </div>
                      <div className="flex-1">
                        <label className="block text-xs text-slate-500">Executions</label>
                        <input
                          type="number"
                          value={stat.executions}
                          onChange={(e) => handleMemberStatChange(stat.userId, 'executions', parseInt(e.target.value) || 0)}
                          className="w-full border rounded px-2 py-1 text-sm"
                        />
                      </div>
                      <div className="w-16">
                        <label className="block text-xs text-slate-500">Achievement</label>
                        <div className={`text-sm font-medium py-1 text-center ${
                          stat.achievement >= 100 ? 'text-green-600' : 
                          stat.achievement >= 75 ? 'text-yellow-600' : 'text-red-600'
                        }`}>
                          {stat.achievement}%
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4">
            <button
              onClick={handleCreate}
              className="flex-1 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
            >
              📝 Zeitraum erstellen
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 border rounded hover:bg-gray-50"
            >
              Abbrechen
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

// Overview Card Component
const OverviewCard: React.FC<{
  title: string;
  value: number;
  suffix?: string;
  emoji: string;
  color: 'blue' | 'green' | 'red' | 'purple';
}> = ({ title, value, suffix = '', emoji, color }) => {
  const colorClasses = {
    blue: 'from-blue-500 to-blue-600',
    green: 'from-green-500 to-green-600',
    red: 'from-red-500 to-red-600',
    purple: 'from-purple-500 to-purple-600'
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ scale: 1.02 }}
      className="relative overflow-hidden"
    >
      <Card className="p-6 relative">
        <div className={`absolute inset-0 bg-gradient-to-r ${colorClasses[color]} opacity-5`} />
        <div className="relative z-10">
          <div className="flex items-center justify-between mb-2">
            <span className="text-3xl">{emoji}</span>
            <div className={`w-3 h-3 rounded-full bg-gradient-to-r ${colorClasses[color]}`} />
          </div>
          <div className="text-2xl font-bold text-slate-800 mb-1">
            {value.toLocaleString()}{suffix}
          </div>
          <div className="text-sm text-slate-600">{title}</div>
        </div>
      </Card>
    </motion.div>
  );
};

// Leaderboard Widget
const LeaderboardWidget: React.FC<{
  analytics: OverallAnalytics;
  onUserSelect: (userId: string) => void;
}> = ({ analytics, onUserSelect }) => (
  <Card className="p-6">
    <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
      🏆 Leaderboard
    </h3>
    <div className="space-y-3">
      {analytics.leaderboard.map((user, index) => (
        <motion.button
          key={user.userId}
          onClick={() => onUserSelect(user.userId)}
          className="w-full p-4 rounded-lg border border-slate-200 hover:border-blue-300 hover:bg-blue-50/50 transition-all group"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="text-xl">
                {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `#${index + 1}`}
              </div>
              <span className="text-2xl">{user.user.avatar}</span>
              <div className="text-left">
                <div className="font-medium text-slate-800 group-hover:text-blue-600">
                  {user.user.name}
                </div>
                <div className="text-sm text-slate-500">
                  {user.totalTasks} Tasks
                </div>
              </div>
            </div>
            <div className="text-right">
              <div className="font-bold text-blue-600 text-lg">
                {user.totalPoints}P
              </div>
              {user.streak > 0 && (
                <div className="text-xs text-orange-600">
                  🔥 {user.streak} Tage
                </div>
              )}
            </div>
          </div>
        </motion.button>
      ))}
    </div>
  </Card>
);

// Top Tasks Widget
const TopTasksWidget: React.FC<{ analytics: OverallAnalytics }> = ({ analytics }) => (
  <Card className="p-6">
    <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
      📈 Beliebteste Tasks
    </h3>
    <div className="space-y-4">
      {analytics.topTasks.map((task, index) => (
        <div key={task.taskId} className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-xl">{task.task.emoji}</span>
            <div>
              <div className="font-medium text-slate-800">{task.task.title}</div>
              <div className="text-sm text-slate-500">
                {task.count}x erledigt
              </div>
            </div>
          </div>
          <div className="text-right">
            <Badge variant="success">{task.percentage}%</Badge>
            <div className="text-xs text-slate-500 mt-1">
              {task.totalPoints}P gesamt
            </div>
          </div>
        </div>
      ))}
    </div>
  </Card>
);

// Team Achievements Widget
const TeamAchievementsWidget: React.FC<{ analytics: OverallAnalytics }> = ({ analytics }) => (
  <Card className="p-6">
    <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
      🏅 Team Erfolge
    </h3>
    <div className="grid grid-cols-1 gap-3">
      {analytics.teamAchievements.map((achievement) => (
        <motion.div
          key={achievement.id}
          className={`p-4 rounded-lg border ${
            achievement.unlocked 
              ? 'bg-yellow-50 border-yellow-200' 
              : 'bg-gray-50 border-gray-200'
          }`}
          whileHover={{ scale: 1.02 }}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-2xl">{achievement.emoji}</span>
              <div>
                <div className="font-medium text-slate-800">
                  {achievement.title}
                </div>
                <div className="text-sm text-slate-500">
                  {achievement.description}
                </div>
              </div>
            </div>
            {achievement.unlocked ? (
              <Badge variant="success">✨ Erreicht!</Badge>
            ) : (
              achievement.progress !== undefined && achievement.target && (
                <div className="text-right">
                  <div className="text-sm text-slate-600">
                    {achievement.progress}/{achievement.target}
                  </div>
                  <ProgressBar 
                    value={achievement.progress} 
                    max={achievement.target} 
                  />
                </div>
              )
            )}
          </div>
        </motion.div>
      ))}
    </div>
  </Card>
);

// Activity Heatmap Widget
const ActivityHeatmapWidget: React.FC<{ analytics: OverallAnalytics }> = ({ analytics }) => {
  const maxActivity = Math.max(...analytics.leaderboard.map(u => u.totalTasks));
  
  return (
    <Card className="p-6">
      <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
        📊 Aktivitäts-Übersicht
      </h3>
      <div className="space-y-3">
        {analytics.leaderboard.map((user) => (
          <div key={user.userId} className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-2">
                <span className="text-lg">{user.user.avatar}</span>
                {user.user.name}
              </span>
              <span className="text-slate-500">{user.totalTasks} Tasks</span>
            </div>
            <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-blue-400 to-blue-600 rounded-full transition-all duration-500"
                style={{ 
                  width: `${maxActivity > 0 ? (user.totalTasks / maxActivity) * 100 : 0}%` 
                }}
              />
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
};