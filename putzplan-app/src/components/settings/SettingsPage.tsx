import React, { useState, useEffect } from 'react';
import { Button, Card } from '../ui';
import { useSettings } from '../../services/settingsManager';
import { dataManager } from '../../services/dataManager';
import { usePutzplanStore } from '../../hooks/usePutzplanStore';
import { whatsappService } from '../../services/whatsappService';

interface SettingsPageProps {
  onBack: () => void;
}

export const SettingsPage: React.FC<SettingsPageProps> = ({ onBack }) => {
  const { settings, updateTaskTableSettings, updateSettings, reset } = useSettings();
  const { currentWG } = usePutzplanStore() as any;
  const [tempSettings, setTempSettings] = useState(settings);
  const [hasChanges, setHasChanges] = useState(false);
  
  // WhatsApp group selection state
  const [wgGroupName, setWgGroupName] = useState<string>('');
  const [wgGroupId, setWgGroupId] = useState<string>('');
  const [whatsappEnabled, setWhatsappEnabled] = useState<boolean>(false);
  const [loadingGroups, setLoadingGroups] = useState(false);

  // Load current WG WhatsApp settings
  useEffect(() => {
    // Load current WG WhatsApp settings
    if (currentWG?.settings?.whatsapp) {
      setWgGroupName(currentWG.settings.whatsapp.groupName || '');
      setWgGroupId(currentWG.settings.whatsapp.groupId || '');
      setWhatsappEnabled(!!currentWG.settings.whatsapp.enabled);
    }
  }, [currentWG]);

  const handleColumnSpacingChange = (spacing: number) => {
    setTempSettings(prev => ({
      ...prev,
      taskTable: {
        ...prev.taskTable,
        columnSpacing: spacing,
      },
    }));
    setHasChanges(true);
  };

  const handleSave = () => {
    // Normalize numeric fields (allow temporary empty strings in inputs but persist numbers)
    const normalizeSettings = (s: any) => {
      const copy = JSON.parse(JSON.stringify(s));
      // taskTable
      copy.taskTable = copy.taskTable || {};
      copy.taskTable.columnSpacing = parseInt(copy.taskTable.columnSpacing || '3') || 3;
      // dashboard
      copy.dashboard = copy.dashboard || {};
      copy.dashboard.buttonWidth = parseInt(copy.dashboard.buttonWidth || '3') || 3;
      copy.dashboard.sizing = copy.dashboard.sizing || {};
      const sizing = copy.dashboard.sizing;
      sizing.heightMobile = parseInt(sizing.heightMobile || '56') || 56;
      sizing.heightMd = parseInt(sizing.heightMd || '64') || 64;
      sizing.textMobile = parseInt(sizing.textMobile || '18') || 18;
      sizing.textMd = parseInt(sizing.textMd || '20') || 20;
      sizing.paddingX = parseInt(sizing.paddingX || '24') || 24;
      sizing.iconSize = parseInt(sizing.iconSize || '32') || 32;
      sizing.gap = parseInt(sizing.gap || '16') || 16;
      // hotTaskBonus
      copy.hotTaskBonus = copy.hotTaskBonus || { enabled: false, percent: 50 };
      copy.hotTaskBonus.percent = parseInt(copy.hotTaskBonus.percent || '50') || 50;
      copy.hotTaskBonus.enabled = !!copy.hotTaskBonus.enabled;
      return copy;
    };

    const normalized = normalizeSettings(tempSettings as any);
    updateTaskTableSettings(normalized.taskTable);
    // Persist dashboard settings if available
    // useSettings provides updateSettings via context/hook; call updateTaskTableSettings for task table and update full settings via updateSettings
    // We don't have updateSettings directly here; use a merged call through updateTaskTableSettings for task table and rely on settingsManager for dashboard
    // For now call updateTaskTableSettings and then directly call settingsManager if available
      // Persist dashboard settings via hook-provided updateSettings
      try {
        // Persist dashboard and hotTaskBonus to global settings
    updateSettings({ dashboard: normalized.dashboard as any, hotTaskBonus: normalized.hotTaskBonus });
      } catch (e) {
        console.warn('Could not persist dashboard/hotTaskBonus settings via updateSettings:', e);
      }

      try {
        // Persist both hotTaskBonus and WhatsApp settings into current WG settings
        const wg = dataManager.getState().currentWG;
        if (wg) {
          const newWgSettings = { 
            ...(wg.settings || {}),
            ...(normalized.hotTaskBonus ? { hotTaskBonus: normalized.hotTaskBonus } : {}),
            whatsapp: {
              groupName: wgGroupName,
              groupId: wgGroupId,
              enabled: whatsappEnabled && !!(wgGroupName || wgGroupId)
            }
          };
          dataManager.updateWG(wg.id, { settings: newWgSettings } as any);
          console.log('💾 WG Einstellungen gespeichert - WhatsApp:', { groupName: wgGroupName, groupId: wgGroupId, enabled: whatsappEnabled });
          console.log('💾 WG Einstellungen gespeichert - HotTaskBonus:', normalized.hotTaskBonus);
        }
      } catch (e) {
        console.warn('Could not persist settings to WG:', e);
      }
    setHasChanges(false);
    alert('✅ Einstellungen gespeichert!');
  };

  const handleCancel = () => {
    setTempSettings(settings); // Reset to original settings
    setHasChanges(false);
    onBack();
  };

  const handleReset = () => {
    if (confirm('🔄 Alle Einstellungen auf Standard zurücksetzen?')) {
      reset();
      setTempSettings(settings);
      setHasChanges(false);
      alert('🔄 Einstellungen zurückgesetzt!');
    }
  };

  const spacingOptions = [
    { value: 1, label: 'Sehr eng', preview: 'px-1' },
    { value: 2, label: 'Eng', preview: 'px-2' },
    { value: 3, label: 'Standard', preview: 'px-3' },
    { value: 4, label: 'Weit', preview: 'px-4' },
    { value: 5, label: 'Sehr weit', preview: 'px-5' },
  ];

  // Dashboard width control scale
  const widthOptions = [
    { value: 1, label: 'Sehr breit' },
    { value: 2, label: 'Breit' },
    { value: 3, label: 'Mittel' },
    { value: 4, label: 'Schmal' },
    { value: 5, label: 'Sehr schmal' },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-slate-800">⚙️ Einstellungen</h1>
          </div>
          <div className="flex gap-2">
            {hasChanges && (
              <Button onClick={handleSave} data-testid="save-settings-btn">
                ✅ Speichern
              </Button>
            )}
            <Button variant="ghost" onClick={onBack} data-testid="back-to-dashboard-btn">
              ← Zurück
            </Button>
          </div>
        </div>
      </header>
      <main className="max-w-4xl mx-auto px-4 py-8">
        {/* Task table settings */}
        <Card className="p-6">
          <div>
            <h2 className="text-xl font-semibold text-slate-700 mb-4">📊 Aufgaben-Tabelle</h2>
            <div className="mb-4">
              <label className="block text-sm font-medium text-slate-600 mb-2">Spaltenabstände</label>
              <input
                type="range"
                min={1}
                max={5}
                value={tempSettings.taskTable.columnSpacing}
                onChange={(e) => handleColumnSpacingChange(parseInt(e.target.value))}
                className="w-full h-3 bg-slate-200 rounded-lg appearance-none cursor-pointer"
                style={{
                  background: `linear-gradient(to right, #3b82f6 0%, #3b82f6 ${((tempSettings.taskTable.columnSpacing - 1) / 4) * 100}%, #e2e8f0 ${((tempSettings.taskTable.columnSpacing - 1) / 4) * 100}%, #e2e8f0 100%)`
                }}
              />
              <div className="flex justify-between text-sm text-slate-500 mt-2">
                <span>Sehr eng</span>
                <span>Standard</span>
                <span>Sehr weit</span>
              </div>
            </div>

            <div className="grid grid-cols-5 gap-3 mb-6">
              {spacingOptions.map((option) => (
                <button
                  key={option.value}
                  onClick={() => handleColumnSpacingChange(option.value)}
                  className={`p-3 text-sm rounded-lg border text-center transition ${
                    tempSettings.taskTable.columnSpacing === option.value
                      ? 'bg-blue-100 border-blue-300 text-blue-700 font-medium'
                      : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <div className="font-medium">{option.label}</div>
                  <div className="text-slate-400 text-xs mt-1">{option.preview}</div>
                </button>
              ))}
            </div>

            {/* Live Preview */}
            <div className="border rounded-lg p-6 bg-slate-50">
              <div className="text-sm font-medium text-slate-600 mb-3">🔍 Vorschau:</div>
              <div className="bg-white border rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50">
                      <th className={`py-3 text-left font-medium text-slate-700 border-b`}>
                        Task
                      </th>
                      <th className={`py-3 text-center font-medium text-slate-700 border-b`}>
                        Anna
                      </th>
                      <th className={`py-3 text-center font-medium text-slate-700 border-b`}>
                        Ben
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className={`py-3 border-b`}>
                        Küche putzen
                      </td>
                      <td className={`py-3 text-center border-b`}>
                        2
                      </td>
                      <td className={`py-3 text-center border-b`}>
                        1
                      </td>
                    </tr>
                    <tr>
                      <td className={`py-3 border-b`}>
                        Bad reinigen
                      </td>
                      <td className={`py-3 text-center border-b`}>
                        1
                      </td>
                      <td className={`py-3 text-center border-b`}>
                        3
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <div className="text-sm text-slate-500 mt-3">
                Aktuelle Einstellung: <strong className="text-slate-700">{spacingOptions.find(o => o.value === tempSettings.taskTable.columnSpacing)?.label}</strong>
              </div>
            </div>
          </div>
        </Card>

        {/* Dashboard Settings */}
        <Card className="p-6">
          <h2 className="text-xl font-semibold text-slate-700 mb-4 flex items-center gap-2">📋 Dashboard</h2>
          <div className="mb-6">
            <label className="block text-sm font-medium text-slate-600 mb-2">Button-Breite</label>
            <input
              data-testid="dashboard-width-input"
              type="number"
              min={1}
              max={5}
              value={tempSettings.dashboard.buttonWidth}
              onChange={(e) => {
                const v = e.target.value === '' ? '' : parseInt(e.target.value);
                setTempSettings(prev => ({ ...prev, dashboard: { ...prev.dashboard, buttonWidth: v as any } }));
                setHasChanges(true);
              }}
              onBlur={() => setHasChanges(true)}
              className="w-28 border rounded px-2 py-1"
              placeholder="1-5"
            />
            <div className="text-xs text-slate-500 mt-1">1 = Sehr breit, 5 = Sehr schmal</div>
          </div>

          <div className="mt-6 border-t pt-4">
            <h3 className="text-sm font-medium text-slate-700 mb-3">Button-Größe (px)</h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-slate-600">Höhe (mobile)</label>
                <input
                  type="number"
                  min={40}
                  max={96}
                  value={tempSettings.dashboard.sizing.heightMobile}
                    onChange={(e) => {
                      const v = e.target.value === '' ? '' : parseInt(e.target.value);
                      setTempSettings(prev => ({ ...prev, dashboard: { ...prev.dashboard, sizing: { ...prev.dashboard.sizing, heightMobile: v as any } } }));
                      setHasChanges(true);
                    }}
                  onBlur={() => setHasChanges(true)}
                  className="w-full border rounded px-2 py-1"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-600">Höhe (ab md)</label>
                <input
                  type="number"
                  min={48}
                  max={120}
                  value={tempSettings.dashboard.sizing.heightMd}
                    onChange={(e) => {
                      const v = e.target.value === '' ? '' : parseInt(e.target.value);
                      setTempSettings(prev => ({ ...prev, dashboard: { ...prev.dashboard, sizing: { ...prev.dashboard.sizing, heightMd: v as any } } }));
                      setHasChanges(true);
                    }}
                  onBlur={() => setHasChanges(true)}
                  className="w-full border rounded px-2 py-1"
                />
              </div>

              <div>
                <label className="block text-xs text-slate-600">Textgröße (mobile px)</label>
                <input
                  type="number"
                  min={12}
                  max={32}
                  value={tempSettings.dashboard.sizing.textMobile}
                    onChange={(e) => {
                      const v = e.target.value === '' ? '' : parseInt(e.target.value);
                      setTempSettings(prev => ({ ...prev, dashboard: { ...prev.dashboard, sizing: { ...prev.dashboard.sizing, textMobile: v as any } } }));
                      setHasChanges(true);
                    }}
                  onBlur={() => setHasChanges(true)}
                  className="w-full border rounded px-2 py-1"
                />
              </div>

              <div>
                <label className="block text-xs text-slate-600">Textgröße (ab md px)</label>
                <input
                  type="number"
                  min={12}
                  max={36}
                  value={tempSettings.dashboard.sizing.textMd}
                    onChange={(e) => {
                      const v = e.target.value === '' ? '' : parseInt(e.target.value);
                      setTempSettings(prev => ({ ...prev, dashboard: { ...prev.dashboard, sizing: { ...prev.dashboard.sizing, textMd: v as any } } }));
                      setHasChanges(true);
                    }}
                  onBlur={() => setHasChanges(true)}
                  className="w-full border rounded px-2 py-1"
                />
              </div>

              <div>
                <label className="block text-xs text-slate-600">Horizontaler Padding (px)</label>
                <input
                  type="number"
                  min={8}
                  max={40}
                  value={tempSettings.dashboard.sizing.paddingX}
                    onChange={(e) => {
                      const v = e.target.value === '' ? '' : parseInt(e.target.value);
                      setTempSettings(prev => ({ ...prev, dashboard: { ...prev.dashboard, sizing: { ...prev.dashboard.sizing, paddingX: v as any } } }));
                      setHasChanges(true);
                    }}
                  onBlur={() => setHasChanges(true)}
                  className="w-full border rounded px-2 py-1"
                />
              </div>

              <div>
                <label className="block text-xs text-slate-600">Icon Größe (px)</label>
                <input
                  type="number"
                  min={16}
                  max={48}
                  value={tempSettings.dashboard.sizing.iconSize}
                    onChange={(e) => {
                      const v = e.target.value === '' ? '' : parseInt(e.target.value);
                      setTempSettings(prev => ({ ...prev, dashboard: { ...prev.dashboard, sizing: { ...prev.dashboard.sizing, iconSize: v as any } } }));
                      setHasChanges(true);
                    }}
                  onBlur={() => setHasChanges(true)}
                  className="w-full border rounded px-2 py-1"
                />
              </div>

              <div>
                <label className="block text-xs text-slate-600">Gap (px)</label>
                <input
                  type="number"
                  min={4}
                  max={32}
                  value={tempSettings.dashboard.sizing.gap}
                    onChange={(e) => {
                      const v = e.target.value === '' ? '' : parseInt(e.target.value);
                      setTempSettings(prev => ({ ...prev, dashboard: { ...prev.dashboard, sizing: { ...prev.dashboard.sizing, gap: v as any } } }));
                      setHasChanges(true);
                    }}
                  onBlur={() => setHasChanges(true)}
                  className="w-full border rounded px-2 py-1"
                />
              </div>
            </div>
          </div>
          </Card>

        {/* WhatsApp Group Settings */}
        <Card className="p-6">
          <div>
            <h2 className="text-xl font-semibold text-slate-700 mb-6 flex items-center gap-2">📱 WG WhatsApp Einstellungen</h2>
            
            <div className="space-y-4">
              <div className="flex items-center gap-3 mb-4">
                <input
                  id="whatsapp-enabled"
                  type="checkbox"
                  checked={whatsappEnabled}
                  onChange={(e) => {
                    setWhatsappEnabled(e.target.checked);
                    setHasChanges(true);
                  }}
                  className="w-4 h-4 text-blue-600"
                  data-testid="whatsapp-enabled-checkbox"
                />
                <label htmlFor="whatsapp-enabled" className="text-sm font-medium text-slate-700">
                  Nachrichten an WG-Gruppe senden (statt einzelne Kontakte)
                </label>
              </div>

              <div className="grid grid-cols-1 gap-4">
                <div>
                  <label htmlFor="wg-group-name" className="block text-sm font-medium text-slate-700 mb-2">
                    WG Gruppenname
                  </label>
                  <input
                    id="wg-group-name"
                    type="text"
                    value={wgGroupName}
                    onChange={(e) => {
                      setWgGroupName(e.target.value);
                      setHasChanges(true);
                    }}
                    placeholder="z.B. Meine WG"
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
                    data-testid="group-name-input"
                  />
                  <div className="text-xs text-slate-500 mt-1">
                    Anzeigename für die Gruppe (optional)
                  </div>
                </div>

                <div>
                  <label htmlFor="wg-group-id" className="block text-sm font-medium text-slate-700 mb-2">
                    Gruppen-ID
                  </label>
                  <input
                    id="wg-group-id"
                    type="text"
                    value={wgGroupId}
                    onChange={(e) => {
                      setWgGroupId(e.target.value);
                      setHasChanges(true);
                    }}
                    placeholder="z.B. 120363213460007871@g.us"
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm font-mono"
                    data-testid="group-id-input"
                  />
                  <div className="text-xs text-slate-500 mt-1">
                    WhatsApp Gruppen-ID für Hot Task Benachrichtigungen
                  </div>
                </div>
              </div>

              {whatsappEnabled && (wgGroupName || wgGroupId) && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-3 mt-4">
                  <div className="text-sm text-green-700">
                    ✅ WhatsApp-Gruppe konfiguriert
                    {wgGroupName && <div>📝 Name: {wgGroupName}</div>}
                    {wgGroupId && <div className="font-mono">🆔 ID: {wgGroupId}</div>}
                  </div>
                </div>
              )}
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div>
            <h2 className="text-xl font-semibold text-slate-700 mb-6 flex items-center gap-2">🔥 Hot Task Bonus</h2>
              <div className="flex items-center gap-3 mb-3">
                <input
                  id="hot-bonus-enabled"
                  type="checkbox"
                  checked={(tempSettings as any).hotTaskBonus?.enabled || false}
                  onChange={(e) => { setTempSettings(prev => ({ ...prev, hotTaskBonus: { ...(prev as any).hotTaskBonus, enabled: e.target.checked } })); setHasChanges(true); }}
                  className="w-4 h-4"
                  data-testid="hot-bonus-enabled"
                />
                <label htmlFor="hot-bonus-enabled" className="text-sm text-slate-700">Einmaliger Bonus aktivieren (beim nächsten Abhaken eines Hot-Tasks)</label>
              </div>
              <div className="mb-2">
                <label className="text-sm text-slate-600">Bonus-Prozent</label>
                <div className="inline-block ml-3">
                  <input
                    type="number"
                    min={1}
                    max={500}
                    value={(tempSettings as any).hotTaskBonus?.percent ?? 50}
                    onChange={(e) => {
                      const v = e.target.value === '' ? '' : parseInt(e.target.value);
                      setTempSettings(prev => ({ ...prev, hotTaskBonus: { ...(prev as any).hotTaskBonus, percent: v as any } }));
                      setHasChanges(true);
                    }}
                    className="w-32 border rounded px-2 py-1 ml-3"
                    data-testid="hot-bonus-percent"
                  />
                </div>
                <div className="text-xs text-slate-500 mt-1">Prozentualer Aufschlag, gilt nur einmalig für ein Hot-Task bei nächster Ausführung.</div>
              </div>
            </div>
          </Card>

        {/* Action Buttons */}
        <div className="flex items-center justify-between mt-6">
            <Button variant="outline" onClick={handleReset} size="sm">
              🔄 Auf Standard zurücksetzen
            </Button>
            <div className="flex gap-3">
              <Button variant="ghost" onClick={handleCancel}>
                Abbrechen
              </Button>
              <Button onClick={handleSave} disabled={!hasChanges}>
                ✅ Speichern
              </Button>
            </div>
          </div>
      </main>
    </div>
  );
};