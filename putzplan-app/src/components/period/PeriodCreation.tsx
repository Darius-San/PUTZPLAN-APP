import React, { useState } from 'react';
import { Button, Card, Input } from '../ui';

interface PeriodCreationProps {
  onCreatePeriod: (startDate: string, endDate: string, resetData: boolean) => void;
  getOverlappingPeriods: (startDate: string, endDate: string) => Array<{
    id: string;
    name: string;
    startDate: string;
    endDate: string;
    isActive: boolean;
  }>;
}

export const PeriodCreation: React.FC<PeriodCreationProps> = ({ 
  onCreatePeriod, 
  getOverlappingPeriods
}) => {
  const today = new Date();
  const [startDate, setStartDate] = useState(today.toISOString().substring(0, 10));
  const [endDate, setEndDate] = useState(
    new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString().substring(0, 10)
  );
  const [resetData, setResetData] = useState(false);

  const handleSubmit = () => {
    onCreatePeriod(startDate, endDate, resetData);
  };

  const isValidDateRange = new Date(startDate) < new Date(endDate);
  const overlappingPeriods = getOverlappingPeriods(startDate, endDate);
  const isOverlapping = overlappingPeriods.length > 0;

  return (
    <Card className="p-6 bg-white shadow-lg border rounded-xl">
      <div className="mb-6">
        <h2 className="text-xl font-bold text-gray-900 flex items-center gap-3">
          <div className="p-2 bg-gradient-to-br from-green-500 to-emerald-600 rounded-lg">
            <span className="text-white">✨</span>
          </div>
          Neuen Zeitraum erstellen
        </h2>
        <p className="text-gray-600 mt-2">Definiere einen neuen Zeitraum für deinen Putzplan</p>
      </div>

      <div className="space-y-6">
        {/* Date Selection */}
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <label htmlFor="start-date" className="block text-sm font-semibold text-gray-700">
              📅 Startdatum
            </label>
            <Input 
              id="start-date"
              type="date" 
              value={startDate} 
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full border border-gray-300 rounded-lg focus:border-green-500 focus:ring-1 focus:ring-green-500"
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="end-date" className="block text-sm font-semibold text-gray-700">
              🏁 Enddatum
            </label>
            <Input 
              id="end-date"
              type="date" 
              value={endDate} 
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full border border-gray-300 rounded-lg focus:border-green-500 focus:ring-1 focus:ring-green-500"
            />
          </div>
        </div>

        {/* Date Range Validation */}
        {!isValidDateRange && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center gap-2">
              <span className="text-red-600">⚠️</span>
              <span className="text-sm font-semibold text-red-800">Ungültiger Zeitraum</span>
            </div>
            <p className="text-sm text-red-700 mt-1">
              Das Enddatum muss nach dem Startdatum liegen.
            </p>
          </div>
        )}

        {/* Overlap Warning */}
        {isOverlapping && overlappingPeriods.length > 0 && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-yellow-600">⚠️</span>
              <span className="text-sm font-semibold text-yellow-800">Überlappende Zeiträume</span>
            </div>
            <p className="text-sm text-yellow-700 mb-3">
              Der gewählte Zeitraum überschneidet sich mit bestehenden Zeiträumen:
            </p>
            <div className="space-y-2">
              {overlappingPeriods.map(period => (
                <div key={period.id} className="bg-yellow-100 rounded px-3 py-2">
                  <span className="text-sm text-yellow-800">
                    {period.isActive ? '🟢' : '📁'} {period.name}
                  </span>
                  <span className="text-xs text-yellow-600 ml-2">
                    ({new Date(period.startDate).toLocaleDateString('de-DE')} - 
                     {new Date(period.endDate).toLocaleDateString('de-DE')})
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Reset Data Option */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={resetData}
              onChange={(e) => setResetData(e.target.checked)}
              className="mt-1 w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <div>
              <span className="text-sm font-semibold text-blue-800">
                📊 Daten für neuen Zeitraum zurücksetzen
              </span>
              <p className="text-xs text-blue-600 mt-1">
                Aktiviere diese Option, um alle vorhandenen Daten zu löschen und mit einem sauberen Zeitraum zu beginnen.
              </p>
            </div>
          </label>
        </div>

        {/* Submit Button */}
        <div className="flex justify-end pt-4 border-t border-gray-200">
          <Button
            onClick={handleSubmit}
            disabled={!isValidDateRange}
            className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white px-6 py-2 rounded-lg font-semibold transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {resetData ? '🔄 Zeitraum erstellen & Daten zurücksetzen' : '✨ Zeitraum erstellen'}
          </Button>
        </div>
      </div>
    </Card>
  );
};

export default PeriodCreation;