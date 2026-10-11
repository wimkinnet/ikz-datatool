import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useApp } from '../context/AppContext';
import { yearOptions, SECTORS } from '../utils/constants';
import { SchoolSwitcher } from './SchoolPicker';

const link = ({ isActive }) => 'nav-link' + (isActive ? ' active' : '');

export default function Layout() {
  const { user, logout } = useAuth();
  const { sector, setSector, sectors, schools, school, schoolId, setSchoolId, year, setYear, ready } = useApp();
  const isSO = sector === 'SO';
  const navigate = useNavigate();
  const isStaff = user.role !== 'client';

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          IKZ Datatool
          <span>Interne kwaliteitszorg</span>
        </div>

        {sectors.length > 1 ? (
          <div className="sector-switch" role="tablist" aria-label="Onderwijsniveau">
            {SECTORS.filter((s) => sectors.includes(s.key)).map((s) => (
              <button key={s.key} role="tab" aria-selected={s.key === sector} title={s.label}
                className={s.key === sector ? 'active' : ''} onClick={() => setSector(s.key)}>
                {s.short}
              </button>
            ))}
          </div>
        ) : sector && (
          <div className="sector-single">{SECTORS.find((s) => s.key === sector)?.label}</div>
        )}

        <nav>
          <NavLink to="/" end className={link}>Overzicht</NavLink>
          {isSO && (
            <>
              <NavLink to="/vragenlijst" className={link}>Vragenlijst</NavLink>
              <NavLink to="/jaarplan" className={link}>Jaarplan</NavLink>
              <NavLink to="/trends" className={link}>Trends</NavLink>
            </>
          )}
          <NavLink to="/documenten" className={link}>Documenten</NavLink>

          {isStaff && (
            <>
              <div className="nav-heading">Beheer</div>
              <NavLink to="/scholen" className={link}>Scholen</NavLink>
              <NavLink to="/gebruikers" className={link}>Gebruikers</NavLink>
            </>
          )}
          {user.role === 'admin' && isSO && (
            <>
              <div className="nav-heading">Sjablonen SO</div>
              <NavLink to="/sjablonen/vragen" className={link}>Vragen</NavLink>
              <NavLink to="/sjablonen/jaarplan" className={link}>Standaard jaarplan</NavLink>
              <NavLink to="/sjablonen/lijsten" className={link}>Keuzelijsten</NavLink>
            </>
          )}
        </nav>

        <div className="sidebar-footer">
          <div className="sidebar-user">
            {user.name}
            <small>{user.role === 'admin' ? 'Admin' : user.role === 'consultant' ? 'Consultant' : 'School'}</small>
          </div>
          <button className="logout-btn" onClick={() => navigate('/profiel')}>Mijn profiel</button>
          <button className="logout-btn" onClick={() => { logout(); navigate('/login'); }}>Afmelden</button>
        </div>
      </aside>

      <main className="main">
        <div className="topbar">
          <div className="who">
            {isStaff || schools.length > 1 ? (
              schools.length ? (
                <SchoolSwitcher schools={schools} value={schoolId} onChange={setSchoolId} />
              ) : (
                <span className="muted">Geen scholen toegewezen</span>
              )
            ) : (
              school?.name || (ready ? 'School' : '')
            )}
          </div>
          <div className="controls">
            <label className="muted" htmlFor="year-select">Schooljaar</label>
            <select id="year-select" value={year} onChange={(e) => setYear(e.target.value)}>
              {yearOptions().map((y) => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
        </div>
        <Outlet />
      </main>
    </div>
  );
}
