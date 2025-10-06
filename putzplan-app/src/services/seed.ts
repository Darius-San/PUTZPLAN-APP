import { dataManager } from './dataManager';
import { AppState, User, WG, Task, TaskRating, TaskExecution, ExecutionStatus } from '../types';

// Deterministic IDs & timestamps for reproducible tests
const FIXED_DATE = new Date('2025-01-01T10:00:00Z');

interface SeedOptions { force?: boolean; variant?: 'basic' | 'darius' }

// Flag wird abhängig von der Variante gespeichert, damit man zwischen Varianten wechseln kann
const seededFlagPrefix = 'putzplan-demo-seeded-v1';

const basicUserDefs: Array<Pick<User, 'id' | 'name' | 'avatar' | 'email'>> = [
  { id: 'u1', name: 'Darius', avatar: '🧠', email: 'darius@example.com' },
  { id: 'u2', name: 'Mara', avatar: '🦊', email: 'mara@example.com' },
  { id: 'u3', name: 'Lena', avatar: '🐧', email: 'lena@example.com' },
  { id: 'u4', name: 'Kai', avatar: '🐼', email: 'kai@example.com' },
  { id: 'u5', name: 'Timo', avatar: '🦁', email: 'timo@example.com' },
  { id: 'u6', name: 'Nora', avatar: '🐙', email: 'nora@example.com' }
];

// Subset / approximation of legacy debugTasks (18 entries)
const baseTaskDefs: Array<Partial<Task> & { id: string; title: string; emoji: string; minDaysBetween?: number; description?: string }> = [
  { id: 't1', title: 'Küche putzen', emoji: '🍳', minDaysBetween: 2, description: 'Oberflächen reinigen & Herd säubern' },
  { id: 't2', title: 'Bad reinigen', emoji: '🛁', minDaysBetween: 3, description: 'Waschbecken, Dusche, Spiegel' },
  { id: 't3', title: 'Staubsaugen', emoji: '🧹', minDaysBetween: 1, description: 'Alle Zimmer saugen' },
  { id: 't4', title: 'Müll rausbringen', emoji: '🗑️', minDaysBetween: 1, description: 'Restmüll & Gelber Sack' },
  { id: 't5', title: 'Boden wischen', emoji: '🧼', minDaysBetween: 4 },
  { id: 't6', title: 'Kühlschrank check', emoji: '🥶', minDaysBetween: 5 },
  { id: 't7', title: 'Einkaufsliste pflegen', emoji: '📝', minDaysBetween: 2 },
  { id: 't8', title: 'Fenster putzen', emoji: '🪟', minDaysBetween: 14 },
  { id: 't9', title: 'Pflanzen gießen', emoji: '🪴', minDaysBetween: 2 },
  { id: 't10', title: 'Spülmaschine', emoji: '🍽️', minDaysBetween: 1 },
  { id: 't11', title: 'Wäsche waschen', emoji: '👕', minDaysBetween: 3 },
  { id: 't12', title: 'Flur fegen', emoji: '🚪', minDaysBetween: 3 },
  { id: 't13', title: 'Ofen reinigen', emoji: '🔥', minDaysBetween: 30 },
  { id: 't14', title: 'Regale abstauben', emoji: '🧴', minDaysBetween: 7 },
  { id: 't15', title: 'Mikrowelle reinigen', emoji: '🌀', minDaysBetween: 10 },
  { id: 't16', title: 'Tisch desinfizieren', emoji: '🧪', minDaysBetween: 2 },
  { id: 't17', title: 'Essen planen', emoji: '🥗', minDaysBetween: 7 },
  { id: 't18', title: 'Altglas wegbringen', emoji: '🧴', minDaysBetween: 14 }
];

