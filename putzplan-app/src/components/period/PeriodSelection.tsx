import React, { useState } from 'react';
import { Button, Card } from '../ui';

interface PeriodOption {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  isActive: boolean;
  isHistorical: boolean;
}

interface PeriodSelectionProps {
  periods: PeriodOption[];
  currentPeriodId: string | null;
  onPeriodSelect: (periodId: string | null) => void;
  onViewHistoricalPeriod: (periodId: string) => void;
  onDeletePeriod?: (periodId: string) => void;
}

export const PeriodSelection: React.FC<PeriodSelectionProps> = ({ 
  periods, 
  currentPeriodId, 
  onPeriodSelect,
  onViewHistoricalPeriod,
  onDeletePeriod
}) => {
  const [selectedPeriodId, setSelectedPeriodId] = useState<string | null>(currentPeriodId);
  // Aktive Zeiträume immer ausgeklappt, keine Accordion-Logik mehr nötig

  const activePeriods = periods.filter(p => p.isActive);
  // Historische Zeiträume: Nur solche, deren Enddatum < heute
  const today = new Date();
  const historicalPeriods = periods.filter(p => {
    const end = new Date(p.endDate);
    return p.isHistorical && end < today;
  });

  const handlePeriodSelect = (periodId: string | null) => {
    setSelectedPeriodId(periodId);
    onPeriodSelect(periodId);
  };

  // Zeitraum-Benennung: TT.MM – TT.MM (ohne Jahreszahl)
  const formatDateRange = (startDate: string, endDate: string) => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const startStr = `${String(start.getDate()).padStart(2, '0')}.${String(start.getMonth()+1).padStart(2, '0')}`;
    const endStr = `${String(end.getDate()).padStart(2, '0')}.${String(end.getMonth()+1).padStart(2, '0')}`;
    return `${startStr} – ${endStr}`;
  };

  const getDaysInfo = (startDate: string, endDate: string) => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return `${diffDays} Tage`;
  };

  return (
    <Card className="p-6 bg-white shadow-lg border rounded-xl">
      <div className="mb-6">
        <h2 className="text-xl font-bold text-gray-900 flex items-center gap-3">
          <div className="p-2 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg">
            <span className="text-white">📊</span>
          </div>
          Zeitraum auswählen
        </h2>
        <p className="text-gray-600 mt-2">Wähle einen bestehenden Zeitraum aus oder wechsle zwischen Zeiträumen</p>
      </div>

      {periods.length === 0 ? (
        <div className="text-center py-8">
          <div className="text-gray-400 text-4xl mb-4">📅</div>
          <p className="text-gray-600">Noch keine Zeiträume vorhanden</p>
          <p className="text-sm text-gray-500 mt-2">Erstelle deinen ersten Zeitraum im Bereich "Neuen Zeitraum erstellen"</p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Active Periods Section - immer ausgeklappt */}
          {activePeriods.length > 0 && (
            <div>
              <div className="w-full flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-center gap-2">
                  <span className="text-green-600">🟢</span>
                  <span className="font-semibold text-green-800">Aktive Zeiträume</span>
                  <span className="bg-green-200 text-green-800 text-xs px-2 py-1 rounded-full">
                    {activePeriods.length}
                  </span>
                </div>
                <span className="text-green-600">▼</span>
              </div>
              <div className="mt-2 space-y-2">
                {activePeriods.map(period => (
                  <div 
                    key={period.id}
                    className={`p-4 border rounded-lg cursor-pointer transition-all ${
                      selectedPeriodId === period.id 
                        ? 'border-green-500 bg-green-50 shadow-sm' 
                        : 'border-gray-200 hover:border-green-300 hover:bg-green-25'
                    }`}
                    onClick={() => handlePeriodSelect(period.id)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <input
                          type="radio"
                          checked={selectedPeriodId === period.id}
                          onChange={() => handlePeriodSelect(period.id)}
                          className="w-4 h-4 mr-2 text-green-600 border-gray-300 focus:ring-green-500"
                        />
                        <div>
                          <div className="font-semibold text-gray-900 flex items-center gap-2">
                            <span className="text-green-500">🟢</span>
                            {period.name}
                          </div>
                          <div className="text-xs text-gray-500 mt-1">
                            {getDaysInfo(period.startDate, period.endDate)}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Historical Periods Section - nur vergangene, immer ausgeklappt */}
          {historicalPeriods.length > 0 && (
            <div>
              <div className="w-full flex items-center justify-between p-3 bg-gray-50 border border-gray-200 rounded-lg">
                <div className="flex items-center gap-2">
                  <span className="text-gray-600">📁</span>
                  <span className="font-semibold text-gray-800">Historische Zeiträume</span>
                  <span className="bg-gray-200 text-gray-800 text-xs px-2 py-1 rounded-full">
                    {historicalPeriods.length}
                  </span>
                </div>
                <span className="text-gray-600">▼</span>
              </div>
              <div className="mt-2 space-y-2">
                {historicalPeriods.map(period => (
                  <div 
                    key={period.id}
                    className="p-4 border border-gray-200 rounded-lg"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="font-semibold text-gray-900 flex items-center gap-2">
                          <span className="text-gray-500">📁</span>
                          {period.name}
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          {getDaysInfo(period.startDate, period.endDate)}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          onClick={() => onViewHistoricalPeriod(period.id)}
                          size="sm"
                          variant="outline"
                          className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 border-gray-300"
                        >
                          📊 Anzeigen
                        </Button>
                        {onDeletePeriod && (
                          <Button
                            onClick={(e) => {
                              e.stopPropagation();
                              if (confirm(`Zeitraum "${period.name}" wirklich löschen?`)) {
                                onDeletePeriod(period.id);
                              }
                            }}
                            size="sm"
                            variant="outline"
                            className="text-xs bg-red-50 hover:bg-red-100 text-red-700 border-red-300"
                            title="Zeitraum löschen"
                            data-testid={`delete-period-${period.id}`}
                          >
                            🗑️
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
                <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-start gap-2">
                    <span className="text-blue-600 mt-0.5">ℹ️</span>
                    <div className="text-sm">
                      <p className="text-blue-800 font-semibold">Historische Zeiträume</p>
                      <p className="text-blue-700 text-xs mt-1">
                        Zeige vergangene Zeiträume in der Task-Tabelle an, ohne sie zu aktivieren.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Quick Reset Option */}
          <div className="pt-4 border-t border-gray-200">
            <Button
              onClick={() => handlePeriodSelect(null)}
              variant="outline"
              className="w-full text-gray-700 border-gray-300 hover:bg-gray-50"
            >
              ✨ Zu neuem Zeitraum wechseln
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
};

export default PeriodSelection;