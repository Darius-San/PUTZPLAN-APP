import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';

type ToastType = 'success' | 'error' | 'info';

interface ToastItem {
  id: string;
  type: ToastType;
  message: string;
  actionLabel?: string;
  action?: () => void;
}

interface ToastContextValue {
  show: (type: ToastType, message: string, action?: { label: string; onClick: () => void }) => string;
  success: (message: string, action?: { label: string; onClick: () => void }) => string;
  error: (message: string, action?: { label: string; onClick: () => void }) => string;
  info: (message: string, action?: { label: string; onClick: () => void }) => string;
  remove: (id: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const remove = useCallback((id: string) => {
    setToasts((t) => t.filter((x) => x.id !== id));
  }, []);

  const show = useCallback((type: ToastType, message: string, action?: { label: string; onClick: () => void }) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    setToasts((t) => [...t, { id, type, message, actionLabel: action?.label, action: action?.onClick }]);
    // auto remove
    setTimeout(() => remove(id), 6000);
    return id;
  }, [remove]);

  const success = useCallback((msg: string, action?: { label: string; onClick: () => void }) => show('success', msg, action), [show]);
  const error = useCallback((msg: string, action?: { label: string; onClick: () => void }) => show('error', msg, action), [show]);
  const info = useCallback((msg: string, action?: { label: string; onClick: () => void }) => show('info', msg, action), [show]);

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
            boxShadow: '0 4px 14px rgba(0,0,0,0.12)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 8
          }}>
            <div style={{flex:1, paddingRight: 8}}>{t.message}</div>
            {t.actionLabel && (
              <button onClick={() => { try { t.action && t.action(); } catch (e) { console.error('Toast action failed', e); } remove(t.id); }} style={{background:'rgba(255,255,255,0.12)', color:'white', border:'none', padding:'6px 8px', borderRadius:6, cursor:'pointer'}}>
                {t.actionLabel}
              </button>
            )}
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
