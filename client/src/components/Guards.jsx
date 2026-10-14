import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useApp } from '../context/AppContext';
import { sectorLabel } from '../utils/constants';

export function PrivateRoute({ children }) {
  const { user } = useAuth();
  return user ? children : <Navigate to="/login" replace />;
}

export function RoleRoute({ roles, children }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (!roles.includes(user.role)) return <Navigate to="/" replace />;
  return children;
}

// Pages that only exist for one sector (BO/SO); in the other sector a placeholder is shown instead
export function SectorRoute({ sector, children }) {
  const { sector: active, ready } = useApp();
  if (!ready) return <p className="muted">Laden…</p>;
  if (active === sector) return children;
  return (
    <div className="card empty-state">
      <h2>{sectorLabel(active)}</h2>
      <p>Dit onderdeel is voorlopig enkel beschikbaar voor {sectorLabel(sector).toLowerCase()}. De inhoud voor {sectorLabel(active).toLowerCase()} volgt later.</p>
    </div>
  );
}

// One route, a different page per sector (e.g. the start page: BO Overzicht, SO Kwaliteitsbeeld)
export function SectorPick({ BO, SO, TEST }) {
  const { sector, ready } = useApp();
  if (!ready) return <p className="muted">Laden…</p>;
  return sector === 'TEST' ? TEST : sector === 'SO' ? SO : BO;
}
