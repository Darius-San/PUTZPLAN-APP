import React, { useState } from 'react';
import { Card, Button, Badge } from '../../ui';
import { TaskRatingForm, CreateTaskForm } from '../../../types';
import { Clock, Zap, Star, Calendar } from 'lucide-react';

interface CollaborativeRatingStepProps {
  tasks: CreateTaskForm[];
  userName: string;
  onComplete: (ratings: TaskRatingForm[]) => void;
}

export const CollaborativeRatingStep: React.FC<CollaborativeRatingStepProps> = ({ 
  tasks, 
  userName, 
  onComplete 
}) => {
  const [currentTaskIndex, setCurrentTaskIndex] = useState(0);
  const [ratings, setRatings] = useState<Record<string, TaskRatingForm>>({});

  const currentTask = tasks[currentTaskIndex];
  const currentRating = ratings[currentTask.title] || {
    taskId: currentTask.title,
    estimatedMinutes: 30,
    painLevel: 5,
    importance: 5,
    suggestedFrequency: 4
  };

  const updateRating = (field: keyof Omit<TaskRatingForm, 'taskId'>, value: number) => {
    setRatings(prev => ({
      ...prev,
      [currentTask.title]: {
        ...currentRating,
        [field]: value
      }
    }));
  };

  const nextTask = () => {
    // Speichere aktuelle Bewertung
    setRatings(prev => ({
      ...prev,
      [currentTask.title]: currentRating
    }));

    if (currentTaskIndex < tasks.length - 1) {
      setCurrentTaskIndex(prev => prev + 1);
    } else {
      // Alle Tasks bewertet - weiter
      const allRatings = Object.values({
        ...ratings,
        [currentTask.title]: currentRating
      });
      onComplete(allRatings);
    }
  };

  const prevTask = () => {
    if (currentTaskIndex > 0) {
      setCurrentTaskIndex(prev => prev - 1);
    }
  };

  const calculatePoints = () => {
    return Math.round(
      (currentRating.estimatedMinutes + 
       currentRating.estimatedMinutes * currentRating.painLevel * 0.1) * 
      (currentRating.importance / 10)
    );
  };

  const calculateMonthlyPoints = () => {
    return calculatePoints() * currentRating.suggestedFrequency;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-2xl mx-auto">
        <Card className="mb-6">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              🎯 Task bewerten
            </h1>
            <p className="text-gray-600">
              Hi {userName}! Bewerte jeden Task nach deiner Einschätzung
            </p>
            <div className="flex justify-center items-center space-x-2 mt-3">
              <Badge variant="default">
                Task {currentTaskIndex + 1} von {tasks.length}
              </Badge>
            </div>
          </div>
        </Card>

        {/* Progress Bar */}
        <div className="mb-6">
          <div className="bg-gray-200 rounded-full h-2">
            <div 
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${((currentTaskIndex + 1) / tasks.length) * 100}%` }}
            />
          </div>
        </div>

        <Card className="mb-6">
          {/* Current Task Info */}
          <div className="text-center mb-6">
            <div className="text-4xl mb-2">{currentTask.emoji}</div>
            <h2 className="text-xl font-bold text-gray-900">{currentTask.title}</h2>
            <p className="text-gray-600 mt-1">{currentTask.description}</p>
          </div>

          {/* Rating Controls */}
          <div className="space-y-6">
            {/* Minuten */}
            <div>
              <label className="flex items-center text-sm font-medium text-gray-700 mb-3">
                <Clock className="w-4 h-4 mr-2" />
                Wie lange brauchst DU für diesen Task? ({currentRating.estimatedMinutes} Min.)
              </label>
              <input
                type="range"
                min="5"
                max="120"
                step="5"
                value={currentRating.estimatedMinutes}
                onChange={(e) => updateRating('estimatedMinutes', parseInt(e.target.value))}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
              />
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>5 Min</span>
                <span>2h</span>
              </div>
            </div>

            {/* Pain Level */}
            <div>
              <label className="flex items-center text-sm font-medium text-gray-700 mb-3">
                <Zap className="w-4 h-4 mr-2" />
                Wie nervig ist dieser Task? ({currentRating.painLevel}/10)
              </label>
              <input
                type="range"
                min="1"
                max="10"
                value={currentRating.painLevel}
                onChange={(e) => updateRating('painLevel', parseInt(e.target.value))}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
              />
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>😊 Entspannt</span>
                <span>😤 Sehr nervig</span>
              </div>
            </div>

            {/* Wichtigkeit */}
            <div>
              <label className="flex items-center text-sm font-medium text-gray-700 mb-3">
                <Star className="w-4 h-4 mr-2" />
                Wie wichtig ist dieser Task? ({currentRating.importance}/10)
              </label>
              <input
                type="range"
                min="1"
                max="10"
                value={currentRating.importance}
                onChange={(e) => updateRating('importance', parseInt(e.target.value))}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
              />
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>Kann warten</span>
                <span>Sehr wichtig</span>
              </div>
            </div>

            {/* Häufigkeit */}
            <div>
              <label className="flex items-center text-sm font-medium text-gray-700 mb-3">
                <Calendar className="w-4 h-4 mr-2" />
                Wie oft pro Monat? ({currentRating.suggestedFrequency}x)
              </label>
              <input
                type="range"
                min="1"
                max="30"
                value={currentRating.suggestedFrequency}
                onChange={(e) => updateRating('suggestedFrequency', parseInt(e.target.value))}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
              />
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>1x</span>
                <span>Täglich</span>
              </div>
            </div>
          </div>

          {/* Preview */}
          <div className="mt-6 p-4 bg-blue-50 rounded-lg">
            <h3 className="font-medium text-blue-900 mb-2">Deine Bewertung:</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-blue-700">Punkte pro Task:</span>
                <span className="font-bold text-blue-900 ml-2">{calculatePoints()}</span>
              </div>
              <div>
                <span className="text-blue-700">Punkte pro Monat:</span>
                <span className="font-bold text-blue-900 ml-2">{calculateMonthlyPoints()}</span>
              </div>
            </div>
          </div>
        </Card>

        {/* Navigation */}
        <div className="flex justify-between">
          <Button
            onClick={prevTask}
            variant="ghost"
            disabled={currentTaskIndex === 0}
          >
            Zurück
          </Button>

          <Button onClick={nextTask}>
            {currentTaskIndex === tasks.length - 1 ? 'Bewertung abschließen' : 'Nächster Task'}
          </Button>
        </div>

        {/* Info */}
        <Card className="mt-6 bg-green-50 border-green-200">
          <div className="text-center">
            <h3 className="font-medium text-green-900 mb-2">ℹ️ Info</h3>
            <p className="text-sm text-green-700">
              Später werden alle Bewertungen der WG-Mitglieder gemittelt.
              <br />
              Formel: (Minuten + Minuten × Pain × 0.1) × (Wichtigkeit ÷ 10)
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
};