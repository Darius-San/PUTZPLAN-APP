import React, { useState } from 'react';
import { dataManager } from '../../services/dataManager';
import { crossBrowserSync } from '../../services/crossBrowserSync';

interface BrowserSyncDebugProps {
  onClose: () => void;
}

export const BrowserSyncDebug: React.FC<BrowserSyncDebugProps> = ({ onClose }) => {
  const [syncStatus, setSyncStatus] = useState<string>('');
  const [isVisible, setIsVisible] = useState(false);

  const handleForceSync = () => {
    setSyncStatus('🔄 Synchronisiere...');
    try {
      dataManager.forceSyncAcrossBrowsers();
      setSyncStatus('✅ Synchronisation erfolgreich!');
      setTimeout(() => setSyncStatus(''), 3000);
    } catch (error) {
      setSyncStatus('❌ Synchronisation fehlgeschlagen');
      console.error('Sync error:', error);
    }
  };

  const getBrowserInfo = () => {
    const userAgent = navigator.userAgent;
    if (userAgent.includes('VSCode')) {
      return 'VS Code Simple Browser';
    }
    if (userAgent.includes('Chrome')) {
      return 'Chrome Browser';
    }
    return 'Unbekannter Browser';
  };

  const getStorageInfo = () => {
    try {
      const mainData = localStorage.getItem('putzplan-data');
      const syncData = localStorage.getItem('putzplan-sync');
      
      return {
        hasMainData: !!mainData,
        hasSyncData: !!syncData,
        mainDataSize: mainData ? Math.round(mainData.length / 1024) : 0,
        syncDataSize: syncData ? Math.round(syncData.length / 1024) : 0
      };
    } catch {
      return { hasMainData: false, hasSyncData: false, mainDataSize: 0, syncDataSize: 0 };
    }
  };

  if (!isVisible) {
    return (
      <div className="fixed bottom-4 right-4 z-50">
        <button
          onClick={() => setIsVisible(true)}
          className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg shadow-lg text-sm"
          title="Browser Sync Debug öffnen"
        >
          🔄 Sync Debug
        </button>
      </div>
    );
  }

  const storageInfo = getStorageInfo();

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm flex items-center justify-center z-[9999] p-4">
      <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <span>🔄</span>
            Browser Sync Debug
          </h3>
          <button
            onClick={() => setIsVisible(false)}
            className="text-gray-500 hover:text-gray-700 text-xl font-bold"
          >
            ×
          </button>
        </div>

        <div className="space-y-4">
          <div className="bg-blue-50 rounded-lg p-4">
            <h4 className="font-semibold text-blue-800 mb-2">🌐 Browser Info</h4>
            <p className="text-sm text-blue-700">{getBrowserInfo()}</p>
          </div>

          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="font-semibold text-gray-800 mb-2">💾 Storage Info</h4>
            <div className="text-sm text-gray-700 space-y-1">
              <p>Main Data: {storageInfo.hasMainData ? '✅' : '❌'} ({storageInfo.mainDataSize}KB)</p>
              <p>Sync Data: {storageInfo.hasSyncData ? '✅' : '❌'} ({storageInfo.syncDataSize}KB)</p>
            </div>
          </div>

          <div className="bg-yellow-50 rounded-lg p-4">
            <h4 className="font-semibold text-yellow-800 mb-2">⚠️ Problem</h4>
            <p className="text-sm text-yellow-700">
              Simple Browser und normale Browser verwenden verschiedene localStorage-Bereiche. 
              Hier kannst du eine manuelle Synchronisation durchführen.
            </p>
          </div>

          <button
            onClick={handleForceSync}
            className="w-full bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white py-3 px-4 rounded-lg font-semibold transition-all duration-200 transform hover:scale-105 shadow-lg"
          >
            🔄 Jetzt synchronisieren
          </button>

          {syncStatus && (
            <div className="text-center p-2 rounded bg-gray-100">
              <p className="text-sm font-medium">{syncStatus}</p>
            </div>
          )}

          <div className="bg-green-50 rounded-lg p-4">
            <h4 className="font-semibold text-green-800 mb-2">💡 Tipps</h4>
            <ul className="text-sm text-green-700 space-y-1">
              <li>• Synchronisiere nach dem Wechsel zwischen Browsern</li>
              <li>• Daten werden automatisch alle 5 Sekunden überprüft</li>
              <li>• Bei Problemen: Hard Refresh (Strg+F5)</li>
            </ul>
          </div>
        </div>

        <div className="flex gap-2 mt-6">
          <button
            onClick={() => setIsVisible(false)}
            className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 py-2 px-4 rounded-lg font-medium transition-colors"
          >
            Schließen
          </button>
        </div>
      </div>
    </div>
  );
};