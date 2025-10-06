// ========================================
// PUTZPLAN APP - DATENMODELL
// ========================================

// Benutzer in der WG
export interface User {
  id: string;
  name: string;
  email?: string;
  avatar: string; // Avatar ist jetzt required (Emoji oder Upload)
  joinedAt: Date;
  isActive: boolean;
  currentMonthPoints: number;
  targetMonthlyPoints: number;
  totalCompletedTasks: number;
}

// WG (Wohngemeinschaft)
export interface WG {
  id: string;
  name: string;
  description?: string;
  createdAt: Date;
  memberIds: string[];
  inviteCode: string;
  settings: WGSettings;
}

// WG-Einstellungen
export interface WGSettings {
  monthlyPointsTarget: number;
  reminderSettings: {
    lowPointsThreshold: number; // Prozent der Zielpunkte
    overdueDaysThreshold: number; // Nach wie vielen Tagen Task als überfällig gilt
    enablePushNotifications: boolean;
  };
}

// Task-Definition (Template)
export interface Task {
  id: string;
  wgId?: string; // Zugehörige WG (optional für Legacy Tasks, künftig required)
  title: string;
  description: string;
  emoji: string; // Emoticon für den Task
  category: TaskCategory;
  checklist?: string[]; // optionale Checklisten-Punkte
  
  // Bewertungssystem (basierend auf Community-Bewertungen)
  averageMinutes: number; // Durchschnittliche Minuten aller Bewertungen
  averagePainLevel: number; // Durchschnitt Pain-in-the-ass (1-10)
  averageImportance: number; // Durchschnittliche Wichtigkeit (1-10)
  monthlyFrequency: number; // Wie oft pro Monat
  
  // Berechnete Werte
  basePoints: number; // Basis-Punkte für den Task
  difficultyScore: number; // Schwierigkeitsgrad (1-10)
  unpleasantnessScore: number; // Unangenehmheit (1-10)
  pointsPerExecution: number; // Berechnete Punkte pro Ausführung
  totalMonthlyPoints: number; // Punkte * Häufigkeit pro Monat
  
  // Constraints
  constraints: TaskConstraints;
  
  // Metadaten
  createdBy: string;
  createdAt: Date;
  isActive: boolean;
  setupComplete: boolean; // Ob alle Mitglieder bewertet haben
}

// Task-Kategorien
export enum TaskCategory {
  KITCHEN = 'kitchen',
  BATHROOM = 'bathroom',
  LIVING_ROOM = 'living_room',
  BEDROOM = 'bedroom',
  GENERAL = 'general',
  OUTDOOR = 'outdoor',
  MAINTENANCE = 'maintenance'
}

// Task-Einschränkungen
export interface TaskConstraints {
  // Zeitliche Einschränkungen
  minDaysBetween?: number; // Mindestabstand zwischen Ausführungen
  maxDaysBetween: number; // Maximalabstand (dann wird's überfällig)
  
  // Wer darf den Task machen
  allowedUsers?: string[]; // Falls nur bestimmte Personen
  forbiddenUsers?: string[]; // Falls bestimmte Personen ausgeschlossen
  
  // Weitere Constraints
  requiresPhoto: boolean;
  requiresVerification?: string; // ID eines anderen Users zur Bestätigung
  maxExecutionsPerMonth?: number; // Maximale Ausführungen pro Person/Monat
}

// Task-Instanz (konkrete Ausführung)
export interface TaskExecution {
  id: string;
  taskId: string;
  executedBy: string;
  executedAt: Date;
  
  // Beweis/Dokumentation
  photo?: string; // Base64 oder URL
  notes?: string;
  
  // Verifikation
  verifiedBy?: string;
  verifiedAt?: Date;
  isVerified: boolean;
  
  // Punkte
  pointsAwarded: number;
  
  // Status
  status: ExecutionStatus;
}

export enum ExecutionStatus {
  COMPLETED = 'completed',
  PENDING_VERIFICATION = 'pending_verification',
  VERIFIED = 'verified',
  REJECTED = 'rejected'
}

