import React, { useState } from 'react';
import { Card, Input, TextArea, Button, Select } from '../../ui';
import { TASK_EMOJI_OPTIONS, TaskCategory, CreateTaskForm } from '../../../types';
import { Plus, Trash2 } from 'lucide-react';

interface TaskCreationStepProps {
  onComplete: (tasks: CreateTaskForm[]) => void;
  userName: string;
}

export const TaskCreationStep: React.FC<TaskCreationStepProps> = ({ onComplete, userName }) => {
  const [tasks, setTasks] = useState<CreateTaskForm[]>([
    {
      title: '',
      description: '',
      emoji: TASK_EMOJI_OPTIONS[0].emoji,
      category: TaskCategory.GENERAL,
      minDaysBetween: 0
    }
  ]);

  const addTask = () => {
    setTasks(prev => [...prev, {
      title: '',
      description: '',
      emoji: TASK_EMOJI_OPTIONS[0].emoji,
      category: TaskCategory.GENERAL,
      minDaysBetween: 0
    }]);
  };

  const removeTask = (index: number) => {
    if (tasks.length > 1) {
      setTasks(prev => prev.filter((_, i) => i !== index));
    }
  };

  const updateTask = (index: number, field: keyof CreateTaskForm, value: string | number) => {
    setTasks(prev => prev.map((task, i) => 
      i === index ? { ...task, [field]: value } : task
    ));
  };

  const handleSubmit = () => {
    const validTasks = tasks.filter(task => task.title.trim() && task.description.trim());
    if (validTasks.length > 0) {
      onComplete(validTasks);
    }
  };

  const categoryOptions = [
    { value: TaskCategory.KITCHEN, label: '🍽️ Küche' },
    { value: TaskCategory.BATHROOM, label: '🚿 Bad' },
    { value: TaskCategory.LIVING_ROOM, label: '🛋️ Wohnzimmer' },
    { value: TaskCategory.BEDROOM, label: '🛏️ Schlafzimmer' },
    { value: TaskCategory.GENERAL, label: '🏠 Allgemein' },
    { value: TaskCategory.OUTDOOR, label: '🌳 Draußen' },
    { value: TaskCategory.MAINTENANCE, label: '🔧 Wartung' }
  ];

  const validTasksCount = tasks.filter(task => task.title.trim() && task.description.trim()).length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-2xl mx-auto">
        <Card className="mb-6">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              📝 Tasks erstellen
            </h1>
            <p className="text-gray-600">
              Hi {userName}! Welche Aufgaben sollen in eurem Putzplan stehen?
            </p>
            <p className="text-sm text-gray-500 mt-2">
              Keine Sorge - die Details (Punkte, Häufigkeit etc.) legt ihr gleich gemeinsam fest!
            </p>
          </div>
        </Card>

        <div className="space-y-4">
          {tasks.map((task, index) => (
            <Card key={index} className="relative">
              {tasks.length > 1 && (
                <button
                  onClick={() => removeTask(index)}
                  className="absolute top-4 right-4 p-1 text-gray-400 hover:text-red-500 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}

              <div className="space-y-4">
                <div className="flex items-center space-x-4">
                  <div className="flex-shrink-0">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Icon
                    </label>
                    <select
                      value={task.emoji}
                      onChange={(e) => updateTask(index, 'emoji', e.target.value)}
                      className="w-16 h-12 text-2xl text-center border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      {TASK_EMOJI_OPTIONS.map((option) => (
                        <option key={option.id} value={option.emoji}>
                          {option.emoji}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="flex-1">
                    <Input
                      label="Task Name"
                      value={task.title}
                      onChange={(e) => updateTask(index, 'title', e.target.value)}
                      placeholder="z.B. Küche putzen"
                    />
                  </div>

                  <div className="w-40">
                    <Select
                      label="Bereich"
                      value={task.category}
                      onChange={(e) => updateTask(index, 'category', e.target.value as TaskCategory)}
                      options={categoryOptions}
                    />
                  </div>
                </div>

                <TextArea
                  label="Beschreibung"
                  value={task.description}
                  onChange={(e) => updateTask(index, 'description', e.target.value)}
                  placeholder="Was genau muss gemacht werden?"
                  rows={2}
                />

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    ⏳ Mindestabstand zwischen Ausführungen
                  </label>
                  <select
                    value={task.minDaysBetween || 0}
                    onChange={(e) => updateTask(index, 'minDaysBetween', parseInt(e.target.value))}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value={0}>Kann täglich gemacht werden</option>
                    <option value={1}>Mindestens 1 Tag Pause</option>
                    <option value={2}>Mindestens 2 Tage Pause</option>
                    <option value={3}>Mindestens 3 Tage Pause</option>
                    <option value={7}>Mindestens 1 Woche Pause</option>
                    <option value={14}>Mindestens 2 Wochen Pause</option>
                    <option value={30}>Nur 1x pro Monat</option>
                  </select>
                  <p className="text-xs text-gray-500 mt-1">
                    Verhindert, dass der Task zu oft hintereinander gemacht wird
                  </p>
                </div>
              </div>
            </Card>
          ))}
        </div>

        <div className="flex justify-between items-center mt-6">
          <Button
            onClick={addTask}
            variant="ghost"
            className="flex items-center space-x-2"
          >
            <Plus className="w-4 h-4" />
            <span>Weiteren Task hinzufügen</span>
          </Button>

          <div className="text-right">
            <p className="text-sm text-gray-500 mb-2">
              {validTasksCount} Task{validTasksCount !== 1 ? 's' : ''} bereit
            </p>
            <Button
              onClick={handleSubmit}
              disabled={validTasksCount === 0}
            >
              Weiter zur Bewertung
            </Button>
          </div>
        </div>

        <Card className="mt-6 bg-blue-50 border-blue-200">
          <div className="text-center">
            <h3 className="font-medium text-blue-900 mb-2">💡 Tipp</h3>
            <p className="text-sm text-blue-700">
              Denkt an alle regelmäßigen Aufgaben: Küche, Bad, Staubsaugen, Müll, Wäsche, etc.
              <br />
              Ihr könnt später immer noch Tasks hinzufügen oder ändern!
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
};