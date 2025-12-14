import React, { useState, useEffect } from 'react';
import { Card } from '../ui/Card';
import ConfirmDialog from '../ui/ConfirmDialog';
import { Button } from '../ui/Button';
import { ModalPortal } from '../ui/ModalPortal';
import { eventSourcingManager, type StateSnapshot, type ActionEvent, type RestorePreview } from '../../services/eventSourcingManager';
import { usePutzplanStore } from '../../hooks/usePutzplanStore';

interface StateRestoreModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const StateRestoreModal: React.FC<StateRestoreModalProps> = ({ isOpen, onClose }) => {
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
    if (isOpen) {
      loadData();
    }
  }, [isOpen]);

  const loadData = async () => {
    console.log('[StateRestoreModal] Loading data...');
    setLoading(true);
    try {
      const [snapshotData, eventData] = await Promise.all([
        eventSourcingManager.getSnapshots(),
        eventSourcingManager.getEvents()
      ]);
      
      console.log('[StateRestoreModal] Loaded snapshots:', snapshotData.length);
      console.log('[StateRestoreModal] Loaded events:', eventData.length);
      console.log('[StateRestoreModal] Snapshots data:', snapshotData);
      
      setSnapshots(snapshotData);
      setEvents(eventData);
    } catch (error) {
      console.error('[StateRestoreModal] Failed to load data:', error);
      alert('❌ Fehler beim Laden der Daten: ' + error);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateTestData = async () => {
    try {
      await eventSourcingManager.generateTestData();
      await loadData();
      alert('✅ Test-Daten erfolgreich generiert!');
    } catch (error) {
      console.error('[StateRestoreModal] Failed to generate test data:', error);
      alert('❌ Fehler beim Generieren der Test-Daten: ' + error);
    }
  };

  const handleClearTestData = async () => {
    setConfirmState({
      isOpen: true,
      title: 'Alle Event-Sourcing Daten löschen?',
      description: 'Dies löscht alle Snapshots und Events unwiderruflich!',
      onConfirm: async () => {
        try {
          await eventSourcingManager.clearAllData();
          await loadData();
          alert('✅ Test-Daten erfolgreich gelöscht!');
        } catch (error) {
          console.error('[StateRestoreModal] Failed to clear test data:', error);
          alert('❌ Fehler beim Löschen der Test-Daten: ' + error);
        } finally {
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
      console.error('[StateRestoreModal] Failed to generate preview:', error);
      alert('Fehler beim Erstellen der Vorschau: ' + error);
    } finally {
      setLoading(false);
    }
  };

  const handleQuickRestore = async (snapshot: StateSnapshot) => {
    console.log('[StateRestoreModal] Quick restore initiated for snapshot:', snapshot.id);
    
    // Zeige Bestätigungsmodal statt prompt()
    setPendingRestore(snapshot);
    setShowConfirmRestore(true);
    setConfirmText(''); // Reset input
  };

  const executeRestore = async () => {
    if (!pendingRestore) {
      alert('❌ Kein State zum Wiederherstellen ausgewählt');
      return;
    }

    setLoading(true);
    try {
      console.log('[StateRestoreModal] Calling restoreFromSnapshot...');
      const result = await eventSourcingManager.restoreFromSnapshot(pendingRestore.id, 'CONFIRMED');
      console.log('[StateRestoreModal] Restore result:', result);
      
      // Cleanup
      setShowConfirmRestore(false);
      setPendingRestore(null);
      setConfirmText('');
      
      alert('✅ State erfolgreich wiederhergestellt!');
      
      if (typeof window !== 'undefined') {
        console.log('[StateRestoreModal] Reloading page...');
        window.location.reload();
      }
    } catch (error) {
      console.error('[StateRestoreModal] Quick restore failed:', error);
      alert('❌ Wiederherstellung fehlgeschlagen: ' + error);
      
      // Cleanup auch bei Fehler
      setShowConfirmRestore(false);
      setPendingRestore(null);
      setConfirmText('');
    } finally {
      setLoading(false);
    }
  };

  const handleRestore = async () => {
    if (!selectedSnapshot || !restorePreview) return;
    
    // Zeige Bestätigungsmodal statt prompt()
    setPendingRestore(selectedSnapshot);
    setShowConfirmRestore(true);
    setConfirmText(''); // Reset input
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

  const getReadableEventDescription = (event: ActionEvent) => {
    const { action, userId, data } = event;
    const userName = data?.userName || data?.name || 'Jemand';
    const taskTitle = data?.taskTitle || data?.title;
    const pointsAwarded = data?.pointsAwarded;
    
    // Erstelle sehr benutzerfreundliche, verständliche Beschreibungen
    switch (action) {
      case 'EXECUTE_TASK':
        return `✅ ${userName} hat eine Aufgabe erledigt${taskTitle ? ` („${taskTitle}")` : ''}${pointsAwarded ? ` → +${pointsAwarded} Punkte` : ''}`;
      case 'EXECUTE_TASK_FOR_USER':
        return `✅ ${userName} hat eine Aufgabe für jemand anderen eingetragen${taskTitle ? ` („${taskTitle}")` : ''}${pointsAwarded ? ` → +${pointsAwarded} Punkte` : ''}`;
      case 'CREATE_TASK':
        return `➕ ${userName} hat eine neue Aufgabe hinzugefügt${taskTitle ? ` („${taskTitle}")` : ''}`;
      case 'UPDATE_TASK':
        return `✏️ ${userName} hat eine Aufgabe bearbeitet${taskTitle ? ` („${taskTitle}")` : ''}`;
      case 'DELETE_TASK':
        return `🗑️ ${userName} hat eine Aufgabe gelöscht${taskTitle ? ` („${taskTitle}")` : ''}`;
      case 'CREATE_USER':
        return `👤 ${userName} hat sich in der WG registriert`;
      case 'UPDATE_USER':
        return `👤 ${userName} hat sein Profil aktualisiert`;
      case 'CREATE_WG':
        return `🏠 ${userName} hat eine neue WG erstellt${data?.name ? ` („${data.name}")` : ''}`;
      case 'UPDATE_WG_SETTINGS':
        return `⚙️ ${userName} hat WG-Einstellungen geändert`;
      case 'RATE_TASK_EXECUTION':
        return `⭐ ${userName} hat eine Aufgabe bewertet${data?.rating ? ` (${data.rating} Sterne)` : ''}`;
      case 'ADD_ABSENCE':
        return `🏖️ ${userName} hat eine Abwesenheit eingetragen`;
      case 'RESTORE_FROM_SNAPSHOT':
        return `🔄 Das System wurde auf einen früheren Stand zurückgesetzt`;
      case 'VERIFY_EXECUTION':
        return `✓ ${userName} hat eine Aufgaben-Erledigung bestätigt`;
      case 'RATE_TASK':
        return `📝 ${userName} hat eine Aufgabe bewertet`;
      case 'ADD_USER':
        return `👥 ${userName} wurde zur WG hinzugefügt`;
      default:
        // Fallback: Technischer Name mit verständlicherer Formatierung
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
        return events.slice(0, 50); // Zeige nur die letzten 50
      default:
        return [];
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <ModalPortal
        isOpen={isOpen}
        onClose={onClose}
        ariaLabel="State wiederherstellen"
        dataTestId="state-restore-modal"
        className="z-[60]"
      >
        {/* Dunkler Overlay für besseren Kontrast */}
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4">
          <Card className={`w-full max-w-6xl max-h-[95vh] overflow-hidden flex flex-col bg-white shadow-2xl rounded-xl border-0 ${showConfirmRestore ? 'blur-sm' : ''}`}>
            {/* Moderner Header */}
            <div className="px-6 py-4 bg-gradient-to-r from-indigo-600 via-blue-600 to-purple-600 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold flex items-center gap-3 text-white">
                    <span className="text-3xl">💾</span>
                    Speicherpunkt-Manager
                  </h2>
                  <p className="text-blue-100 mt-1">Kehre zu einem früheren Zustand zurück</p>
                </div>
                <button
                  onClick={onClose}
                  className="text-white hover:bg-white hover:bg-opacity-20 rounded-full p-2 transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {loading && (
              <div className="p-8 text-center bg-gray-50">
                <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent mx-auto"></div>
                <p className="mt-4 text-gray-600 font-medium">Lade Zeitreise-Daten...</p>
              </div>
            )}

            {!loading && !showDetail && (
              <>
                {/* Moderne Tab-Navigation */}
                <div className="flex border-b bg-gray-50">
                  <button
                    onClick={() => setActiveTab('timeline')}
                    className={`px-6 py-4 font-semibold transition-all relative ${
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
                      📝 Alle Aktionen
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

                {/* Content Area */}
                <div className="flex-1 overflow-hidden">
                  <div className="h-full overflow-y-auto bg-gray-50">
                    {activeTab === 'timeline' && (
                      <div className="p-6">
                        {/* Debug-Mode Buttons */}
                        {debugMode && (
                          <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                            <div className="flex items-center gap-3 mb-3">
                              <span className="text-yellow-600">🛠️</span>
                              <span className="font-medium text-yellow-800">Debug-Modus aktiv</span>
                            </div>
                            <div className="flex gap-3">
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={handleGenerateTestData}
                                className="bg-blue-500 text-white hover:bg-blue-600 border-blue-500"
                              >
                                🎲 Test-Daten generieren
                              </Button>
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={handleClearTestData}
                                className="bg-red-500 text-white hover:bg-red-600 border-red-500"
                              >
                                🗑️ Alle Daten löschen
                              </Button>
                            </div>
                          </div>
                        )}
                        
                        {snapshots.length === 0 ? (
                          <div className="text-center py-16">
                            <div className="text-6xl mb-4">📸</div>
                            <h3 className="text-xl font-semibold text-gray-700 mb-2">
                              Keine Speicherpunkte vorhanden
                            </h3>
                            <p className="text-gray-500 mb-4">
                              Führe erst ein paar Aktionen aus, um automatische Speicherpunkte zu erstellen
                            </p>
                            {debugMode && (
                              <p className="text-sm text-yellow-600">
                                💡 Nutze "Test-Daten generieren" um Beispiel-Speicherpunkte zu erstellen
                              </p>
                            )}
                          </div>
                        ) : (
                          <div className="h-full">
                            {/* Scroll-Hinweis bei vielen Snapshots */}
                            {snapshots.length > 5 && (
                              <div className="scroll-hint">
                                <p className="flex items-center justify-center gap-2 m-0">
                                  <span>📜</span>
                                  <span><strong>{snapshots.length} Speicherpunkte</strong> gefunden - scrolle nach unten für weitere</span>
                                  <span>👇</span>
                                </p>
                              </div>
                            )}
                            
                            {/* Scrollbarer Container für Snapshots */}
                            <div className="state-restore-container custom-scrollbar space-y-2 p-4">
                              {snapshots.map((snapshot, index) => (
                                <div
                                  key={snapshot.id}
                                  className="group bg-white rounded-lg shadow-sm hover:shadow-md transition-all duration-200 border border-gray-200 overflow-hidden"
                                >
                                <div className="p-3">
                                  <div className="flex items-center justify-between">
                                    <div className="flex-1 pr-3">
                                      {/* Kompakter Header */}
                                      <div className="flex items-center gap-2 mb-1">
                                        <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold text-xs">
                                          {index + 1}
                                        </div>
                                        <div className="flex-1">
                                          <h3 className="text-sm font-semibold text-gray-900 leading-tight">
                                            📸 {formatTimestamp(snapshot.timestamp)}
                                          </h3>
                                          <p className="text-xs text-gray-500">
                                            {new Date(snapshot.timestamp).toLocaleString('de-DE')}
                                          </p>
                                        </div>
                                      </div>

                                      {/* Kompakte Beschreibung */}
                                      <div className="ml-10">
                                        <div className="text-xs text-gray-600 mb-1">
                                          {snapshot.triggerEvent.includes('EXECUTE_TASK') 
                                            ? '✅ Automatischer Speicherpunkt nach einer erledigten Aufgabe'
                                            : snapshot.triggerEvent.includes('CREATE_TASK')
                                            ? '➕ Automatischer Speicherpunkt nach dem Hinzufügen einer Aufgabe'
                                            : snapshot.triggerEvent.includes('DELETE')
                                            ? '🗑️ Automatischer Speicherpunkt nach dem Löschen'
                                            : snapshot.triggerEvent.includes('UPDATE')
                                            ? '✏️ Automatischer Speicherpunkt nach einer Änderung'
                                            : snapshot.triggerEvent.startsWith('Event:')
                                            ? `🔄 ${snapshot.triggerEvent.replace('Event: ', '')}`
                                            : `📝 ${snapshot.triggerEvent}`
                                          }
                                        </div>
                                        
                                        {/* Kompakte Meta-Infos */}
                                        <div className="flex items-center gap-3 text-xs text-gray-400">
                                          <span className="flex items-center gap-1">
                                            💾 {(snapshot.metadata.size / 1024).toFixed(1)} KB
                                          </span>
                                          <span className="flex items-center gap-1">
                                            🔢 Version {snapshot.metadata.version}
                                          </span>
                                        </div>
                                      </div>
                                    </div>

                                    {/* Kompakte Action Buttons */}
                                    <div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleQuickRestore(snapshot);
                                        }}
                                        className="px-3 py-1.5 bg-gradient-to-r from-green-500 to-green-600 text-white font-medium rounded-md hover:from-green-600 hover:to-green-700 transition-all shadow-sm text-xs flex items-center gap-1"
                                        disabled={loading}
                                      >
                                        ⏰ Wiederherstellen
                                      </button>
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleSnapshotSelect(snapshot);
                                        }}
                                        className="px-3 py-1.5 bg-white border border-gray-300 text-gray-700 font-medium rounded-md hover:bg-gray-50 transition-all text-xs flex items-center gap-1"
                                        disabled={loading}
                                      >
                                        👁️ Details
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {(activeTab === 'events' || activeTab === 'critical') && (
                      <div className="p-6">
                        {filteredEvents().length === 0 ? (
                          <div className="text-center py-16">
                            <div className="text-6xl mb-4">📝</div>
                            <h3 className="text-xl font-semibold text-gray-700 mb-2">
                              Keine {activeTab === 'critical' ? 'kritischen ' : ''}Aktionen vorhanden
                            </h3>
                            <p className="text-gray-500">
                              {activeTab === 'critical' 
                                ? 'Erst wenn wichtige Aktionen (wie Task-Ausführungen) durchgeführt werden, erscheinen sie hier'
                                : 'Führe erst ein paar Aktionen aus, um sie hier zu sehen'
                              }
                            </p>
                          </div>
                        ) : (
                          <div className="space-y-3">
                            {filteredEvents().map((event, index) => (
                              <div 
                                key={event.id} 
                                className="group bg-white rounded-lg shadow-sm hover:shadow-md transition-all duration-200 border border-gray-200 overflow-hidden cursor-pointer"
                                onClick={async () => {
                                  console.log('[StateRestoreModal] Event row clicked for:', event.id);
                                  try {
                                    const eventSnapshot = await eventSourcingManager.createSnapshotFromEvent(event.id);
                                    if (eventSnapshot) {
                                      handleSnapshotSelect(eventSnapshot);
                                    } else {
                                      alert('⚠️ Kein State für dieses Event verfügbar');
                                    }
                                  } catch (error) {
                                    console.error('[StateRestoreModal] Event restore error:', error);
                                    alert('❌ Fehler beim Wiederherstellen von Event: ' + error);
                                  }
                                }}
                              >
                                <div className="p-4">
                                  <div className="flex items-start justify-between">
                                    <div className="flex items-start gap-3 flex-1">
                                      <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-600 rounded-full flex items-center justify-center text-white text-lg flex-shrink-0">
                                        {getEventIcon(event.action)}
                                      </div>
                                      <div className="flex-1 min-w-0">
                                        <h4 className="font-medium text-gray-900 mb-1">
                                          {getReadableEventDescription(event)}
                                        </h4>
                                        <div className="flex items-center gap-4 text-xs text-gray-500">
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

                                    <div className="flex flex-col items-end gap-2">
                                      <span className="text-sm font-medium text-gray-600">
                                        {formatTimestamp(event.timestamp)}
                                      </span>
                                      <span className="text-xs text-gray-400">
                                        {new Date(event.timestamp).toLocaleTimeString('de-DE')}
                                      </span>
                                      
                                      {/* Event Action Button */}
                                      <button
                                        onClick={async (e) => {
                                          e.stopPropagation();
                                          try {
                                            const eventSnapshot = await eventSourcingManager.createSnapshotFromEvent(event.id);
                                            if (eventSnapshot) {
                                              setPendingRestore(eventSnapshot);
                                              setShowConfirmRestore(true);
                                            } else {
                                              alert('⚠️ Kein State für dieses Event verfügbar');
                                            }
                                          } catch (error) {
                                            alert('❌ Fehler beim Event-Restore: ' + error);
                                          }
                                        }}
                                        className="opacity-0 group-hover:opacity-100 px-3 py-1 bg-gradient-to-r from-purple-500 to-purple-600 text-white font-medium rounded-lg hover:from-purple-600 hover:to-purple-700 transition-all text-xs shadow-sm"
                                        disabled={loading}
                                      >
                                        ⏰ Zu diesem Event
                                      </button>
                                    </div>
                                  </div>
                                </div>

                                <div className="px-4 py-3 bg-purple-50 border-t border-purple-100">
                                  <p className="text-xs text-purple-600 text-center">
                                    💡 Klicke hier um zu diesem Event-Zeitpunkt zurückzukehren
                                  </p>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}

            {/* Detail View - Verbessert */}
            {showDetail && selectedSnapshot && restorePreview && (
              <div className="flex-1 overflow-hidden bg-gray-50">
                <div className="h-full overflow-y-auto">
                  <div className="p-6">
                    <div className="mb-6">
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => setShowDetail(false)}
                        className="hover:bg-gray-200 text-gray-600"
                      >
                        ← Zurück zur Übersicht
                      </Button>
                    </div>

                    <div className="space-y-6">
                      {/* Snapshot Info - Modernisiert */}
                      <Card className="p-6 bg-white shadow-sm border-0">
                        <h3 className="font-bold text-xl mb-4 flex items-center gap-2">
                          📸 Speicherpunkt-Details
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div className="space-y-3">
                            <div>
                              <span className="text-sm font-medium text-gray-500">Zeitpunkt</span>
                              <p className="text-lg font-semibold text-gray-900">
                                {new Date(selectedSnapshot.timestamp).toLocaleString('de-DE')}
                              </p>
                            </div>
                            <div>
                              <span className="text-sm font-medium text-gray-500">Auslöser</span>
                              <p className="text-gray-700">{selectedSnapshot.triggerEvent}</p>
                            </div>
                          </div>
                          <div className="space-y-3">
                            <div>
                              <span className="text-sm font-medium text-gray-500">Größe</span>
                              <p className="text-gray-700">{(selectedSnapshot.metadata.size / 1024).toFixed(1)} KB</p>
                            </div>
                            <div>
                              <span className="text-sm font-medium text-gray-500">ID</span>
                              <p className="text-gray-700 font-mono text-sm">{selectedSnapshot.id}</p>
                            </div>
                          </div>
                        </div>
                      </Card>

                      {/* Risk Assessment - Modernisiert */}
                      <Card className="p-6 bg-white shadow-sm border-0">
                        <h3 className="font-bold text-xl mb-4 flex items-center gap-2">
                          ⚠️ Auswirkungsanalyse
                        </h3>
                        <div className={`inline-flex items-center px-4 py-2 rounded-full text-sm font-medium mb-6 ${getRiskColor(restorePreview.riskLevel)}`}>
                          <span className="mr-2">
                            {restorePreview.riskLevel === 'high' ? '🔴' : restorePreview.riskLevel === 'medium' ? '🟡' : '🟢'}
                          </span>
                          Risiko-Level: {restorePreview.riskLevel.toUpperCase()}
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          <div className="text-center p-4 bg-blue-50 rounded-lg border border-blue-200">
                            <div className="text-2xl mb-2">👥</div>
                            <div className="font-bold text-blue-600">Benutzer</div>
                            <div className="text-sm text-gray-600">
                              +{restorePreview.affectedData.users.added} / 
                              ~{restorePreview.affectedData.users.modified} / 
                              -{restorePreview.affectedData.users.removed}
                            </div>
                          </div>
                          <div className="text-center p-4 bg-green-50 rounded-lg border border-green-200">
                            <div className="text-2xl mb-2">📋</div>
                            <div className="font-bold text-green-600">Aufgaben</div>
                            <div className="text-sm text-gray-600">
                              +{restorePreview.affectedData.tasks.added} / 
                              ~{restorePreview.affectedData.tasks.modified} / 
                              -{restorePreview.affectedData.tasks.removed}
                            </div>
                          </div>
                          <div className="text-center p-4 bg-purple-50 rounded-lg border border-purple-200">
                            <div className="text-2xl mb-2">🏠</div>
                            <div className="font-bold text-purple-600">WGs</div>
                            <div className="text-sm text-gray-600">
                              +{restorePreview.affectedData.wgs.added} / 
                              ~{restorePreview.affectedData.wgs.modified} / 
                              -{restorePreview.affectedData.wgs.removed}
                            </div>
                          </div>
                          <div className="text-center p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                            <div className="text-2xl mb-2">⭐</div>
                            <div className="font-bold text-yellow-600">Bewertungen</div>
                            <div className="text-sm text-gray-600">
                              +{restorePreview.affectedData.ratings.added} / 
                              ~{restorePreview.affectedData.ratings.modified} / 
                              -{restorePreview.affectedData.ratings.removed}
                            </div>
                          </div>
                        </div>
                      </Card>

                      {/* Lost Actions - falls vorhanden */}
                      {restorePreview.lostActions.length > 0 && (
                        <Card className="p-6 bg-white shadow-sm border-0">
                          <h3 className="font-bold text-xl mb-4 flex items-center gap-2">
                            🗑️ Verloren gehende Aktionen
                            <span className="text-sm font-normal text-gray-500">
                              ({restorePreview.lostActions.length})
                            </span>
                          </h3>
                          <div className="max-h-48 overflow-y-auto space-y-2">
                            {restorePreview.lostActions.slice(0, 10).map((action) => (
                              <div key={action.id} className="flex items-center gap-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                                <span className="text-lg">{getEventIcon(action.action)}</span>
                                <div className="flex-1">
                                  <span className="font-medium text-red-800">{getReadableEventDescription(action)}</span>
                                  <div className="text-xs text-red-600">
                                    {formatTimestamp(action.timestamp)}
                                  </div>
                                </div>
                              </div>
                            ))}
                            {restorePreview.lostActions.length > 10 && (
                              <div className="text-center text-sm text-gray-500 italic py-2">
                                ... und {restorePreview.lostActions.length - 10} weitere Aktionen
                              </div>
                            )}
                          </div>
                        </Card>
                      )}

                      {/* Action Buttons - Modernisiert */}
                      <div className="flex justify-between items-center pt-6 border-t bg-white rounded-lg p-6 shadow-sm">
                        <div className="text-sm text-gray-600 flex items-center gap-2">
                          ⚠️ <strong>Wichtig:</strong> Diese Aktion kann nicht rückgängig gemacht werden
                        </div>
                        <div className="flex gap-3">
                          <Button 
                            variant="outline" 
                            onClick={() => setShowDetail(false)}
                            className="px-6 py-2"
                          >
                            Abbrechen
                          </Button>
                          <Button 
                            onClick={handleRestore}
                            disabled={loading}
                            className="px-6 py-2 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white font-medium shadow-lg"
                          >
                            {loading ? '⏳ Wiederherstellen...' : '⏰ State wiederherstellen'}
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Footer - Modernisiert */}
            <div className="border-t bg-gray-100 px-6 py-3">
              <div className="flex items-center justify-between text-sm text-gray-600">
                <span>🔄 Event-Sourcing System aktiv</span>
                <span>{events.length} Aktionen • {snapshots.length} Speicherpunkte</span>
              </div>
            </div>
          </Card>
        </div>
      </ModalPortal>
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

      {/* Verbessertes Bestätigungsmodal */}
      {showConfirmRestore && pendingRestore && (
        <ModalPortal
          isOpen={showConfirmRestore}
          onClose={() => {
            setShowConfirmRestore(false);
            setPendingRestore(null);
            setConfirmText('');
          }}
          ariaLabel="Zeitreise bestätigen"
          dataTestId="confirm-restore-modal"
          className="z-[100]"
        >
          <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center p-4">
            <Card className="w-full max-w-lg bg-white shadow-2xl rounded-xl border-0 overflow-hidden">
              {/* Header */}
              <div className="p-6 bg-gradient-to-r from-amber-500 to-orange-600 text-white text-center">
                <div className="text-4xl mb-2">⏰</div>
                <h3 className="text-xl font-bold">Zeitreise bestätigen</h3>
                <p className="text-amber-100 text-sm mt-1">Du bist dabei, in der Zeit zurückzureisen</p>
              </div>
              
              {/* Content */}
              <div className="p-6 space-y-4">
                {/* Ziel-Info */}
                <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                  <h4 className="font-semibold text-blue-900 mb-2 flex items-center gap-2">
                    🎯 Reiseziel
                  </h4>
                  <div className="space-y-1 text-sm text-blue-800">
                    <div>
                      <strong>📅 Zeitpunkt:</strong> {new Date(pendingRestore.timestamp).toLocaleString('de-DE')}
                    </div>
                    <div>
                      <strong>📝 Grund:</strong> {
                        pendingRestore.triggerEvent.includes('EXECUTE_TASK') 
                          ? 'Nach einer erledigten Aufgabe'
                          : pendingRestore.triggerEvent.includes('CREATE')
                          ? 'Nach dem Erstellen von etwas'
                          : pendingRestore.triggerEvent
                      }
                    </div>
                  </div>
                </div>
                
                {/* Warnung */}
                <div className="bg-yellow-50 border border-yellow-300 p-4 rounded-lg">
                  <div className="flex items-start gap-3">
                    <span className="text-2xl">⚠️</span>
                    <div>
                      <h4 className="font-semibold text-yellow-800 mb-1">Achtung!</h4>
                      <p className="text-sm text-yellow-700">
                        Alle Änderungen nach diesem Zeitpunkt gehen unwiderruflich verloren!
                      </p>
                    </div>
                  </div>
                </div>

                {/* Bestätigung */}
                <div className="bg-red-50 border border-red-300 p-4 rounded-lg text-center">
                  <div className="text-2xl mb-2">🚨</div>
                  <p className="font-semibold text-red-800">
                    Willst du wirklich zu diesem Zeitpunkt zurückkehren?
                  </p>
                </div>
              </div>

              {/* Actions */}
              <div className="p-6 bg-gray-50 flex justify-center gap-4">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowConfirmRestore(false);
                    setPendingRestore(null);
                    setConfirmText('');
                  }}
                  disabled={loading}
                  className="px-6 py-2 border-gray-300 hover:bg-gray-100"
                >
                  ❌ Abbrechen
                </Button>
                <Button
                  onClick={executeRestore}
                  disabled={loading}
                  className="px-6 py-2 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white font-bold shadow-lg"
                >
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                      Zeitreise läuft...
                    </span>
                  ) : (
                    '⏰ Ja, zeitreisen!'
                  )}
                </Button>
              </div>
            </Card>
          </div>
        </ModalPortal>
      )}
    </>
  );
};