// Bewertung eines Tasks durch einen User (neues System)
export interface TaskRating {
  id: string;
  taskId: string;
  userId: string;
  
  // Setup-Bewertungen
  estimatedMinutes: number; // Wie lange brauchst du persönlich?
  painLevel: number; // Pain-in-the-ass Level (1-10)
  importance: number; // Wie wichtig ist der Task? (1-10)
  suggestedFrequency: number; // Wie oft pro Monat sollte gemacht werden?
  
  createdAt: Date;
}

// Bewertung einer konkreten Ausführung (nachträgliche Bewertung wie im Legacy-Modal)
export interface PostExecutionRating {
  id: string;
  executionId: string;
  taskId: string;
  createdAt: Date;
  ratedBy: string; // User der bewertet
  score: number;   // 1-5 Sterne (vereinfachtes Modell)
  notes?: string;
}

// Abwesenheit eines Users (Absences)
export interface Absence {
  id: string;
  userId: string;
  reason: 'vacation' | 'work' | 'family' | 'other';
  startDate: Date;
  endDate: Date;
  createdAt: Date;
  updatedAt?: Date;
  daysCached?: number; // optional zur schnellen Anzeige
}

// Temporärer Bewohner (Temporary Resident)
export interface TemporaryResident {
  id: string;
  profileId: string; // WG/Profil Kontext
  name: string;
  icon: string;
  startDate: Date;
  endDate: Date;
  addedAt: Date;
}

// Perioden-Information (aktueller Monat / Abrechnungszeitraum)
export interface PeriodInfo {
  id: string; // z.B. '2025-10'
  start: Date;
  end: Date;
  days: number;
}

// Monatliche Statistiken pro User
export interface MonthlyUserStats {
  id: string;
  userId: string;
  month: string; // 'YYYY-MM'
  
  // Punkte
  targetPoints: number;
  earnedPoints: number;
  
  // Tasks
  completedTasks: number;
  completedTasksByCategory: Record<TaskCategory, number>;
  
  // Verhalten
  averageCompletionTime: number; // Durchschnittliche Zeit zwischen Erstellung und Ausführung
  photosUploaded: number;
  verificationsGiven: number;
  
  // Berechnet
  completionRate: number; // Prozent der Zielpunkte erreicht
  rank: number; // Position in der WG für diesen Monat
}

// Task-Vorschlag basierend auf Algorithmus
export interface TaskSuggestion {
  task: Task;
  priority: number; // 0-1 (1 = höchste Priorität)
  reason: SuggestionReason[];
  daysOverdue?: number;
  lastExecutedAt?: Date;
  pointsForUser: number;
}

export enum SuggestionReason {
  OVERDUE = 'overdue',
  USER_BEHIND_POINTS = 'user_behind_points',
  USER_PREFERENCE = 'user_preference', // Basierend auf Historie
  BALANCED_WORKLOAD = 'balanced_workload',
  CONSTRAINT_ENDING = 'constraint_ending' // Zeitfenster läuft ab
}

// Benachrichtigungen
export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  
  // Daten
  relatedTaskId?: string;
  relatedExecutionId?: string;
  
  // Status
  isRead: boolean;
  createdAt: Date;
  expiresAt?: Date;
}

export enum NotificationType {
  TASK_OVERDUE = 'task_overdue',
  LOW_POINTS = 'low_points',
  MONTH_ENDING = 'month_ending',
  VERIFICATION_NEEDED = 'verification_needed',
  TASK_VERIFIED = 'task_verified',
  NEW_TASK_ADDED = 'new_task_added',
  WG_MEMBER_JOINED = 'wg_member_joined'
}

// App-State für lokale Datenverwaltung
export interface AppState {
  currentUser: User | null;
  currentWG: WG | null;
  // Mehrere WGs werden jetzt unterstützt
  wgs?: Record<string, WG>; // map wgId -> WG
  
