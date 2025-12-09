import React, { useState, useEffect } from 'react';

interface NumberPickerProps {
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  step?: number;
  label?: string;
  dataTestId?: string;
  onNext?: () => void; // called when user presses Next
  openRef?: React.MutableRefObject<{ open?: () => void } | null>;
}

export const NumberPicker: React.FC<NumberPickerProps> = ({ value, onChange, min = 0, max = 1000, step = 1, label, dataTestId, onNext, openRef }) => {
  const [open, setOpen] = useState(false);
  const [local, setLocal] = useState<string>(String(value ?? '0'));

  useEffect(() => {
    setLocal(String(value ?? '0'));
  }, [value]);

  useEffect(() => {
    if (openRef) {
      openRef.current = { open: () => { setLocal(String(value ?? '0')); setOpen(true); } };
    }
    // cleanup
    return () => { if (openRef) { openRef.current = null; } };
  }, [openRef, value]);

  const openPicker = () => { setLocal(String(value ?? '0')); setOpen(true); };
  const close = () => setOpen(false);

  const pressDigit = (d: string) => {
    // avoid leading zeros
    setLocal(prev => {
      if (prev === '0') return d;
      const next = prev + d;
      // cap length to prevent huge numbers
      if (next.length > 6) return prev;
      const num = parseInt(next, 10);
      if (Number.isNaN(num)) return prev;
      if (num > max) return String(max);
      return next;
    });
  };

  const backspace = () => {
    setLocal(prev => {
      if (!prev) return '0';
      const next = prev.slice(0, -1);
      if (next.length === 0) return '0';
      return next;
    });
  };

  const clearAll = () => setLocal('0');

  const confirm = () => {
    const num = Math.max(min, Math.min(max, parseInt(local || '0', 10)));
    onChange(num);
    setOpen(false);
  };

  const handleNext = () => {
    // confirm current value, then call onNext if provided
    confirm();
    if (onNext) onNext();
  };

  return (
    <div>
      <button type="button" onClick={openPicker} data-testid={dataTestId || 'number-picker-btn'} className="border px-3 py-1 rounded">
        {label ? <span className="mr-2 text-sm text-slate-600">{label}:</span> : null}
        <span className="font-medium">{value}</span>
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" data-testid="number-picker-modal">
          <div className="absolute inset-0 bg-black/40" onClick={close} />
          <div className="bg-white rounded-lg shadow-xl p-4 z-10 w-[360px]">
            <div className="text-lg font-semibold mb-2">{label || 'Zahl eingeben'}</div>
            <div className="border rounded p-3 mb-3 text-right text-2xl font-mono" data-testid="np-display">{local}</div>

            <div className="grid grid-cols-3 gap-2">
              {['1','2','3','4','5','6','7','8','9'].map(d => (
                <button key={d} className="py-3 rounded bg-slate-100 text-xl" data-testid={`np-digit-${d}`} onClick={() => pressDigit(d)}>{d}</button>
              ))}
              <button className="py-3 rounded bg-slate-100 text-xl" data-testid="np-backspace" onClick={backspace}>⌫</button>
              <button className="py-3 rounded bg-slate-100 text-xl" data-testid={`np-digit-0`} onClick={() => pressDigit('0')}>0</button>
              <button className="py-3 rounded bg-slate-100 text-xl" data-testid="np-clear" onClick={clearAll}>C</button>
            </div>

            <div className="flex justify-end gap-2 mt-4">
              <button className="btn btn-ghost" onClick={close} data-testid="np-cancel">Abbrechen</button>
              {onNext ? (
                <button className="btn btn-outline" onClick={handleNext} data-testid="np-next">Weiter</button>
              ) : null}
              <button className="btn btn-primary" onClick={confirm} data-testid="np-confirm">OK</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default NumberPicker;
