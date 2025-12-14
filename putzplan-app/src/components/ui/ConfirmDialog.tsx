import React from 'react';

interface ConfirmDialogProps {
  isOpen: boolean;
  title?: string;
  description?: string;
  primaryLabel?: string;
  secondaryLabel?: string;
  onPrimary?: () => void;
  onSecondary?: () => void;
  onClose: () => void;
}

const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  title = 'Bestätigung',
  description,
  primaryLabel = 'OK',
  secondaryLabel = 'Abbrechen',
  onPrimary,
  onSecondary,
  onClose
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-lg shadow-2xl w-full max-w-lg mx-4 p-6 z-10">
        <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
        {description && <p className="mt-3 text-sm text-slate-600">{description}</p>}
        <div className="mt-6 flex justify-end gap-3">
          {typeof onSecondary === 'function' && (
            <button
              onClick={() => { onSecondary && onSecondary(); }}
              className="px-4 py-2 rounded-md border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
            >
              {secondaryLabel}
            </button>
          )}
          {typeof onPrimary === 'function' && (
            <button
              onClick={() => { onPrimary && onPrimary(); }}
              className="px-4 py-2 rounded-md bg-red-600 text-white hover:bg-red-700"
            >
              {primaryLabel}
            </button>
          )}
          {/* Fallback: if no callbacks provided, render a single close button */}
          {typeof onPrimary !== 'function' && typeof onSecondary !== 'function' && (
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-md border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
            >
              {secondaryLabel || 'Schließen'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ConfirmDialog;