  // Daten
  users: Record<string, User>;
  tasks: Record<string, Task>;
  executions: Record<string, TaskExecution>;
  ratings: Record<string, TaskRating>;
  postExecutionRatings?: Record<string, PostExecutionRating>; // optional bis Implementierung fertig
  notifications: Record<string, Notification>;
  absences?: Record<string, Absence[]>; // userId -> Liste
  temporaryResidents?: Record<string, TemporaryResident[]>; // profileId -> Liste
  
  // Cache/Computed
  monthlyStats: Record<string, MonthlyUserStats>;
  taskSuggestions: TaskSuggestion[];
  currentPeriod?: PeriodInfo;
  
  // UI State
  isLoading: boolean;
  lastSyncAt?: Date;
}

// API Response Types für Backend-Integration (später)
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// Setup-Prozess Interfaces
export type SetupPhase = 'user_creation' | 'task_creation' | 'collaborative_rating' | 'complete';

export interface SetupState {
  currentPhase: SetupPhase;
  wgId: string;
  createdTasks: string[]; // Task IDs
  participatingUsers: string[]; // User IDs die teilnehmen
  ratingsComplete: boolean;
}

export interface BasicTaskTemplate {
  title: string;
  description: string;
  emoji: string;
  category: TaskCategory;
}

// Avatar-Optionen
export interface AvatarOption {
  id: string;
  emoji: string;
  name: string;
}

export const AVATAR_OPTIONS: AvatarOption[] = [
  { id: '1', emoji: '😊', name: 'Fröhlich' },
  { id: '2', emoji: '😎', name: 'Cool' },
  { id: '3', emoji: '🤓', name: 'Nerd' },
  { id: '4', emoji: '😴', name: 'Müde' },
  { id: '5', emoji: '🥳', name: 'Party' },
  { id: '6', emoji: '😇', name: 'Engel' },
  { id: '7', emoji: '🤔', name: 'Nachdenklich' },
  { id: '8', emoji: '😋', name: 'Lecker' },
  { id: '9', emoji: '🙃', name: 'Verrückt' },
  { id: '10', emoji: '🤗', name: 'Umarmung' },
  { id: '11', emoji: '🥺', name: 'Süß' },
  { id: '12', emoji: '😤', name: 'Entschlossen' }
];

// Task-Emoticon-Optionen
export const TASK_EMOJI_OPTIONS = [
  { id: '1', emoji: '🧽', name: 'Putzen', category: 'cleaning' },
  { id: '2', emoji: '🍽️', name: 'Geschirr', category: 'kitchen' },
  { id: '3', emoji: '🚿', name: 'Bad', category: 'bathroom' },
  { id: '4', emoji: '🧹', name: 'Fegen', category: 'cleaning' },
  { id: '5', emoji: '🗑️', name: 'Müll', category: 'general' },
  { id: '6', emoji: '🧺', name: 'Wäsche', category: 'laundry' },
  { id: '7', emoji: '🪟', name: 'Fenster', category: 'cleaning' },
  { id: '8', emoji: '🛏️', name: 'Bett', category: 'bedroom' },
  { id: '9', emoji: '🌱', name: 'Pflanzen', category: 'plants' },
  { id: '10', emoji: '🧤', name: 'Handschuhe', category: 'cleaning' },
  { id: '11', emoji: '🚰', name: 'Wasserhahn', category: 'maintenance' },
  { id: '12', emoji: '💡', name: 'Glühbirne', category: 'maintenance' }
];

// Hilfs-Typen für Formulare
export interface CreateTaskForm {
  title: string;
  description: string;
  emoji: string;
  category: TaskCategory;
  minDaysBetween?: number; // Mindestabstand zwischen Ausführungen
}

export interface TaskRatingForm {
  taskId: string;
  estimatedMinutes: number;
  painLevel: number;
  importance: number;
  suggestedFrequency: number;
}

export interface UserCreationForm {
  name: string;
  email?: string;
  avatar: string;
}

export interface JoinWGForm {
  inviteCode: string;
  userName: string;
}

export interface CreateWGForm {
  name: string;
  description?: string;
}