// ------------------------------------------------------
// BASIC SEED (bisheriges Verhalten)
// ------------------------------------------------------
function buildSeedStateBasic(): AppState {
  // Build user map
  const users: AppState['users'] = {};
  basicUserDefs.forEach(u => {
    users[u.id] = {
      id: u.id,
      name: u.name,
      avatar: u.avatar,
      email: u.email,
      joinedAt: FIXED_DATE,
      isActive: true,
      currentMonthPoints: 0,
      targetMonthlyPoints: 100,
      totalCompletedTasks: 0
    };
  });

  // Define WG early (needed for wgId on tasks)
  const wg: WG = {
    id: 'wg1',
    name: 'Darius WG',
    description: 'Demo Seed WG',
    memberIds: basicUserDefs.map(u => u.id),
    inviteCode: 'DEMO123',
    createdAt: FIXED_DATE,
    settings: {
      monthlyPointsTarget: 100,
      reminderSettings: {
        lowPointsThreshold: 20,
        overdueDaysThreshold: 3,
        enablePushNotifications: false
      }
    }
  };

  // Build tasks map (simplified scoring approximating legacy: basePoints 10..40)
  const tasks: AppState['tasks'] = {};
  baseTaskDefs.forEach((t, idx) => {
    const difficulty = ((idx % 5) + 3); // 3..7
    const importance = ((idx % 4) + 4); // 4..7
    const avgMinutes = 10 + (idx % 6) * 5; // 10,15,20...
    const basePoints = Math.max(5, Math.round(avgMinutes * 0.6 + difficulty * 2 + importance));
    const monthlyFrequency = Math.max(1, Math.round(30 / Math.max(1, (t.minDaysBetween || 7))));

    tasks[t.id] = {
      id: t.id,
      wgId: wg.id,
      title: t.title,
      description: t.description || t.title,
      emoji: t.emoji,
      category: 0 as any, // TaskCategory.GENERAL placeholder (enum numeric)
      averageMinutes: avgMinutes,
      averagePainLevel: difficulty,
      averageImportance: importance,
      monthlyFrequency,
      basePoints,
      difficultyScore: difficulty,
      unpleasantnessScore: difficulty,
      pointsPerExecution: basePoints,
      totalMonthlyPoints: basePoints * monthlyFrequency,
      constraints: {
        minDaysBetween: t.minDaysBetween,
        maxDaysBetween: Math.max( (t.minDaysBetween || 7) * 2, 7),
        requiresPhoto: false,
  // requiresVerification intentionally omitted (string userId when needed)
      },
      createdBy: 'u1',
      createdAt: FIXED_DATE,
      isActive: true,
      setupComplete: true
    };
  });

  // wg already declared above

  // Minimal empty maps for others
  return {
    currentUser: null, // Start auf Profil-Übersicht
    currentWG: wg,
    wgs: { [wg.id]: wg },
    users,
    tasks,
    executions: {},
    ratings: {},
    notifications: {},
    monthlyStats: {},
    taskSuggestions: [],
    isLoading: false,
    lastSyncAt: undefined
  } as AppState;
}

// ------------------------------------------------------
// DARIUS WG VARIANT (mit Ratings & Beispiel-Executions)
// ------------------------------------------------------

const dariusMembers: Array<Pick<User,'id'|'name'|'avatar'|'email'>> = [
  { id: 'u1', name: 'Darius', avatar: '😎', email: 'darius@wg-darius.de' },
  { id: 'u2', name: 'Lilly', avatar: '🌸', email: 'lilly@wg-darius.de' },
  { id: 'u3', name: 'Hendrik I', avatar: '🤓', email: 'hendrik1@wg-darius.de' },
  { id: 'u4', name: 'Hendrik II', avatar: '😊', email: 'hendrik2@wg-darius.de' },
  { id: 'u5', name: 'Hamza Hamza', avatar: '🚀', email: 'hamza@wg-darius.de' },
  { id: 'u6', name: 'Sofia', avatar: '✨', email: 'sofia@wg-darius.de' }
];

