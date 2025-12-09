import { useEffect, useRef, useCallback } from 'react';

interface IdleDetectionOptions {
  idleTime: number; // Zeit in Millisekunden bis Idle-Status
  onIdle: () => void; // Callback wenn Idle-Status erreicht wird
  onActive: () => void; // Callback wenn User wieder aktiv wird
  events?: string[]; // Events die als Aktivität gelten
}

export const useIdleDetection = ({
  idleTime = 60000, // Standard: 1 Minute
  onIdle,
  onActive,
  events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click']
}: IdleDetectionOptions) => {
  const idleTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isIdleRef = useRef(false);

  const resetIdleTimer = useCallback(() => {
    // User ist aktiv geworden
    if (isIdleRef.current) {
      isIdleRef.current = false;
      onActive();
    }

    // Clear existing timeout
    if (idleTimeoutRef.current) {
      clearTimeout(idleTimeoutRef.current);
    }

    // Set new timeout
    idleTimeoutRef.current = setTimeout(() => {
      if (!isIdleRef.current) {
        isIdleRef.current = true;
        onIdle();
      }
    }, idleTime);
  }, [idleTime, onIdle, onActive]);

  useEffect(() => {
    // Event listeners für Aktivitätserkennung
    const handleActivity = () => {
      resetIdleTimer();
    };

    // Add event listeners
    events.forEach(event => {
      document.addEventListener(event, handleActivity, true);
    });

    // Initial timer start
    resetIdleTimer();

    // Cleanup
    return () => {
      events.forEach(event => {
        document.removeEventListener(event, handleActivity, true);
      });
      if (idleTimeoutRef.current) {
        clearTimeout(idleTimeoutRef.current);
      }
    };
  }, [events, resetIdleTimer]);

  return {
    isIdle: isIdleRef.current,
    resetTimer: resetIdleTimer
  };
};