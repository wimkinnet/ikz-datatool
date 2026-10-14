import { useEffect, useRef } from 'react';

export default function Modal({ title, onClose, children, wide }) {
  const ref = useRef(null);
  useEffect(() => {
    // Escape closes only the topmost dialog when one is opened from another
    const isTop = () => {
      const all = document.querySelectorAll('.modal-backdrop');
      return all[all.length - 1] === ref.current;
    };
    const onKey = (e) => e.key === 'Escape' && isTop() && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="modal-backdrop" ref={ref} onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className={`modal ${wide ? 'wide-modal' : ''}`} role="dialog" aria-modal="true" aria-label={title}>
        <div className="modal-header">
          <h2>{title}</h2>
          <button className="btn btn-sm" onClick={onClose}>Sluiten</button>
        </div>
        {children}
      </div>
    </div>
  );
}
