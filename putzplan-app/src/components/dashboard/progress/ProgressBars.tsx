import React from 'react';
import { Card, ProgressBar, Badge } from '../../ui';
import { usePutzplanStore } from '../../../hooks/usePutzplanStore';

/**
 * Aggregierte Fortschrittsanzeigen analog legacy progress-bars.js
 * - Task Rating Progress (Wie viele Tasks haben mind. 1 Setup-Rating?)
 * - Member Progress (Wie viele aktive User haben alle Tasks bewertet?) – Platzhalter Heuristik
 * - Aktueller Rating Durchlauf (currentRatingTaskIndex / tasks.length) – Platzhalter
 */
export const ProgressBars: React.FC = () => {
  const { tasks, ratings, currentUser } = usePutzplanStore() as any;
  const taskList = Object.values(tasks || {});
  const ratingList = Object.values(ratings || {});

  // Task Rating Progress: Anzahl Tasks, die mindestens eine Bewertung haben
  const tasksWithRatings = new Set(ratingList.map((r: any) => r.taskId));
  const taskRatingPct = taskList.length > 0 ? (tasksWithRatings.size / taskList.length) * 100 : 0;

  // Member Progress (Heuristik): Anteil Users, die alle bestehenden Tasks mindestens einmal bewertet haben
  // Da Users hier nicht direkt benötigt werden & Setup-Phase noch nicht komplett modelliert ist:
  // Placeholder: Verhältnis (Tasks mit Ratings / GesamtTasks) als Proxy
  const memberProgressPct = taskRatingPct; // Simplified proxy

  // Current Rating Progress: Without collaborative session state -> use same proxy
  const currentRatingPct = taskRatingPct; // Placeholder until collaborative rating implemented

  return (
    <Card className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-800">Bewertungs-Fortschritt</h3>
        <Badge size="sm" variant={taskRatingPct>=100?'success':taskRatingPct>=50?'warning':'default'}>
          {Math.round(taskRatingPct)}%
        </Badge>
      </div>
      <ProgressBar value={tasksWithRatings.size} max={taskList.length || 1} label="Tasks bewertet" />

      <div className="flex items-center justify-between pt-2">
        <h3 className="text-sm font-semibold text-gray-800">Mitglieder (Proxy)</h3>
        <span className="text-xs text-gray-500">Platzhalter</span>
      </div>
      <ProgressBar value={memberProgressPct} max={100} label="Mitglieder abgeschlossen" />

      <div className="flex items-center justify-between pt-2">
        <h3 className="text-sm font-semibold text-gray-800">Aktueller Durchlauf</h3>
        <span className="text-xs text-gray-500">Platzhalter</span>
      </div>
      <ProgressBar value={currentRatingPct} max={100} label="Rating Fortschritt" />

      {currentUser && (
        <div className="text-xs text-gray-500 pt-2">
          Basiswerte werden später durch echten kollaborativen Rating-Status ersetzt.
        </div>
      )}
    </Card>
  );
};
