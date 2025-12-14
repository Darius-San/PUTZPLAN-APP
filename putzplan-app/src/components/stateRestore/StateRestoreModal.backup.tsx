import React, { useState, useEffect } from 'react';
import { ModalPortal } from '../ui/ModalPortal';
import { Card, Button } from '../ui';
import { eventSourcingManager, StateSnapshot, ActionEvent, RestorePreview } from '../../services/eventSourcingManager';
import { usePutzplanStore } from '../../hooks/usePutzplanStore';
import ConfirmDialog from '../ui/ConfirmDialog';

interface StateRestoreModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRestore?: (snapshotId: string) => void;
}

export const StateRestoreModal: React.FC<StateRestoreModalProps> = ({ isOpen, onClose, onRestore }) => {
  const [snapshots, setSnapshots] = useState<StateSnapshot[]>([]);
  const [selectedSnapshot, setSelectedSnapshot] = useState<StateSnapshot | null>(null);
  const [restorePreview, setRestorePreview] = useState<RestorePreview | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'timeline' | 'events' | 'critical'>('timeline');
  const [events, setEvents] = useState<ActionEvent[]>([]);
  const [showDetail, setShowDetail] = useState(false);
  const [confirmState, setConfirmState] = useState<{ isOpen: boolean; title?: string; description?: string; onConfirm?: () => void }>({ isOpen: false });
  
  // Debug Mode Check
  const { debugMode } = usePutzplanStore() as any;

  useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen]);

  const loadData = () => {
    setLoading(true);
    try {
      const snapshotData = eventSourcingManager.getSnapshots(50); // Mehr laden, aber mit Pagination anzeigen
      setSnapshots(snapshotData);
      
      const eventData = eventSourcingManager.getEvents(); // Events laden
      setEvents(eventData);
      
      console.log(`[StateRestoreModal] Loaded ${snapshotData.length} snapshots, ${eventData.length} events`);
    } catch (error) {
      console.error('[StateRestoreModal] Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleClearTestData = () => {
    setConfirmState({
      isOpen: true,
      title: 'Alle Test-Daten löschen?',
      description: 'Dies entfernt alle Events und Snapshots unwiderruflich.',
      onConfirm: () => {
        eventSourcingManager.clearAllData();
        loadData(); // Refresh UI
        alert('✅ Test-Daten erfolgreich gelöscht');
        setConfirmState({ isOpen: false });
      }
    });
  };

  const handleGenerateTestData = () => {
    eventSourcingManager.generateTestData();
    loadData(); // Refresh UI
    alert('🎲 Test-Daten generiert');
  };

  const handleSnapshotSelect = async (snapshot: StateSnapshot) => {
    setSelectedSnapshot(snapshot);
    setLoading(true);
    
    try {
      const preview = await eventSourcingManager.generateRestorePreview(snapshot.id);
      setRestorePreview(preview);
      setShowDetail(true);
    } catch (error) {
      console.error('[StateRestoreModal] Failed to generate preview:', error);
      alert('Fehler beim Erstellen der Vorschau: ' + error);
    } finally {
      setLoading(false);
    }
  };

  const handleQuickRestore = async (snapshot: StateSnapshot) => {
    const confirmText = `🔄 State sofort wiederherstellen?\n\nZeitpunkt: ${new Date(snapshot.timestamp).toLocaleString('de-DE')}\nTrigger: ${snapshot.triggerEvent}\n\n⚠️ Diese Aktion kann nicht rückgängig gemacht werden!\n\nTippen Sie "RESTORE" um zu bestätigen:`;
    
    const confirmation = prompt(confirmText);
    if (confirmation !== 'RESTORE') {
      return;
    }

    setLoading(true);
    try {
      await eventSourcingManager.restoreFromSnapshot(snapshot.id, confirmation);
      alert('✅ State erfolgreich wiederhergestellt!');
      
      // Daten neu laden
      if (typeof window !== 'undefined') {
        window.location.reload();
      }
    } catch (error) {
      console.error('[StateRestoreModal] Quick restore failed:', error);
      alert('❌ Wiederherstellung fehlgeschlagen: ' + error);
    } finally {
      setLoading(false);
    }
  };

  const handleRestore = async () => {
    if (!selectedSnapshot || !restorePreview) return;
    
    const confirmText = `Sind Sie sicher, dass Sie den State vom ${new Date(selectedSnapshot.timestamp).toLocaleString()} wiederherstellen möchten?\n\nRisiko-Level: ${restorePreview.riskLevel.toUpperCase()}\nVerlorene Actions: ${restorePreview.lostActions.length}\n\nTippen Sie "RESTORE" um zu bestätigen:`;
    
    const confirmation = prompt(confirmText);
    if (confirmation !== 'RESTORE') {
      return;
    }

    setLoading(true);
    try {
      const success = await eventSourcingManager.restoreFromSnapshot(selectedSnapshot.id, 'CONFIRM_RESTORE');
      if (success) {
        alert('✅ State erfolgreich wiederhergestellt! Die Seite wird neu geladen.');
        if (onRestore) {
          onRestore(selectedSnapshot.id);
        }
        // Reload um den neuen State zu laden
        window.location.reload();
      } else {
        alert('❌ Restore fehlgeschlagen. Siehe Console für Details.');
      }
    } catch (error) {
      console.error('[StateRestoreModal] Restore failed:', error);
      alert('❌ Restore fehlgeschlagen: ' + error);
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
      return `vor ${Math.floor(diffDays)} Tagen`;
    } else {
      return date.toLocaleDateString('de-DE');
    }
  };

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'low': return 'text-green-600 bg-green-100';
      case 'medium': return 'text-yellow-600 bg-yellow-100';
      case 'high': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getEventIcon = (action: string) => {
    if (action.includes('DELETE')) return '🗑️';
    if (action.includes('CREATE')) return '➕';
    if (action.includes('UPDATE')) return '✏️';
    if (action.includes('EXECUTE')) return '✅';
    if (action.includes('RATE')) return '⭐';
    if (action.includes('RESTORE')) return '🔄';
    return '📝';
  };

  const filteredEvents = () => {
    switch (activeTab) {
      case 'critical':
        return events.filter(e => e.metadata.critical);
      case 'events':
        return events.slice(0, 50); // Zeige nur die letzten 50
      default:
        return [];
    }
  };

  if (!isOpen) return null;

  return (
    <ModalPortal
      isOpen={isOpen}
      onClose={onClose}
      ariaLabel="State wiederherstellen"
      dataTestId="state-restore-modal"
      className="z-[60]"
    >
      <Card className="w-full max-w-6xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b flex items-center justify-between bg-gradient-to-r from-blue-50 to-purple-50">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">🔄 State wiederherstellen</h2>
            <p className="text-gray-600 mt-1">Wählen Sie einen Zeitpunkt für die Wiederherstellung</p>
          </div>
          <Button variant="ghost" onClick={onClose} size="sm">✕</Button>
        </div>

        {loading && (
          <div className="p-6 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-2 text-gray-600">Lade Daten...</p>
          </div>
        )}

        {!loading && !showDetail && (
          <>
            {/* Tabs */}
            <div className="flex border-b">
              <button
                onClick={() => setActiveTab('timeline')}
                className={`px-6 py-3 font-medium ${activeTab === 'timeline' ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50' : 'text-gray-600 hover:text-gray-800'}`}
              >
                📸 Snapshots ({snapshots.length})
              </button>
              <button
                onClick={() => setActiveTab('events')}
                className={`px-6 py-3 font-medium ${activeTab === 'events' ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50' : 'text-gray-600 hover:text-gray-800'}`}
              >
                📝 Events ({events.length})
              </button>
              <button
                onClick={() => setActiveTab('critical')}
                className={`px-6 py-3 font-medium ${activeTab === 'critical' ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50' : 'text-gray-600 hover:text-gray-800'}`}
              >
                🚨 Kritische Events ({events.filter(e => e.metadata.critical).length})
              </button>
            </div>

            {/* Content */}
            <div className="p-6 overflow-y-auto max-h-[60vh]">
              {activeTab === 'timeline' && (
                <div className="space-y-4">
                  {/* Debug-Mode Buttons */}
                  {debugMode && (
                    <div className="flex gap-2 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={handleGenerateTestData}
                        className="bg-blue-500 text-white hover:bg-blue-600"
                      >
                        🎲 Test-Daten generieren
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={handleClearTestData}
                        className="bg-red-500 text-white hover:bg-red-600"
                      >
                        🗑️ Test-Daten löschen
                      </Button>
                      <span className="text-xs text-yellow-700 self-center ml-2">
                        Debug-Mode: Diese Buttons sind nur für Entwicklung sichtbar
                      </span>
                    </div>
                  )}
                  
                  {snapshots.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <p>Keine Snapshots verfügbar</p>
                      {debugMode && (
                        <p className="text-xs mt-2">Nutze "Test-Daten generieren" oben um Beispiel-Snapshots zu erstellen</p>
                      )}
                    </div>
                  ) : (
                    <div className="max-h-96 overflow-y-auto space-y-3 pr-2">
                      {snapshots.slice(0, 20).map((snapshot) => (
                        <div
                          key={snapshot.id}
                          className="border rounded-lg p-4 hover:bg-blue-50 transition-colors group relative"
                        >
                          <div className="flex items-center justify-between">
                            <div 
                              className="flex-1 cursor-pointer pr-4"
                              onClick={() => handleSnapshotSelect(snapshot)}
                            >
                              <div className="font-medium text-gray-900">
                                📸 {formatTimestamp(snapshot.timestamp)}
                              </div>
                              <div className="text-sm text-gray-600">
                                Trigger: {snapshot.triggerEvent}
                              </div>
                              <div className="text-xs text-gray-500 mt-1">
                                Größe: {(snapshot.metadata.size / 1024).toFixed(1)} KB • 
                                Version: {snapshot.metadata.version}
                              </div>
                            </div>
                            <div className="text-right flex flex-col gap-2 min-w-0">
                              <div>
                                <div className="text-sm font-medium text-blue-600">
                                  {new Date(snapshot.timestamp).toLocaleString('de-DE')}
                                </div>
                                <div className="text-xs text-gray-500">
                                  ID: {snapshot.id.substring(0, 12)}...
                                </div>
                              </div>
                              {/* Buttons immer sichtbar für bessere UX */}
                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleQuickRestore(snapshot);
                                  }}
                                  className="text-xs px-3 py-1 bg-green-500 text-white hover:bg-green-600 border-green-500 font-medium"
                                  title="Direkt laden - RESTORE eingeben"
                                  disabled={loading}
                                >
                                  🔄 Laden
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleSnapshotSelect(snapshot);
                                  }}
                                  className="text-xs px-3 py-1"
                                  title="Details mit Vorschau anzeigen"
                                  disabled={loading}
                                >
                                  👁️ Details
                                </Button>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                                  className="text-xs px-2 py-1"
                                  title="Details anzeigen"
                                >
                                  👁️ Details
                                </Button>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                      {snapshots.length > 20 && (
                        <div className="text-center py-4 text-gray-500 text-sm">
                          ... und {snapshots.length - 20} weitere Snapshots
                          <br />
                          <span className="text-xs">Scrollen um ältere zu sehen</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {(activeTab === 'events' || activeTab === 'critical') && (
                <div className="space-y-2">
                  {filteredEvents().length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      Keine Events in dieser Kategorie
                      {debugMode && activeTab === 'events' && (
                        <p className="text-xs mt-2">Nutze "Test-Daten generieren" im Timeline-Tab um Events zu erstellen</p>
                      )}
                    </div>
                  ) : (
                    <div className="max-h-96 overflow-y-auto space-y-2 pr-2">
                      {filteredEvents().slice(0, 50).map((event) => (
                        <div key={event.id} className="border rounded p-3 text-sm">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span>{getEventIcon(event.action)}</span>
                              <span className="font-medium">{event.action}</span>
                              {event.metadata.critical && (
                                <span className="px-2 py-1 bg-red-100 text-red-700 rounded text-xs">KRITISCH</span>
                              )}
                            </div>
                            <span className="text-gray-500">{formatTimestamp(event.timestamp)}</span>
                          </div>
                          {event.userId && (
                            <div className="text-xs text-gray-600 mt-1">
                              User: {event.userId} • WG: {event.wgId || 'N/A'}
                            </div>
                          )}
                        </div>
                      ))}
                      {filteredEvents().length > 50 && (
                        <div className="text-center py-4 text-gray-500 text-sm">
                          ... und {filteredEvents().length - 50} weitere Events
                          <br />
                          <span className="text-xs">Scrollen um ältere zu sehen</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </>
        )}

        {/* Detail View */}
        {showDetail && selectedSnapshot && restorePreview && (
          <div className="p-6 overflow-y-auto max-h-[70vh]">
            <div className="mb-4">
              <Button variant="ghost" size="sm" onClick={() => setShowDetail(false)}>
                ← Zurück zur Übersicht
              </Button>
            </div>

            <div className="space-y-6">
              {/* Snapshot Info */}
              <Card className="p-4">
                <h3 className="font-bold text-lg mb-2">📸 Snapshot Details</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <strong>Zeitpunkt:</strong> {new Date(selectedSnapshot.timestamp).toLocaleString('de-DE')}
                  </div>
                  <div>
                    <strong>Trigger:</strong> {selectedSnapshot.triggerEvent}
                  </div>
                  <div>
                    <strong>Größe:</strong> {(selectedSnapshot.metadata.size / 1024).toFixed(1)} KB
                  </div>
                  <div>
                    <strong>ID:</strong> {selectedSnapshot.id}
                  </div>
                </div>
              </Card>

              {/* Risk Assessment */}
              <Card className="p-4">
                <h3 className="font-bold text-lg mb-2">⚠️ Auswirkungsanalyse</h3>
                <div className={`inline-block px-3 py-1 rounded-full text-sm font-medium mb-4 ${getRiskColor(restorePreview.riskLevel)}`}>
                  Risiko-Level: {restorePreview.riskLevel.toUpperCase()}
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div className="text-center p-3 bg-gray-50 rounded">
                    <div className="font-bold text-blue-600">👥 Users</div>
                    <div>+{restorePreview.affectedData.users.added} / ~{restorePreview.affectedData.users.modified} / -{restorePreview.affectedData.users.removed}</div>
                  </div>
                  <div className="text-center p-3 bg-gray-50 rounded">
                    <div className="font-bold text-green-600">📋 Tasks</div>
                    <div>+{restorePreview.affectedData.tasks.added} / ~{restorePreview.affectedData.tasks.modified} / -{restorePreview.affectedData.tasks.removed}</div>
                  </div>
                  <div className="text-center p-3 bg-gray-50 rounded">
                    <div className="font-bold text-purple-600">🏠 WGs</div>
                    <div>+{restorePreview.affectedData.wgs.added} / ~{restorePreview.affectedData.wgs.modified} / -{restorePreview.affectedData.wgs.removed}</div>
                  </div>
                  <div className="text-center p-3 bg-gray-50 rounded">
                    <div className="font-bold text-yellow-600">⭐ Ratings</div>
                    <div>+{restorePreview.affectedData.ratings.added} / ~{restorePreview.affectedData.ratings.modified} / -{restorePreview.affectedData.ratings.removed}</div>
                  </div>
                </div>
              </Card>

              {/* Lost Actions */}
              {restorePreview.lostActions.length > 0 && (
                <Card className="p-4">
                  <h3 className="font-bold text-lg mb-2">🗑️ Verlorene Actions ({restorePreview.lostActions.length})</h3>
                  <div className="max-h-40 overflow-y-auto space-y-2">
                    {restorePreview.lostActions.slice(0, 10).map((action) => (
                      <div key={action.id} className="text-sm border-l-4 border-red-300 pl-3 py-1">
                        <div className="flex items-center gap-2">
                          <span>{getEventIcon(action.action)}</span>
                          <span className="font-medium">{action.action}</span>
                          <span className="text-gray-500">({formatTimestamp(action.timestamp)})</span>
                        </div>
                      </div>
                    ))}
                    {restorePreview.lostActions.length > 10 && (
                      <div className="text-xs text-gray-500 italic">
                        ... und {restorePreview.lostActions.length - 10} weitere
                      </div>
                    )}
                  </div>
                </Card>
              )}

              {/* Action Buttons */}
              <div className="flex justify-between items-center pt-4 border-t">
                <div className="text-sm text-gray-600">
                  ⚠️ Diese Aktion kann nicht rückgängig gemacht werden
                </div>
                <div className="flex gap-3">
                  <Button variant="outline" onClick={() => setShowDetail(false)}>
                    Abbrechen
                  </Button>
                  <Button 
                    onClick={handleRestore}
                    disabled={loading}
                    className="bg-red-600 hover:bg-red-700 text-white"
                  >
                    {loading ? 'Wiederherstellen...' : '🔄 State wiederherstellen'}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Debug Info Footer */}
        <div className="border-t p-4 bg-gray-50 text-xs text-gray-600">
          Event-Sourcing System • {events.length} Events • {snapshots.length} Snapshots
        </div>
      </Card>
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
    </ModalPortal>
  );
};