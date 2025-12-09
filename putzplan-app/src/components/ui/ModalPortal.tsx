import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

interface ModalPortalProps {
  isOpen: boolean;
  onClose: () => void;
  ariaLabel?: string;
  children: React.ReactNode;
  closeOnOverlay?: boolean;
  initialFocusSelector?: string;
  dataTestId?: string;
  className?: string; // extra classes for outer wrapper
  size?: 'md' | 'lg' | 'xl';
}

// Utility: find or create modal root
function getRoot(): HTMLElement | null {
  if (typeof document === 'undefined') return null;
  let root = document.getElementById('modal-root');
  if (!root) {
    root = document.createElement('div');
    root.id = 'modal-root';
    document.body.appendChild(root);
  }
  return root;
}

export const ModalPortal: React.FC<ModalPortalProps> = ({
  isOpen,
  onClose,
  ariaLabel,
  children,
  closeOnOverlay = true,
  initialFocusSelector,
  dataTestId,
  className = '',
  size = 'md'
}) => {
  const previouslyFocused = useRef<HTMLElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Scroll lock + remember focus
  useEffect(() => {
    if (!isOpen || typeof document === 'undefined') return;
    previouslyFocused.current = (document.activeElement as HTMLElement) || null;
    const body = document.body;
    const prevOverflow = body.style.overflow;
    body.style.overflow = 'hidden';
    // Mark document for global blur styling (allows blurring only once regardless of nesting)
    body.dataset.modalActive = 'true';
    // Accessibility: hide app root from screen readers while modal open
    let appRoot = document.getElementById('root');
    if (!appRoot) {
      // In test environments, #root might not exist if App is not mounted via main.jsx
      appRoot = document.createElement('div');
      appRoot.id = 'root';
      document.body.prepend(appRoot);
    }
    appRoot.setAttribute('aria-hidden', 'true');
    return () => { body.style.overflow = prevOverflow; };
  }, [isOpen]);

  // Focus trap + initial focus
  useEffect(() => {
    if (!isOpen) return;
    const rootEl = containerRef.current;
    if (!rootEl) return;
    const focusables = () => Array.from(rootEl.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])'
    ));

    // Initial focus
    let target: HTMLElement | null = null;
    if (initialFocusSelector) target = rootEl.querySelector(initialFocusSelector) as HTMLElement;
    if (!target) target = focusables()[0] || rootEl;
    target && target.focus();

    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
        return;
      }
      if (e.key === 'Tab') {
        const items = focusables();
        if (items.length === 0) { e.preventDefault(); return; }
        const first = items[0];
        const last = items[items.length - 1];
        if (e.shiftKey) {
          if (document.activeElement === first) { e.preventDefault(); last.focus(); }
        } else {
          if (document.activeElement === last) { e.preventDefault(); first.focus(); }
        }
      }
    }
    document.addEventListener('keydown', handleKey, true);
    return () => {
      document.removeEventListener('keydown', handleKey, true);
      // Restore focus
      previouslyFocused.current && previouslyFocused.current.focus?.();
      // Cleanup global markers
      if (typeof document !== 'undefined') {
        const anyOther = document.querySelectorAll('[role="dialog"]').length > 1; // if another modal will remain
        if (!anyOther) {
          delete document.body.dataset.modalActive;
          const appRoot = document.getElementById('root');
          if (appRoot) appRoot.removeAttribute('aria-hidden');
        }
      }
    };
  }, [isOpen, onClose, initialFocusSelector]);

  if (!isOpen) return null;
  const root = getRoot();
  if (!root) return null;

  const overlayClick = (e: React.MouseEvent) => {
    if (!closeOnOverlay) return;
    if (e.target === e.currentTarget) onClose();
  };

  const content = (
    <div
      ref={containerRef}
      data-testid={dataTestId}
      role="dialog"
      aria-modal="true"
      aria-label={ariaLabel}
      // Extremely high z-index + inline style fallback. Inline style ensures correct positioning
      // even if Tailwind classes were accidentally purged / not loaded in legacy contexts.
      className={`fixed inset-0 z-[2147483647] flex items-center justify-center p-4 ${className}`}
      style={{ position:'fixed', inset:0, zIndex:2147483647, display:'flex', alignItems:'center', justifyContent:'center', padding:'1rem' }}
      data-layout="centered-portal"
      data-modal-root
    >
      <div
        className="absolute inset-0 bg-black/45 backdrop-blur-[6px] supports-[backdrop-filter]:backdrop-blur-[10px]"
        onMouseDown={overlayClick}
        data-testid="modal-overlay"
      />
      <div
        className={`relative z-10 w-full ${size === 'md' ? 'max-w-md' : size === 'lg' ? 'max-w-2xl' : 'max-w-4xl'}`}
        data-testid="modal-content"
      >
        {children}
      </div>
    </div>
  );

  return createPortal(content, root);
};
