import { TaskCategory, ExecutionStatus } from '../types';
import { dataManager } from '../services/dataManager';

export const initializeDemoData = () => {
  // Prüfe ob bereits Daten vorhanden sind
  const state = dataManager.getState();
  if (Object.keys(state.tasks).length > 0) {
    return; // Demo-Daten bereits vorhanden
  }

  console.log('Initialisiere Demo-Daten...');

  // Erstelle Demo-Tasks
  const demoTasks = [
    {
      title: 'Küche putzen',
      description: 'Arbeitsplatte abwischen, Spüle reinigen, Herd saubermachen',
      category: TaskCategory.KITCHEN,
      timeEstimate: 30,
      difficultyScore: 2,
      unpleasantnessScore: 2,
      constraints: {
        maxDaysBetween: 3,
        minDaysBetween: 1,
        requiresPhoto: true
      },
      isActive: true
    },
    {
      title: 'Bad putzen',
      description: 'Toilette, Waschbecken und Dusche reinigen',
      category: TaskCategory.BATHROOM,
      timeEstimate: 45,
      difficultyScore: 3,
      unpleasantnessScore: 4,
      constraints: {
        maxDaysBetween: 7,
        requiresPhoto: true
      },
      isActive: true
    },
    {
      title: 'Staubsaugen Wohnzimmer',
      description: 'Wohnzimmer gründlich staubsaugen, auch unter Möbeln',
      category: TaskCategory.LIVING_ROOM,
      timeEstimate: 20,
      difficultyScore: 1,
      unpleasantnessScore: 2,
      constraints: {
        maxDaysBetween: 7,
        requiresPhoto: false
      },
      isActive: true
    },
    {
      title: 'Müll rausbringen',
      description: 'Alle Mülleimer leeren und Müll zur Tonne bringen',
      category: TaskCategory.GENERAL,
      timeEstimate: 10,
      difficultyScore: 1,
      unpleasantnessScore: 3,
      constraints: {
        maxDaysBetween: 2,
        requiresPhoto: false
      },
      isActive: true
    },
    {
      title: 'Kühlschrank putzen',
      description: 'Kühlschrank innen reinigen und abgelaufene Sachen entsorgen',
      category: TaskCategory.KITCHEN,
      timeEstimate: 25,
      difficultyScore: 2,
      unpleasantnessScore: 3,
      constraints: {
        maxDaysBetween: 14,
        requiresPhoto: true
      },
      isActive: true
    },
    {
      title: 'Fenster putzen',
      description: 'Alle Fenster im Wohnbereich von innen putzen',
      category: TaskCategory.GENERAL,
      timeEstimate: 60,
      difficultyScore: 3,
      unpleasantnessScore: 2,
      constraints: {
        maxDaysBetween: 21,
        requiresPhoto: true
      },
      isActive: true
    },
    {
      title: 'Spülmaschine ausräumen',
      description: 'Geschirr aus der Spülmaschine ausräumen und einordnen',
      category: TaskCategory.KITCHEN,
      timeEstimate: 10,
      difficultyScore: 1,
      unpleasantnessScore: 1,
      constraints: {
        maxDaysBetween: 1,
        requiresPhoto: false
      },
      isActive: true
    },
    {
      title: 'Flur wischen',
      description: 'Flur feucht wischen und Schuhe ordnen',
      category: TaskCategory.GENERAL,
      timeEstimate: 15,
      difficultyScore: 1,
      unpleasantnessScore: 2,
      constraints: {
        maxDaysBetween: 7,
        requiresPhoto: false
      },
      isActive: true
    }
  ];

  // Tasks erstellen
  demoTasks.forEach(taskData => {
    try {
      dataManager.createTask(taskData);
    } catch (error) {
      console.error('Fehler beim Erstellen des Demo-Tasks:', error);
    }
  });

  // Erstelle ein paar vergangene Ausführungen für Realismus
  const state2 = dataManager.getState();
  const tasks = Object.values(state2.tasks);
  
  if (tasks.length > 0 && state2.currentUser) {
    // Simuliere vergangene Task-Ausführungen
    const threeDaysAgo = new Date();
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
    
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);

    // Spülmaschine vor 1 Tag
    const spuelmaschinTask = tasks.find(t => t.title.includes('Spülmaschine'));
    if (spuelmaschinTask) {
      const execution = {
        id: 'demo-exec-1',
        taskId: spuelmaschinTask.id,
        executedBy: state2.currentUser.id,
        executedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
        pointsAwarded: 8,
        status: ExecutionStatus.VERIFIED,
        isVerified: true
      };
      dataManager.getState().executions[execution.id] = execution;
    }

    // Müll vor 2 Tagen
    const muellTask = tasks.find(t => t.title.includes('Müll'));
    if (muellTask) {
      const execution = {
        id: 'demo-exec-2',
        taskId: muellTask.id,
        executedBy: state2.currentUser.id,
        executedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
        pointsAwarded: 12,
        status: ExecutionStatus.VERIFIED,
        isVerified: true
      };
      dataManager.getState().executions[execution.id] = execution;
    }

    // User-Punkte aktualisieren
    dataManager.updateUser(state2.currentUser.id, {
      currentMonthPoints: 20,
      totalCompletedTasks: 2
    });
  }

  console.log('Demo-Daten erstellt!');
};