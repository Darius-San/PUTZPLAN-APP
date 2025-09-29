import React, { useState } from 'react';
import { User, WG, CreateTaskForm, TaskRatingForm, SetupPhase, Task, TaskCategory, TaskConstraints } from '../../types';
import { UserCreationStep } from './steps/UserCreationStep';
import { TaskCreationStep } from './steps/TaskCreationStep';
import { CollaborativeRatingStep } from './steps/CollaborativeRatingStep';
import { usePutzplanStore } from '../../hooks/usePutzplanStore';
import { generateId } from '../../utils/helpers';

interface SetupWizardProps {
  onComplete: () => void;
}

export const SetupWizard: React.FC<SetupWizardProps> = ({ onComplete }) => {
  const [currentPhase, setCurrentPhase] = useState<SetupPhase>('user_creation');
  const [users, setUsers] = useState<User[]>([]);
  const [tasks, setTasks] = useState<CreateTaskForm[]>([]);
  const [currentUserIndex, setCurrentUserIndex] = useState(0);
  const [allRatings, setAllRatings] = useState<Record<string, TaskRatingForm[]>>({});
  
  const { addUser, addWG, addTask } = usePutzplanStore();

  const handleUserCreated = (user: Omit<User, 'id'>) => {
    const newUser: User = {
      ...user,
      id: generateId()
    };
    
    setUsers(prev => [...prev, newUser]);
    
    // Nach dem ersten User weiter zu Tasks
    if (users.length === 0) {
      setCurrentPhase('task_creation');
    }
  };

  const handleTasksCreated = (createdTasks: CreateTaskForm[]) => {
    setTasks(createdTasks);
    setCurrentPhase('collaborative_rating');
  };

  const handleRatingsComplete = (ratings: TaskRatingForm[]) => {
    const currentUser = users[currentUserIndex];
    
    // Speichere Bewertungen für aktuellen User
    setAllRatings(prev => ({
      ...prev,
      [currentUser.id]: ratings
    }));

    // Nächster User oder Setup abschließen
    if (currentUserIndex < users.length - 1) {
      setCurrentUserIndex(prev => prev + 1);
    } else {
      // Alle Users haben bewertet - Setup abschließen
      completeSetup();
    }
  };

  const completeSetup = () => {
    // 1. WG erstellen
    const wg: WG = {
      id: generateId(),
      name: "Unser WG",
      description: "Gemeinsam geschafft!",
      memberIds: users.map(u => u.id),
      inviteCode: generateId().slice(0, 6).toUpperCase(),
      createdAt: new Date(),
      settings: {
        monthlyPointsTarget: 100,
        reminderSettings: {
          lowPointsThreshold: 20,
          overdueDaysThreshold: 3,
          enablePushNotifications: true
        }
      }
    };

    // 2. Alle User zur Datenbank hinzufügen
    users.forEach(user => addUser(user));

    // 3. WG hinzufügen
    addWG(wg);

    // 4. Tasks mit berechneten Punkten erstellen
    tasks.forEach(taskForm => {
      // Alle Bewertungen für diesen Task sammeln
      const taskRatings = Object.values(allRatings)
        .flat()
        .filter(rating => rating.taskId === taskForm.title);

      if (taskRatings.length > 0) {
        // Durchschnittswerte berechnen
        const avgMinutes = Math.round(
          taskRatings.reduce((sum, r) => sum + r.estimatedMinutes, 0) / taskRatings.length
        );
        const avgPain = Math.round(
          taskRatings.reduce((sum, r) => sum + r.painLevel, 0) / taskRatings.length
        );
        const avgImportance = Math.round(
          taskRatings.reduce((sum, r) => sum + r.importance, 0) / taskRatings.length
        );
        const avgFrequency = Math.round(
          taskRatings.reduce((sum, r) => sum + r.suggestedFrequency, 0) / taskRatings.length
        );

        // Punkte berechnen
        const points = Math.round(
          (avgMinutes + avgMinutes * avgPain * 0.1) * (avgImportance / 10)
        );

        // Task erstellen
        const task: Task = {
          id: generateId(),
          title: taskForm.title,
          description: taskForm.description,
          emoji: taskForm.emoji,
          category: TaskCategory.GENERAL,
          averageMinutes: avgMinutes,
          averagePainLevel: avgPain,
          averageImportance: avgImportance,
          monthlyFrequency: avgFrequency,
          basePoints: points, // Add missing basePoints
          difficultyScore: avgPain, // Add missing difficultyScore 
          unpleasantnessScore: avgPain, // Add missing unpleasantnessScore
          pointsPerExecution: points,
          totalMonthlyPoints: points * avgFrequency,
          constraints: {
            minDaysBetween: taskForm.minDaysBetween,
            maxDaysBetween: Math.ceil(30 / avgFrequency), // Basierend auf Frequenz
            requiresPhoto: false,
            requiresVerification: undefined
          },
          createdBy: users[0].id, // Erstellt vom ersten User
          createdAt: new Date(),
          isActive: true,
          setupComplete: true
        };

        addTask(task);
      }
    });

    // Setup abgeschlossen
    onComplete();
  };

  const addAnotherUser = () => {
    setCurrentPhase('user_creation');
  };

  // Render aktuelle Phase
  switch (currentPhase) {
    case 'user_creation':
      return (
        <UserCreationStep
          onUserCreated={handleUserCreated}
          onComplete={() => setCurrentPhase('task_creation')}
          existingUsers={users}
          showAddAnother={users.length > 0}
          onAddAnother={addAnotherUser}
        />
      );
      
    case 'task_creation':
      return (
        <TaskCreationStep
          onComplete={handleTasksCreated}
          userName={users.length > 0 ? users[0].name : 'Admin'}
        />
      );
      
    case 'collaborative_rating':
      const currentUser = users[currentUserIndex];
      return (
        <CollaborativeRatingStep
          tasks={tasks}
          userName={currentUser.name}
          onComplete={handleRatingsComplete}
        />
      );
      
    default:
      return <div>Loading...</div>;
  }
};