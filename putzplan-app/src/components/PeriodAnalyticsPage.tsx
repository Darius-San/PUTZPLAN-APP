import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { PeriodAnalyticsService, PeriodDefinition, PeriodAnalytics } from '../services/periodAnalyticsService';
import { dataManager } from '../services/dataManager';

export function PeriodAnalyticsPage({ onBack }: { onBack?: () => void }) {
  const [periods, setPeriods] = useState<PeriodDefinition[]>([]);
  const [selectedPeriod, setSelectedPeriod] = useState<string | null>(null);
  const [analytics, setAnalytics] = useState<PeriodAnalytics | null>(null);
  const [showCreatePeriod, setShowCreatePeriod] = useState(false);
  const [newPeriodForm, setNewPeriodForm] = useState({
    name: '',
    startDate: '',
    endDate: '',
    targetPoints: 50
  });

  useEffect(() => {
    loadPeriods();
  }, []);

  useEffect(() => {
    if (selectedPeriod) {
      const periodAnalytics = PeriodAnalyticsService.calculatePeriodAnalytics(selectedPeriod);
      setAnalytics(periodAnalytics);
    }
  }, [selectedPeriod]);

  const loadPeriods = () => {
    const allPeriods = PeriodAnalyticsService.getPeriods();
    setPeriods(allPeriods);
    
    // Auto-select current active period
    const currentPeriod = PeriodAnalyticsService.getCurrentPeriod();
    if (currentPeriod && !selectedPeriod) {
      setSelectedPeriod(currentPeriod.id);
    }
  };

  const handleCreatePeriod = () => {
    try {
      const startDate = new Date(newPeriodForm.startDate);
      const endDate = new Date(newPeriodForm.endDate);
      
      PeriodAnalyticsService.createPeriod(
        newPeriodForm.name,
        startDate,
        endDate,
        newPeriodForm.targetPoints
      );
      
      setShowCreatePeriod(false);
      setNewPeriodForm({ name: '', startDate: '', endDate: '', targetPoints: 50 });
      loadPeriods();
    } catch (error) {
      console.error('Error creating period:', error);
    }
  };

  const formatChartData = () => {
    if (!analytics) return [];
    
    return analytics.timeline.map(day => {
      const dataPoint: any = {
        date: new Date(day.date).toLocaleDateString('de-DE'),
        originalDate: day.date
      };
      
      // Füge kumulierte Punkte für jeden Member hinzu
      analytics.memberProgress.forEach(member => {
        const memberDayProgress = member.dailyProgress.find(dp => dp.date === day.date);
        dataPoint[member.user.name] = memberDayProgress?.cumulative || 0;
      });
      
      // Target Line
      const daysSinceStart = Math.floor((new Date(day.date).getTime() - new Date(analytics.period.startDate).getTime()) / (1000 * 60 * 60 * 24));
      const periodDuration = Math.floor((new Date(analytics.period.endDate).getTime() - new Date(analytics.period.startDate).getTime()) / (1000 * 60 * 60 * 24));
      dataPoint.target = Math.round((analytics.period.targetPoints * daysSinceStart) / periodDuration);
      
      return dataPoint;
    });
  };

  const generateColors = (count: number) => {
    const colors = [
      '#8884d8', '#82ca9d', '#ffc658', '#ff7300', 
      '#8dd1e1', '#d084d0', '#ffb347', '#87ceeb'
    ];
    return Array.from({ length: count }, (_, i) => colors[i % colors.length]);
  };

  if (!analytics) {
    return (
      <div className="period-analytics-container">
        <div className="period-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
            {onBack && (
              <button 
                onClick={onBack}
                className="back-btn"
                style={{ 
                  padding: '8px 16px', 
                  background: 'rgba(255,255,255,0.2)', 
                  color: 'white', 
                  border: 'none', 
                  borderRadius: '8px', 
                  cursor: 'pointer' 
                }}
              >
                ← Zurück
              </button>
            )}
            <h2>📊 Period Analytics</h2>
          </div>
          <div className="period-controls">
            <select 
              value={selectedPeriod || ''}
              onChange={(e) => setSelectedPeriod(e.target.value)}
              className="period-selector"
            >
              <option value="">Zeitraum wählen...</option>
              {periods.map(period => (
                <option key={period.id} value={period.id}>
                  {period.name} ({new Date(period.startDate).toLocaleDateString()} - {new Date(period.endDate).toLocaleDateString()})
                </option>
              ))}
            </select>
            <button 
              onClick={() => setShowCreatePeriod(true)}
              className="create-period-btn"
            >
              + Neuer Zeitraum
            </button>
          </div>
        </div>

        {showCreatePeriod && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="create-period-modal"
          >
            <div className="modal-content">
              <h3>Neuen Zeitraum erstellen</h3>
              <div className="form-row">
                <input
                  type="text"
                  placeholder="Zeitraum Name (z.B. Februar 2024)"
                  value={newPeriodForm.name}
                  onChange={(e) => setNewPeriodForm(prev => ({ ...prev, name: e.target.value }))}
                />
              </div>
              <div className="form-row">
                <input
                  type="date"
                  value={newPeriodForm.startDate}
                  onChange={(e) => setNewPeriodForm(prev => ({ ...prev, startDate: e.target.value }))}
                />
                <input
                  type="date"
                  value={newPeriodForm.endDate}
                  onChange={(e) => setNewPeriodForm(prev => ({ ...prev, endDate: e.target.value }))}
                />
              </div>
              <div className="form-row">
                <input
                  type="number"
                  placeholder="Ziel Punkte"
                  value={newPeriodForm.targetPoints}
                  onChange={(e) => setNewPeriodForm(prev => ({ ...prev, targetPoints: parseInt(e.target.value) || 0 }))}
                />
              </div>
              <div className="form-actions">
                <button onClick={handleCreatePeriod} className="confirm-btn">Erstellen</button>
                <button onClick={() => setShowCreatePeriod(false)} className="cancel-btn">Abbrechen</button>
              </div>
            </div>
          </motion.div>
        )}

        <div className="empty-state">
          <p>Wähle einen Zeitraum aus oder erstelle einen neuen.</p>
        </div>
      </div>
    );
  }

  const chartData = formatChartData();
  const memberColors = generateColors(analytics.memberProgress.length);

  return (
    <div className="period-analytics-container">
      <style>{`
        .period-analytics-container {
          padding: 20px;
          min-height: 100vh;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        }
        
        .period-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 30px;
          color: white;
        }
        
        .period-controls {
          display: flex;
          gap: 15px;
        }
        
        .period-selector {
          padding: 8px 12px;
          border: none;
          border-radius: 8px;
          background: rgba(255,255,255,0.9);
          min-width: 250px;
        }
        
        .create-period-btn {
          padding: 8px 16px;
          background: #4CAF50;
          color: white;
          border: none;
          border-radius: 8px;
          cursor: pointer;
        }
        
        .create-period-modal {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0,0,0,0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
        }
        
        .modal-content {
          background: white;
          padding: 30px;
          border-radius: 12px;
          min-width: 400px;
        }
        
        .form-row {
          display: flex;
          gap: 10px;
          margin-bottom: 15px;
        }
        
        .form-row input {
          flex: 1;
          padding: 10px;
          border: 1px solid #ddd;
          border-radius: 6px;
        }
        
        .form-actions {
          display: flex;
          gap: 10px;
          justify-content: flex-end;
        }
        
        .confirm-btn {
          padding: 10px 20px;
          background: #4CAF50;
          color: white;
          border: none;
          border-radius: 6px;
          cursor: pointer;
        }
        
        .cancel-btn {
          padding: 10px 20px;
          background: #f44336;
          color: white;
          border: none;
          border-radius: 6px;
          cursor: pointer;
        }
        
        .analytics-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 20px;
          margin-bottom: 30px;
        }
        
        .analytics-card {
          background: rgba(255,255,255,0.95);
          padding: 20px;
          border-radius: 12px;
          box-shadow: 0 4px 6px rgba(0,0,0,0.1);
        }
        
        .chart-container {
          background: rgba(255,255,255,0.95);
          padding: 20px;
          border-radius: 12px;
          box-shadow: 0 4px 6px rgba(0,0,0,0.1);
          margin-bottom: 20px;
        }
        
        .progress-overview {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
          gap: 15px;
          margin-bottom: 20px;
        }
        
        .member-card {
          background: rgba(255,255,255,0.95);
          padding: 15px;
          border-radius: 10px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        
        .member-header {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 10px;
        }
        
        .progress-bar {
          width: 100%;
          height: 8px;
          background: #f0f0f0;
          border-radius: 4px;
          overflow: hidden;
          margin-bottom: 8px;
        }
        
        .progress-fill {
          height: 100%;
          transition: width 0.3s ease;
        }
        
        .member-stats {
          font-size: 0.9em;
          color: #666;
        }
        
        .achievement-badge {
          padding: 4px 8px;
          border-radius: 12px;
          font-size: 0.8em;
          font-weight: bold;
        }
        
        .achievement-complete {
          background: #4CAF50;
          color: white;
        }
        
        .achievement-progress {
          background: #2196F3;
          color: white;
        }
        
        .achievement-warning {
          background: #FF9800;
          color: white;
        }
        
        .team-stats {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 15px;
          text-align: center;
        }
        
        .stat-item {
          padding: 15px;
          border-radius: 8px;
        }
        
        .stat-value {
          font-size: 2em;
          font-weight: bold;
          margin-bottom: 5px;
        }
        
        .stat-label {
          color: #666;
          font-size: 0.9em;
        }
        
        .empty-state {
          text-align: center;
          padding: 60px 20px;
          color: rgba(255,255,255,0.8);
        }
      `}</style>

      <div className="period-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          {onBack && (
            <button 
              onClick={onBack}
              className="back-btn"
              style={{ 
                padding: '8px 16px', 
                background: 'rgba(255,255,255,0.2)', 
                color: 'white', 
                border: 'none', 
                borderRadius: '8px', 
                cursor: 'pointer' 
              }}
            >
              ← Zurück
            </button>
          )}
          <h2>📊 Period Analytics - {analytics.period.name}</h2>
        </div>
        <div className="period-controls">
          <select 
            value={selectedPeriod || ''}
            onChange={(e) => setSelectedPeriod(e.target.value)}
            className="period-selector"
          >
            {periods.map(period => (
              <option key={period.id} value={period.id}>
                {period.name} ({new Date(period.startDate).toLocaleDateString()} - {new Date(period.endDate).toLocaleDateString()})
              </option>
            ))}
          </select>
          <button 
            onClick={() => setShowCreatePeriod(true)}
            className="create-period-btn"
          >
            + Neuer Zeitraum
          </button>
        </div>
      </div>

      {showCreatePeriod && (
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="create-period-modal"
        >
          <div className="modal-content">
            <h3>Neuen Zeitraum erstellen</h3>
            <div className="form-row">
              <input
                type="text"
                placeholder="Zeitraum Name (z.B. Februar 2024)"
                value={newPeriodForm.name}
                onChange={(e) => setNewPeriodForm(prev => ({ ...prev, name: e.target.value }))}
              />
            </div>
            <div className="form-row">
              <input
                type="date"
                value={newPeriodForm.startDate}
                onChange={(e) => setNewPeriodForm(prev => ({ ...prev, startDate: e.target.value }))}
              />
              <input
                type="date"
                value={newPeriodForm.endDate}
                onChange={(e) => setNewPeriodForm(prev => ({ ...prev, endDate: e.target.value }))}
              />
            </div>
            <div className="form-row">
              <input
                type="number"
                placeholder="Ziel Punkte"
                value={newPeriodForm.targetPoints}
                onChange={(e) => setNewPeriodForm(prev => ({ ...prev, targetPoints: parseInt(e.target.value) || 0 }))}
              />
            </div>
            <div className="form-actions">
              <button onClick={handleCreatePeriod} className="confirm-btn">Erstellen</button>
              <button onClick={() => setShowCreatePeriod(false)} className="cancel-btn">Abbrechen</button>
            </div>
          </div>
        </motion.div>
      )}

      {/* Line Chart mit Target Line */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="chart-container"
      >
        <div className="chart-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h3>📈 Punkte-Entwicklung über Zeit</h3>
          <button 
            onClick={() => setChartRefreshKey(Date.now())}
            style={{
              padding: '8px 16px',
              background: 'rgba(255,255,255,0.2)',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer'
            }}
          >
            🔄 Chart Aktualisieren
          </button>
        </div>
        <ResponsiveContainer width="100%" height={400}>
          <LineChart data={chartData} key={chartRefreshKey}>
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
            {analytics.memberProgress.map((member, index) => (
              <Line
                key={member.userId}
                type="monotone"
                dataKey={member.user.name}
                stroke={memberColors[index]}
                strokeWidth={2}
                name={`${member.user.emoji || '👤'} ${member.user.name}`}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </motion.div>

      {/* Team Stats */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="analytics-card"
      >
        <h3>🏆 Team Übersicht</h3>
        <div className="team-stats">
          <div className="stat-item" style={{ background: '#e3f2fd' }}>
            <div className="stat-value" style={{ color: '#1976d2' }}>{analytics.teamStats.totalPoints}</div>
            <div className="stat-label">Gesamt Punkte</div>
          </div>
          <div className="stat-item" style={{ background: '#f3e5f5' }}>
            <div className="stat-value" style={{ color: '#7b1fa2' }}>{analytics.teamStats.averageAchievement}%</div>
            <div className="stat-label">Durchschnitt Zielerreichung</div>
          </div>
          <div className="stat-item" style={{ background: '#e8f5e8' }}>
            <div className="stat-value" style={{ color: '#388e3c' }}>{analytics.teamStats.completedMembers}</div>
            <div className="stat-label">Ziele erreicht</div>
          </div>
          <div className="stat-item" style={{ background: '#fff3e0' }}>
            <div className="stat-value" style={{ color: '#f57c00' }}>{analytics.teamStats.pendingMembers}</div>
            <div className="stat-label">Noch in Progress</div>
          </div>
        </div>
      </motion.div>

      {/* Member Progress Cards */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="progress-overview"
      >
        {analytics.memberProgress.map((member, index) => (
          <div key={member.userId} className="member-card">
            <div className="member-header">
              <span style={{ fontSize: '1.5em' }}>{member.user.emoji || '👤'}</span>
              <div>
                <strong>{member.user.name}</strong>
                <div className="member-stats">
                  {member.currentPoints} / {member.targetPoints} Punkte
                </div>
              </div>
              <div 
                className={`achievement-badge ${
                  member.achievement >= 100 ? 'achievement-complete' :
                  member.achievement >= 75 ? 'achievement-progress' : 'achievement-warning'
                }`}
              >
                {member.achievement}%
              </div>
            </div>
            
            <div className="progress-bar">
              <div 
                className="progress-fill"
                style={{ 
                  width: `${Math.min(member.achievement, 100)}%`,
                  background: memberColors[index]
                }}
              />
            </div>
            
            <div className="member-stats">
              Status: {member.isCompleted ? '✅ Ziel erreicht!' : `❌ ${member.targetPoints - member.currentPoints} Punkte fehlen`}
            </div>
          </div>
        ))}
      </motion.div>
    </div>
  );
}