import { STATUS } from '../utils/constants';
import { useApp } from '../context/AppContext';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export function StatusPill({ status }) {
  const s = STATUS[status];
  return <span className={`status-pill ${status}`}>{s ? s.label : status}</span>;
}

export function ErrorBanner({ message }) {
  return message ? <div className="error-banner">{message}</div> : null;
}

// Shown by pages that need an active school when there is none yet
export function NoSchool() {
  const { user } = useAuth();
  const { ready } = useApp();
  if (!ready) return <p className="muted">Laden…</p>;
  return (
    <div className="card empty-state">
      {user.role === 'client' ? (
        <p>Je account is nog niet aan een school gekoppeld. Neem contact op met je consultant.</p>
      ) : (
        <p>
          Er is nog geen school beschikbaar. {user.role === 'admin' ? <><Link to="/scholen">Voeg een school toe</Link>.</> : 'Vraag een admin om je aan een school toe te wijzen.'}
        </p>
      )}
    </div>
  );
}

export function ChartEmpty({ children = 'Nog geen gegevens om te tonen.' }) {
  return <div className="chart-empty">{children}</div>;
}
