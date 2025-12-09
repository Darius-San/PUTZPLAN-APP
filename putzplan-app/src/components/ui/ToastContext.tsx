import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';

type ToastType = 'success' | 'error' | 'info';

interface ToastItem {
  id: string;
  type: ToastType;
  message: string;
}

interface ToastContextValue {
  show: (type: ToastType, message: string) => string;
  success: (message: string) => string;
  error: (message: string) => string;
  info: (message: string) => string;
  remove: (id: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const remove = useCallback((id: string) => {
    setToasts((t) => t.filter((x) => x.id !== id));
  }, []);

  const show = useCallback((type: ToastType, message: string) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    setToasts((t) => [...t, { id, type, message }]);
    // auto remove
    setTimeout(() => remove(id), 4000);
    return id;
  }, [remove]);

  const success = useCallback((msg: string) => show('success', msg), [show]);
  const error = useCallback((msg: string) => show('error', msg), [show]);
  const info = useCallback((msg: string) => show('info', msg), [show]);

  return (
    <ToastContext.Provider value={{ show, success, error, info, remove }}>
      {children}
      <div aria-live="polite" className="toast-viewport" style={{position:'fixed', right:16, bottom:16, zIndex:9999}}>
        {toasts.map((t) => (
          <div key={t.id} style={{
            marginTop: 8,
            minWidth: 240,
            background: t.type === 'success' ? '#16a34a' : t.type === 'error' ? '#dc2626' : '#0369a1',
            color: 'white',
            padding: '10px 14px',
            borderRadius: 8,
            boxShadow: '0 4px 14px rgba(0,0,0,0.12)'
          }}>
            {t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = (): ToastContextValue => {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    // Fallback no-op implementation to avoid checks in components/tests
    return {
      show: () => '',
      success: () => '',
      error: () => '',
      info: () => '',
      remove: () => {}
    };
  }
  return ctx;
};

export default ToastContext;
