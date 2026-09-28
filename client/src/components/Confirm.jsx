import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';

const ConfirmContext = createContext(null);

// In-app "are you sure?" dialog. Usage:
//   const confirm = useConfirm();
//   if (!(await confirm({ title: 'School verwijderen?', message: '…', confirmLabel: 'Verwijderen' }))) return;
export function ConfirmProvider({ children }) {
  const [dialog, setDialog] = useState(null);
  const resolver = useRef(null);

  const confirm = useCallback((opts) => new Promise((resolve) => {
    resolver.current = resolve;
    setDialog(typeof opts === 'string' ? { message: opts } : opts);
  }), []);

  const close = useCallback((result) => {
    resolver.current?.(result);
    resolver.current = null;
    setDialog(null);
  }, []);

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      {dialog && <ConfirmDialog {...dialog} onClose={close} />}
    </ConfirmContext.Provider>
  );
}

export function useConfirm() {
  return useContext(ConfirmContext);
}

function ConfirmDialog({ title = 'Weet je het zeker?', message, confirmLabel = 'Verwijderen', cancelLabel = 'Annuleren', danger = true, onClose }) {
  const cancelRef = useRef(null);

  useEffect(() => {
    cancelRef.current?.focus();
    // Capture phase + stopPropagation so Escape only closes this dialog, not a Modal underneath it
    const onKey = (e) => { if (e.key === 'Escape') { e.stopPropagation(); onClose(false); } };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [onClose]);

  return (
    <div className="modal-backdrop confirm-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose(false)}>
      <div className="modal confirm-modal" role="alertdialog" aria-modal="true" aria-label={title}>
        <h2>{title}</h2>
        {message && <p className="confirm-message">{message}</p>}
        <div className="confirm-actions">
          <button ref={cancelRef} className="btn" onClick={() => onClose(false)}>{cancelLabel}</button>
          <button className={`btn ${danger ? 'btn-danger-solid' : 'btn-primary'}`} onClick={() => onClose(true)}>{confirmLabel}</button>
        </div>
      </div>
    </div>
  );
}
