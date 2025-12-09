import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { Task } from '../types';
import { useIdleDetection } from '../hooks/useIdleDetection';
import { WhatsAppAutomation } from '../services/whatsappAutomation';
import { usePutzplanStore } from '../hooks/usePutzplanStore';
import { dataManager } from '../services/dataManager';
import { whatsappService } from '../services/whatsappService';

interface UrgentTaskContextType {
  // keep single urgentTask for backward compatibility (first in list)
  urgentTask: Task | null;
  // support multiple urgent tasks by id
  urgentTaskIds: string[];
  toggleUrgentTask: (taskId: string) => void;
  whatsappRecipient: string;
  setWhatsappRecipient: (recipient: string) => void;
}

const UrgentTaskContext = createContext<UrgentTaskContextType | undefined>(undefined);

interface UrgentTaskProviderProps {
  children: ReactNode;
}

export const UrgentTaskProvider = ({ children }: UrgentTaskProviderProps) => {
  const [urgentTaskIds, setUrgentTaskIds] = useState<string[]>([]);
  const [whatsappRecipient, setWhatsappRecipient] = useState<string>('');
  const { currentWG } = usePutzplanStore() as any;

  // Lade WhatsApp-Empfänger aus WG-Settings wenn verfügbar
  useEffect(() => {
    if (currentWG?.settings?.whatsappRecipient) {
      setWhatsappRecipient(currentWG.settings.whatsappRecipient);
    }
  }, [currentWG]);

  // Idle Detection mit WhatsApp Integration
  useIdleDetection({
    idleTime: 60000, // 1 Minute
    onIdle: async () => {
      console.log('🔔 User ist idle - prüfe dringenden Task...');
      
      if (!urgentTaskIds || urgentTaskIds.length === 0) {
        console.log('❌ Kein dringender Task gesetzt');
        return;
      }

      const recipient = whatsappRecipient || currentWG?.settings?.whatsappRecipient;
      if (!recipient) {
        console.log('❌ Kein WhatsApp-Empfänger konfiguriert');
        return;
      }

      // Compose a message listing urgent tasks
      const message = `Dringende Tasks: ${urgentTaskIds.join(', ')}`;
      console.log(`📱 Sende WhatsApp-Nachricht: "${message}" an ${recipient}`);

      const automation = WhatsAppAutomation.getInstance();
      // Bestimme Debug-Flag aus dataManager / store
      const isDebug = (currentWG && currentWG.settings && currentWG.settings.debugMode) || false;
      await automation.sendMessage({
        recipient,
        message,
        debug: isDebug,
        onSuccess: () => {
          console.log('✅ WhatsApp-Nachricht erfolgreich gesendet');
        },
        onError: (error) => {
          console.error('❌ Fehler beim Senden der WhatsApp-Nachricht:', error);
        }
      });
    },
    onActive: () => {
      console.log('👋 User ist wieder aktiv');
    }
  });

  const toggleUrgentTask = async (taskId: string) => {
    // Persist the alarm state in dataManager for canonical source of truth
    try {
      const current = dataManager.getState().tasks[taskId];
      const isAlarmed = !!current?.isAlarmed;
      const newIsAlarmed = !isAlarmed;
      
      dataManager.updateTask(taskId, { isAlarmed: newIsAlarmed } as any);
      
      // Wenn Task als HOT markiert wird, sende WhatsApp-Benachrichtigung
      if (newIsAlarmed && current) {
        console.log('🔥 Task als HOT markiert, sende WhatsApp-Benachrichtigung...');
        
        try {
          const result = await whatsappService.handleHotTaskCreated(
            current.title || `Task ${taskId}`,
            current.description || ''
          );
          
          if (result.success) {
            console.log('✅ WhatsApp-Benachrichtigung gesendet:', result.message);
            // Optional: Zeige Erfolgs-Notification (falls Toast-System existiert)
          } else {
            console.warn('⚠️ WhatsApp-Benachrichtigung fehlgeschlagen:', result.message);
            // Optional: Zeige Warn-Notification
          }
        } catch (error: any) {
          console.error('❌ Fehler bei WhatsApp-Benachrichtigung:', error);
          // Optional: Zeige Fehler-Notification
        }
      }
    } catch (e) {
      // Fallback to local toggle if dataManager fails
      setUrgentTaskIds(prev => {
        if (prev.includes(taskId)) return prev.filter(id => id !== taskId);
        return [...prev, taskId];
      });
    }
  };

  // initialize urgentTaskIds from dataManager on mount and subscribe for updates
  React.useEffect(() => {
    const load = () => {
      try {
        const s = dataManager.getState();
        const ids = Object.values(s.tasks || {}).filter((t: any) => t.isAlarmed).map((t: any) => t.id as string);
        console.log('🔔 [UrgentTaskProvider] loading urgent ids from DataManager:', ids);
        console.log('🔔 [UrgentTaskProvider] all tasks with isAlarmed:', Object.values(s.tasks || {}).map((t: any) => ({ id: t.id, title: t.title, isAlarmed: t.isAlarmed })));
        setUrgentTaskIds(ids);
      } catch (e) {
        console.error('🔔 [UrgentTaskProvider] error loading urgent ids:', e);
      }
    };
    load();
    const unsub = dataManager.subscribe((newState) => {
      console.log('🔔 [UrgentTaskProvider] dataManager state changed, reloading urgent ids');
      load();
    });
    return () => unsub();
  }, []);

  // expose first urgentTask for compatibility (derived on-demand)
  const urgentTask = (urgentTaskIds.length > 0 && currentWG)
    ? (dataManager.getState().tasks[urgentTaskIds[0]] as Task) || null
    : null;

  const value = {
    urgentTask,
    urgentTaskIds,
    toggleUrgentTask,
    whatsappRecipient,
    setWhatsappRecipient
  } as any;

  return (
    <UrgentTaskContext.Provider value={value}>
      {children}
    </UrgentTaskContext.Provider>
  );
};

const useUrgentTask = () => {
  const context = useContext(UrgentTaskContext);
  if (context === undefined) {
    throw new Error('useUrgentTask must be used within a UrgentTaskProvider');
  }
  return context;
};

export { useUrgentTask };