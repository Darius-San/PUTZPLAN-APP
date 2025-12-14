import React, { useState, useEffect } from 'react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { eventSourcingManager, type StateSnapshot, type ActionEvent, type RestorePreview } from '../../services/eventSourcingManager';
import { usePutzplanStore } from '../../hooks/usePutzplanStore';
import ConfirmDialog from '../ui/ConfirmDialog';

interface StateRestorePageProps {
  onBack: () => void;
}

export const StateRestorePage: React.FC<StateRestorePageProps> = ({ onBack }) => {
  const [snapshots, setSnapshots] = useState<StateSnapshot[]>([]);
  const [events, setEvents] = useState<ActionEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'timeline' | 'events' | 'critical'>('timeline');
  const [selectedSnapshot, setSelectedSnapshot] = useState<StateSnapshot | null>(null);
  const [showDetail, setShowDetail] = useState(false);
  const [restorePreview, setRestorePreview] = useState<RestorePreview | null>(null);
  const [showConfirmRestore, setShowConfirmRestore] = useState(false);
  const [pendingRestore, setPendingRestore] = useState<StateSnapshot | null>(null);
  const [confirmText, setConfirmText] = useState('');
  const [confirmState, setConfirmState] = useState<{ isOpen: boolean; title?: string; description?: string; onConfirm?: () => void }>({ isOpen: false });
  
  const { debugMode } = usePutzplanStore();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    console.log('[StateRestorePage] Loading data...');
    setLoading(true);
    try {
      const [snapshotData, eventData] = await Promise.all([
        eventSourcingManager.getSnapshots(),
        eventSourcingManager.getEvents()
      ]);
      
      console.log('[StateRestorePage] Loaded snapshots:', snapshotData.length);
      console.log('[StateRestorePage] Loaded events:', eventData.length);
      
      setSnapshots(snapshotData);
      setEvents(eventData);
    } catch (error) {
      console.error('[StateRestorePage] Failed to load data:', error);
      alert('❌ Fehler beim Laden der Daten: ' + error);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateTestData = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/test-data', { method: 'POST' });
      if (response.ok) {
        alert('✅ Test-Daten generiert! Lade neu...');
        await loadData();
      } else {
        alert('❌ Fehler beim Generieren der Test-Daten');
      }
    } catch (error) {
      console.error('Error generating test data:', error);
      alert('❌ Fehler beim Generieren der Test-Daten: ' + error);
    } finally {
      setLoading(false);
    }
  };

  const handleClearTestData = async () => {
    setConfirmState({
      isOpen: true,
      title: 'Wirklich alle Daten löschen?',
      description: 'Dies kann nicht rückgängig gemacht werden!',
      onConfirm: async () => {
        try {
          setLoading(true);
          const response = await fetch('/api/clear-data', { method: 'POST' });
          if (response.ok) {
            alert('✅ Alle Daten gelöscht! Lade neu...');
            await loadData();
          } else {
            alert('❌ Fehler beim Löschen der Daten');
          }
        } catch (error) {
          console.error('Error clearing data:', error);
          alert('❌ Fehler beim Löschen der Daten: ' + error);
        } finally {
          setLoading(false);
          setConfirmState({ isOpen: false });
        }
      }
    });
  };

  const handleSnapshotSelect = async (snapshot: StateSnapshot) => {
    setSelectedSnapshot(snapshot);
    setLoading(true);
    
    try {
      const preview = await eventSourcingManager.generateRestorePreview(snapshot.id);
      setRestorePreview(preview);
      setShowDetail(true);
    } catch (error) {
      console.error('[StateRestorePage] Failed to generate preview:', error);
      alert('Fehler beim Erstellen der Vorschau: ' + error);
    } finally {
      setLoading(false);
    }
  };

  const handleQuickRestore = async (snapshot: StateSnapshot) => {
    console.log('[StateRestorePage] Quick restore initiated for snapshot:', snapshot.id);
    
    setPendingRestore(snapshot);
    setShowConfirmRestore(true);
    setConfirmText('');
  };

  const handleDeleteSnapshot = async (snapshot: StateSnapshot) => {
    setConfirmState({
      isOpen: true,
      title: 'Snapshot wirklich löschen?',
      description: `Snapshot vom ${new Date(snapshot.timestamp).toLocaleString('de-DE')} löschen? Diese Aktion kann nicht rückgängig gemacht werden.`,
      onConfirm: async () => {
        try {
          setLoading(true);
          const success = eventSourcingManager.deleteSnapshot(snapshot.id);
          if (success) {
            alert('✅ Snapshot erfolgreich gelöscht!');
            await loadData(); // UI aktualisieren
          } else {
            alert('❌ Fehler: Snapshot nicht gefunden');
          }
        } catch (error) {
          console.error('[StateRestorePage] Failed to delete snapshot:', error);
          alert('❌ Fehler beim Löschen des Snapshots: ' + error);
        } finally {
          setLoading(false);
          setConfirmState({ isOpen: false });
        }
      }
    });
  };

  const executeRestore = async () => {
    if (!pendingRestore) {
      alert('❌ Kein State zum Wiederherstellen ausgewählt');
      return;
    }

    setLoading(true);
    try {
      console.log('[StateRestorePage] Calling restoreFromSnapshot...');
      const result = await eventSourcingManager.restoreFromSnapshot(pendingRestore.id, 'CONFIRMED');
      console.log('[StateRestorePage] Restore result:', result);
      
      setShowConfirmRestore(false);
      setPendingRestore(null);
      setConfirmText('');
      
      alert('✅ State erfolgreich wiederhergestellt!');
      
      if (typeof window !== 'undefined') {
        console.log('[StateRestorePage] Reloading page...');
        window.location.reload();
      }
    } catch (error) {
      console.error('[StateRestorePage] Quick restore failed:', error);
      alert('❌ Wiederherstellung fehlgeschlagen: ' + error);
      
      setShowConfirmRestore(false);
      setPendingRestore(null);
      setConfirmText('');
    } finally {
      setLoading(false);
    }
  };

  const formatTimestamp = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - timestamp;
    const diffHours = diffMs / (1000 * 60 * 60);
    const diffDays = diffMs / (1000 * 60 * 60 * 24);
    
    if (diffHours < 1) {
      return `vor ${Math.floor(diffMs / (1000 * 60))} min`;
    } else if (diffHours < 24) {
      return `vor ${Math.floor(diffHours)} h`;
    } else if (diffDays < 7) {
      return `vor ${Math.floor(diffDays)} Tag${Math.floor(diffDays) !== 1 ? 'en' : ''}`;
    } else {
      return date.toLocaleDateString('de-DE');
    }
  };

  const getEventIcon = (action: string) => {
    switch (action) {
      case 'EXECUTE_TASK': return '✅';
      case 'CREATE_TASK': return '➕';
      case 'DELETE_TASK': return '🗑️';
      case 'UPDATE_TASK': return '✏️';
      case 'ADD_USER': return '👥';
      case 'RATE_TASK': return '⭐';
      default: return '📝';
    }
  };

  const getReadableEventDescription = (event: ActionEvent) => {
    const userName = event.metadata.userName || 'Unbekannt';
    const action = event.action;
    
    switch (action) {
      case 'EXECUTE_TASK':
        return `✅ ${userName} hat eine Aufgabe erledigt`;
      case 'CREATE_TASK':
        return `➕ ${userName} hat eine neue Aufgabe erstellt`;
      case 'DELETE_TASK':
        return `🗑️ ${userName} hat eine Aufgabe gelöscht`;
      case 'UPDATE_TASK':
        return `✏️ ${userName} hat eine Aufgabe bearbeitet`;
      case 'RESTORE_FROM_SNAPSHOT':
        return `🔄 Das System wurde auf einen früheren Stand zurückgesetzt`;
      case 'VERIFY_EXECUTION':
        return `✓ ${userName} hat eine Aufgaben-Erledigung bestätigt`;
      case 'RATE_TASK':
        return `📝 ${userName} hat eine Aufgabe bewertet`;
      case 'ADD_USER':
        return `👥 ${userName} wurde zur WG hinzugefügt`;
      default:
        const readable = action
          .replace(/_/g, ' ')
          .toLowerCase()
          .replace(/\b\w/g, (l: string) => l.toUpperCase())
          .replace('Execute', 'Erledigen')
          .replace('Create', 'Erstellen')
          .replace('Update', 'Bearbeiten')
          .replace('Delete', 'Löschen')
          .replace('Task', 'Aufgabe')
          .replace('User', 'Nutzer');
        return `📝 ${userName}: ${readable}`;
    }
  };

  const filteredEvents = () => {
    switch (activeTab) {
      case 'critical':
        return events.filter(e => e.metadata.critical);
      case 'events':
        return events.slice(0, 50);
      default:
        return [];
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <Button
                variant="ghost"
                onClick={onBack}
                className="mr-4 hover:bg-gray-100"
              >
                ← Zurück zum Dashboard
              </Button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
                  <span className="text-3xl">💾</span>
                  Speicherpunkt-Manager
                </h1>
                <p className="text-sm text-gray-500">Verwalte und stelle frühere Zustände wieder her</p>
              </div>
            </div>
            
            {debugMode && (
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleGenerateTestData}
                  disabled={loading}
                  className="bg-blue-500 text-white hover:bg-blue-600 border-blue-500"
                >
                  🎲 Test-Daten
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleClearTestData}
                  disabled={loading}
                  className="bg-red-500 text-white hover:bg-red-600 border-red-500"
                >
                  🗑️ Löschen
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {loading && (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent mx-auto"></div>
            <p className="mt-4 text-gray-600 font-medium">Lade Daten...</p>
          </div>
        )}

        {!loading && !showDetail && (
          <div className="space-y-6">
            {/* Tab Navigation */}
            <Card className="p-0 overflow-hidden">
              <div className="flex border-b bg-gray-50">
                <button
                  onClick={() => setActiveTab('timeline')}
                  className={`px-6 py-4 font-semibold transition-all ${
                    activeTab === 'timeline' 
                      ? 'text-blue-600 bg-white border-b-2 border-blue-600' 
                      : 'text-gray-600 hover:text-gray-800 hover:bg-gray-100'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    📸 Speicherpunkte
                    <span className="bg-blue-100 text-blue-600 text-xs px-2 py-1 rounded-full">
                      {snapshots.length}
                    </span>
                  </span>
                </button>
                <button
                  onClick={() => setActiveTab('events')}
                  className={`px-6 py-4 font-semibold transition-all ${
                    activeTab === 'events' 
                      ? 'text-blue-600 bg-white border-b-2 border-blue-600' 
                      : 'text-gray-600 hover:text-gray-800 hover:bg-gray-100'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    📜 Alle Aktionen
                    <span className="bg-gray-100 text-gray-600 text-xs px-2 py-1 rounded-full">
                      {events.length}
                    </span>
                  </span>
                </button>
                <button
                  onClick={() => setActiveTab('critical')}
                  className={`px-6 py-4 font-semibold transition-all ${
                    activeTab === 'critical' 
                      ? 'text-blue-600 bg-white border-b-2 border-blue-600' 
                      : 'text-gray-600 hover:text-gray-800 hover:bg-gray-100'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    🚨 Wichtige Aktionen
                    <span className="bg-red-100 text-red-600 text-xs px-2 py-1 rounded-full">
                      {events.filter(e => e.metadata.critical).length}
                    </span>
                  </span>
                </button>
              </div>

              {/* Content */}
              <div className="p-6">
                {activeTab === 'timeline' && (
                  <div>
                    {snapshots.length === 0 ? (
                      <div className="text-center py-12">
                        <div className="text-6xl mb-4">📸</div>
                        <h3 className="text-xl font-semibold text-gray-700 mb-2">
                          Keine Speicherpunkte vorhanden
                        </h3>
                        <p className="text-gray-500 mb-4">
                          Führe erst ein paar Aktionen aus, um automatische Speicherpunkte zu erstellen
                        </p>
                        {debugMode && (
                          <p className="text-sm text-yellow-600">
                            💡 Nutze "Test-Daten" um Beispiel-Speicherpunkte zu erstellen
                          </p>
                        )}
                      </div>
                    ) : (
                      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                        {snapshots.map((snapshot, index) => (
                          <Card key={snapshot.id} className="group hover:shadow-lg transition-all duration-200 border border-gray-200 overflow-hidden">
                            <div className="p-4">
                              {/* Header */}
                              <div className="flex items-center gap-3 mb-3">
                                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold text-sm">
                                  {index + 1}
                                </div>
                                <div className="flex-1">
                                  <h3 className="font-semibold text-gray-900 text-sm">
                                    📸 {formatTimestamp(snapshot.timestamp)}
                                  </h3>
                                  <p className="text-xs text-gray-500">
                                    {new Date(snapshot.timestamp).toLocaleString('de-DE')}
                                  </p>
                                </div>
                              </div>

                              {/* Description */}
                              <div className="mb-3">
                                <p className="text-xs text-gray-600 leading-relaxed">
                                  {snapshot.triggerEvent.includes('EXECUTE_TASK') 
                                    ? '✅ Nach einer erledigten Aufgabe'
                                    : snapshot.triggerEvent.includes('CREATE_TASK')
                                    ? '➕ Nach dem Hinzufügen einer Aufgabe'
                                    : snapshot.triggerEvent.includes('DELETE')
                                    ? '🗑️ Nach dem Löschen'
                                    : snapshot.triggerEvent.includes('UPDATE')
                                    ? '✏️ Nach einer Änderung'
                                    : snapshot.triggerEvent.startsWith('Event:')
                                    ? `🔄 ${snapshot.triggerEvent.replace('Event: ', '')}`
                                    : `📝 ${snapshot.triggerEvent}`
                                  }
                                </p>
                              </div>

                              {/* Meta Info */}
                              <div className="flex items-center gap-3 text-xs text-gray-400 mb-3">
                                <span>💾 {(snapshot.metadata.size / 1024).toFixed(1)} KB</span>
                                <span>🔢 v{snapshot.metadata.version}</span>
                              </div>

                              {/* Actions */}
                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  onClick={() => handleQuickRestore(snapshot)}
                                  disabled={loading}
                                  className="flex-1 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-medium text-xs"
                                >
                                  ⏰ Wiederherstellen
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleSnapshotSelect(snapshot)}
                                  disabled={loading}
                                  className="flex-1 text-xs"
                                >
                                  👁️ Details
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleDeleteSnapshot(snapshot)}
                                  disabled={loading}
                                  className="bg-red-50 hover:bg-red-100 text-red-600 border-red-200 hover:border-red-300 text-xs"
                                >
                                  🗑️
                                </Button>
                              </div>
                            </div>
                          </Card>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {activeTab === 'events' && (
                  <div className="space-y-3">
                    {events.slice(0, 50).map((event, index) => (
                      <Card key={event.id} className="p-4 hover:shadow-md transition-all">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-600 rounded-full flex items-center justify-center text-white text-sm">
                              {getEventIcon(event.action)}
                            </div>
                            <div>
                              <h4 className="font-medium text-gray-900 text-sm">
                                {getReadableEventDescription(event)}
                              </h4>
                              <div className="flex items-center gap-3 text-xs text-gray-500">
                                <span>🔧 {event.action}</span>
                                {event.wgId && <span>🏠 WG: {event.wgId.substring(0, 8)}...</span>}
                                {event.metadata.critical && (
                                  <span className="px-2 py-1 bg-red-100 text-red-700 rounded-full font-medium">
                                    🚨 WICHTIG
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-sm font-medium text-gray-600">
                              {formatTimestamp(event.timestamp)}
                            </div>
                            <div className="text-xs text-gray-400">
                              {new Date(event.timestamp).toLocaleTimeString('de-DE')}
                            </div>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                )}

                {activeTab === 'critical' && (
                  <div className="space-y-3">
                    {filteredEvents().map((event) => (
                      <Card key={event.id} className="p-4 bg-red-50 border-red-200 hover:shadow-md transition-all">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-gradient-to-br from-red-500 to-red-600 rounded-full flex items-center justify-center text-white text-sm">
                              🚨
                            </div>
                            <div>
                              <h4 className="font-medium text-red-900 text-sm">
                                {getReadableEventDescription(event)}
                              </h4>
                              <div className="flex items-center gap-3 text-xs text-red-700">
                                <span>🔧 {event.action}</span>
                                {event.wgId && <span>🏠 WG: {event.wgId.substring(0, 8)}...</span>}
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-sm font-medium text-red-700">
                              {formatTimestamp(event.timestamp)}
                            </div>
                            <div className="text-xs text-red-500">
                              {new Date(event.timestamp).toLocaleTimeString('de-DE')}
                            </div>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            </Card>
          </div>
        )}

        {/* Detail View */}
        {showDetail && selectedSnapshot && restorePreview && (
          <div className="space-y-6">
            <Button
              variant="ghost"
              onClick={() => setShowDetail(false)}
              className="hover:bg-gray-100"
            >
              ← Zurück zur Übersicht
            </Button>

            <Card className="p-6">
              <h3 className="font-bold text-xl mb-4 flex items-center gap-2">
                📸 Speicherpunkt-Details
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div className="space-y-3">
                  <div>
                    <label className="text-sm font-medium text-gray-600">Zeitpunkt</label>
                    <p className="text-lg font-semibold text-gray-900">
                      {new Date(selectedSnapshot.timestamp).toLocaleString('de-DE')}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">Auslöser</label>
                    <p className="text-gray-700">{selectedSnapshot.triggerEvent}</p>
                  </div>
                </div>
                <div className="space-y-3">
                  <div>
                    <label className="text-sm font-medium text-gray-600">Dateigröße</label>
                    <p className="text-gray-700">{(selectedSnapshot.metadata.size / 1024).toFixed(1)} KB</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">Version</label>
                    <p className="text-gray-700">{selectedSnapshot.metadata.version}</p>
                  </div>
                </div>
              </div>

              <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg mb-6">
                <h4 className="font-semibold text-yellow-800 mb-2">⚠️ Was passiert bei der Wiederherstellung?</h4>
                <p className="text-sm text-yellow-700">
                  Alle Änderungen nach diesem Zeitpunkt ({formatTimestamp(selectedSnapshot.timestamp)}) gehen verloren.
                  Es werden <strong>{restorePreview.lostActions.length} Aktionen</strong> rückgängig gemacht.
                </p>
              </div>

              <div className="flex justify-end gap-3">
                <Button
                  variant="outline"
                  onClick={() => setShowDetail(false)}
                >
                  Abbrechen
                </Button>
                <Button
                  onClick={() => {
                    setPendingRestore(selectedSnapshot);
                    setShowConfirmRestore(true);
                  }}
                  disabled={loading}
                  className="bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white font-medium"
                >
                  ⏰ State wiederherstellen
                </Button>
              </div>
            </Card>
          </div>
        )}
      </div>
      <ConfirmDialog
        isOpen={confirmState.isOpen}
        title={confirmState.title}
        description={confirmState.description}
        primaryLabel="Ja"
        secondaryLabel="Nein"
        onPrimary={() => { confirmState.onConfirm && confirmState.onConfirm(); }}
        onSecondary={() => setConfirmState({ isOpen: false })}
        onClose={() => setConfirmState({ isOpen: false })}
      />

      {/* Confirmation Modal */}
      {showConfirmRestore && pendingRestore && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <Card className="w-full max-w-md bg-white shadow-2xl">
            <div className="p-6 text-center">
              <div className="text-4xl mb-4">⚠️</div>
              <h3 className="text-xl font-bold mb-2">Wiederherstellung bestätigen</h3>
              <p className="text-gray-600 mb-6">
                Willst du wirklich zu diesem Zeitpunkt zurückkehren?<br />
                <strong>{new Date(pendingRestore.timestamp).toLocaleString('de-DE')}</strong>
              </p>
              
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowConfirmRestore(false);
                    setPendingRestore(null);
                  }}
                  disabled={loading}
                  className="flex-1"
                >
                  Abbrechen
                </Button>
                <Button
                  onClick={executeRestore}
                  disabled={loading}
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white"
                >
                  {loading ? 'Zeitreise läuft...' : 'Ja, wiederherstellen!'}
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};