// Personality Profile Werte (0..1)
const personality: Record<string, { efficiency: number; cleanliness: number; patience: number; strength: number }> = {
  'Darius': { efficiency: 0.8, cleanliness: 0.7, patience: 0.6, strength: 0.8 },
  'Lilly': { efficiency: 0.9, cleanliness: 0.9, patience: 0.8, strength: 0.6 },
  'Hendrik I': { efficiency: 0.6, cleanliness: 0.6, patience: 0.9, strength: 0.7 },
  'Hendrik II': { efficiency: 0.7, cleanliness: 0.5, patience: 0.7, strength: 0.8 },
  'Hamza Hamza': { efficiency: 0.8, cleanliness: 0.8, patience: 0.5, strength: 0.9 },
  'Sofia': { efficiency: 0.7, cleanliness: 0.8, patience: 0.8, strength: 0.5 }
};

// Deterministische Variation statt Math.random (Hash)
function hashNum(input: string, mod: number) {
  let h = 0; for (let i=0;i<input.length;i++) h = (h * 31 + input.charCodeAt(i)) >>> 0; return (h % mod);
}

function buildSeedStateDarius(): AppState {
  // Users
  const users: AppState['users'] = {};
  dariusMembers.forEach(u => {
    users[u.id] = {
      id: u.id,
      name: u.name,
      avatar: u.avatar,
      email: u.email,
      joinedAt: FIXED_DATE,
      isActive: true,
      currentMonthPoints: 0,
      targetMonthlyPoints: 120, // etwas höher für realistischere Verteilung
      totalCompletedTasks: 0
    };
  });

  // WG definition first (for wgId)
  const wg: WG = {
    id: 'wg-darius',
    name: 'WG Darius & Co',
    description: 'Vorkonfigurierte Demo mit Bewertungen & Ausführungen',
    memberIds: dariusMembers.map(m => m.id),
    inviteCode: 'DARIUSWG',
    createdAt: FIXED_DATE,
    settings: {
      monthlyPointsTarget: 120,
      reminderSettings: {
        lowPointsThreshold: 20,
        overdueDaysThreshold: 3,
        enablePushNotifications: false
      }
    }
  };

  // Tasks (reuse baseTaskDefs)
  const tasks: AppState['tasks'] = {};
  baseTaskDefs.forEach((t, idx) => {
    const difficulty = ((idx % 5) + 4); // leicht höher 4..8
    const importance = ((idx % 4) + 4);
    const avgMinutes = 12 + (idx % 6) * 6;
    const basePoints = Math.max(5, Math.round(avgMinutes * 0.6 + difficulty * 2 + importance));
    const monthlyFrequency = Math.max(1, Math.round(30 / Math.max(1, (t.minDaysBetween || 7))));
    tasks[t.id] = {
      id: t.id,
      wgId: wg.id,
      title: t.title,
      description: t.description || t.title,
      emoji: t.emoji,
      category: 0 as any,
      averageMinutes: avgMinutes,
      averagePainLevel: difficulty,
      averageImportance: importance,
      monthlyFrequency,
      basePoints,
      difficultyScore: difficulty,
      unpleasantnessScore: difficulty,
      pointsPerExecution: basePoints,
      totalMonthlyPoints: basePoints * monthlyFrequency,
      constraints: {
        minDaysBetween: t.minDaysBetween,
        maxDaysBetween: Math.max((t.minDaysBetween || 7) * 2, 7),
        requiresPhoto: false,
  // requiresVerification intentionally omitted
      },
      createdBy: 'u1',
      createdAt: FIXED_DATE,
      isActive: true,
      setupComplete: true
    };
  });

  // Ratings (TaskRating) deterministisch generieren
  const ratings: AppState['ratings'] = {};
  let ratingCounter = 1;
  dariusMembers.forEach(member => {
    const profile = personality[member.name];
    Object.values(tasks).forEach(task => {
      const baseKey = member.id + ':' + task.id;
      const eff = profile?.efficiency ?? 0.7;
      const clean = profile?.cleanliness ?? 0.7;
      const patience = profile?.patience ?? 0.7;
      const strength = profile?.strength ?? 0.7;

      // Heuristik ähnlich der Legacy-Branches (vereinfacht + deterministisch)
      let minutes = Math.round(task.averageMinutes * (0.8 + (1 - eff) * 0.4));
      minutes += hashNum(baseKey + 'm', 5) - 2; // kleine Schwankung -2..+2
      minutes = Math.max(5, minutes);

      let painLevel = Math.round(3 + (1 - strength) * 4 + hashNum(baseKey + 'p', 3));
      painLevel = Math.min(10, Math.max(1, painLevel));

      let importance = Math.round(3 + clean * 3 + hashNum(baseKey + 'i', 2));
      importance = Math.min(10, Math.max(1, importance));

      const freq = Math.max(1, Math.min(6, Math.round((30 / task.constraints.maxDaysBetween) || 2)));
      const rating: TaskRating = {
        id: 'r' + ratingCounter++,
        taskId: task.id,
        userId: member.id,
        estimatedMinutes: minutes,
        painLevel,
        importance,
        suggestedFrequency: freq,
        createdAt: new Date(FIXED_DATE.getTime() + hashNum(baseKey, 5000) * 1000)
      };
      ratings[rating.id] = rating;
    });
  });

  // Beispiel-Executions (einige Tasks wurden bereits erledigt)
  const executions: AppState['executions'] = {};
  let execCounter = 1;
  const sampleTaskIds = ['t1','t2','t3','t4','t9','t10','t11'];
  sampleTaskIds.forEach((tid, idx) => {
    const task = tasks[tid];
    // zwei unterschiedliche Ausführende pro Task (runde-robin)
    const userA = dariusMembers[idx % dariusMembers.length];
    const userB = dariusMembers[(idx + 2) % dariusMembers.length];
    [userA, userB].forEach((user, j) => {
      const executedAt = new Date(FIXED_DATE.getTime() + (idx * 86400000) + j * 3600000 * 6); // gestaffelt
      const pointsAwarded = Math.round(task.basePoints * (1 + (task.difficultyScore - 1) * 0.2) * (1 + (task.unpleasantnessScore - 1) * 0.3));
      const execution: TaskExecution = {
        id: 'e' + execCounter++,
        taskId: tid,
        executedBy: user.id,
        executedAt,
        photo: undefined,
        notes: 'Seed Exec',
        pointsAwarded,
        isVerified: true,
        status: ExecutionStatus.VERIFIED
      };
      executions[execution.id] = execution;
      // Punkte aufsummieren
      const u = users[user.id];
      u.currentMonthPoints += pointsAwarded;
      u.totalCompletedTasks += 1;
    });
  });

  // wg already declared above

  return {
    currentUser: null,
    currentWG: wg,
    wgs: { [wg.id]: wg },
    users,
    tasks,
    executions,
    ratings,
    notifications: {},
    monthlyStats: {},
    taskSuggestions: [],
    isLoading: false,
    lastSyncAt: undefined
  } as AppState;
}

export function seedDemoData(options: SeedOptions = {}) {
  const { force, variant = 'darius' } = options;
  const seededFlagKey = `${seededFlagPrefix}-${variant}`;
  const already = localStorage.getItem(seededFlagKey);
  const state = dataManager.getState();
  if (!force && already && Object.keys(state.users).length > 0) {
    return;
  }
  const seedState = variant === 'darius' ? buildSeedStateDarius() : buildSeedStateBasic();
  dataManager.importData(JSON.stringify({ data: seedState }));
  localStorage.setItem(seededFlagKey, '1');
  console.log(`[seed] Demo dataset applied (variant=${variant})`);
}

export function ensureSeed(variant: 'basic' | 'darius' = 'darius') {
  const st = dataManager.getState();
  if (Object.keys(st.users).length === 0 && Object.keys(st.tasks).length === 0) {
    seedDemoData({ variant });
  }
}
