import React, { useState, useEffect } from 'react';
import { Button, Card } from '../ui';
import { useSettings } from '../../services/settingsManager';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
  const { settings, updateTaskTableSettings, reset } = useSettings();
  const [tempSettings, setTempSettings] = useState(settings);

  // Sync temp settings when modal opens or settings change
  useEffect(() => {
    setTempSettings(settings);
  }, [settings, isOpen]);

  if (!isOpen) {
    return null;
  }

  const handleColumnSpacingChange = (spacing: number) => {
    setTempSettings(prev => ({
      ...prev,
      taskTable: {
        ...prev.taskTable,
        columnSpacing: spacing,
      },
    }));
  };

  const handleSave = () => {
    updateTaskTableSettings(tempSettings.taskTable);
    onClose();
  };

  const handleCancel = () => {
    setTempSettings(settings); // Reset to original settings
    onClose();
  };

  const handleReset = () => {
    if (confirm('🔄 Alle Einstellungen auf Standard zurücksetzen?')) {
      reset();
      onClose();
    }
  };

  const spacingOptions = [
    { value: 1, label: 'Sehr eng', preview: 'px-1' },
    { value: 2, label: 'Eng', preview: 'px-2' },
    { value: 3, label: 'Standard', preview: 'px-3' },
    { value: 4, label: 'Weit', preview: 'px-4' },
    { value: 5, label: 'Sehr weit', preview: 'px-5' },
  ];

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <Card className="w-full max-w-2xl mx-4 max-h-[90vh] overflow-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-slate-800">⚙️ Einstellungen</h2>
            <Button variant="ghost" size="sm" onClick={onClose}>✕</Button>
          </div>

          <div className="space-y-8">
            {/* Task Table Settings */}
            <div>
              <h3 className="text-lg font-medium text-slate-700 mb-4 border-b pb-2">📊 Aufgaben-Tabelle</h3>
              
              {/* Column Spacing Setting */}
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-3">
                  Spaltenabstände
                </label>
                
                {/* Range Slider */}
                <div className="mb-4">
                  <input
                    type="range"
                    min={1}
                    max={5}
                    value={tempSettings.taskTable.columnSpacing}
                    onChange={(e) => handleColumnSpacingChange(parseInt(e.target.value))}
                    className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer"
                    style={{
                      background: `linear-gradient(to right, #3b82f6 0%, #3b82f6 ${((tempSettings.taskTable.columnSpacing - 1) / 4) * 100}%, #e2e8f0 ${((tempSettings.taskTable.columnSpacing - 1) / 4) * 100}%, #e2e8f0 100%)`
                    }}
                  />
                  <div className="flex justify-between text-xs text-slate-500 mt-1">
                    <span>Sehr eng</span>
                    <span>Standard</span>
                    <span>Sehr weit</span>
                  </div>
                </div>

                {/* Option Buttons */}
                <div className="grid grid-cols-5 gap-2 mb-4">
                  {spacingOptions.map((option) => (
                    <button
                      key={option.value}
                      onClick={() => handleColumnSpacingChange(option.value)}
                      className={`p-2 text-xs rounded border text-center transition ${
                        tempSettings.taskTable.columnSpacing === option.value
                          ? 'bg-blue-100 border-blue-300 text-blue-700'
                          : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      <div className="font-medium">{option.label}</div>
                      <div className="text-slate-400 text-[10px] mt-1">{option.preview}</div>
                    </button>
                  ))}
                </div>

                {/* Live Preview */}
                <div className="border rounded-lg p-4 bg-slate-50">
                  <div className="text-sm text-slate-600 mb-2">🔍 Vorschau:</div>
                  <div className="bg-white border rounded overflow-hidden">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-slate-50">
                          <th className={`${spacingOptions.find(o => o.value === tempSettings.taskTable.columnSpacing)?.preview} py-2 text-left font-medium text-slate-700 border-b`}>
                            Task
                          </th>
                          <th className={`${spacingOptions.find(o => o.value === tempSettings.taskTable.columnSpacing)?.preview} py-2 text-center font-medium text-slate-700 border-b`}>
                            Anna
                          </th>
                          <th className={`${spacingOptions.find(o => o.value === tempSettings.taskTable.columnSpacing)?.preview} py-2 text-center font-medium text-slate-700 border-b`}>
                            Ben
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td className={`${spacingOptions.find(o => o.value === tempSettings.taskTable.columnSpacing)?.preview} py-2 border-b`}>
                            Küche putzen
                          </td>
                          <td className={`${spacingOptions.find(o => o.value === tempSettings.taskTable.columnSpacing)?.preview} py-2 text-center border-b`}>
                            2
                          </td>
                          <td className={`${spacingOptions.find(o => o.value === tempSettings.taskTable.columnSpacing)?.preview} py-2 text-center border-b`}>
                            1
                          </td>
                        </tr>
                        <tr>
                          <td className={`${spacingOptions.find(o => o.value === tempSettings.taskTable.columnSpacing)?.preview} py-2 border-b`}>
                            Bad reinigen
                          </td>
                          <td className={`${spacingOptions.find(o => o.value === tempSettings.taskTable.columnSpacing)?.preview} py-2 text-center border-b`}>
                            1
                          </td>
                          <td className={`${spacingOptions.find(o => o.value === tempSettings.taskTable.columnSpacing)?.preview} py-2 text-center border-b`}>
                            3
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                  <div className="text-xs text-slate-500 mt-2">
                    Aktuelle Einstellung: <strong>{spacingOptions.find(o => o.value === tempSettings.taskTable.columnSpacing)?.label}</strong> ({spacingOptions.find(o => o.value === tempSettings.taskTable.columnSpacing)?.preview})
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between pt-6 border-t">
            <Button variant="outline" onClick={handleReset} size="sm">
              🔄 Zurücksetzen
            </Button>
            <div className="flex gap-3">
              <Button variant="ghost" onClick={handleCancel}>
                Abbrechen
              </Button>
              <Button onClick={handleSave}>
                ✅ Speichern
              </Button>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
};