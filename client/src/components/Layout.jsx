import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useApp } from '../context/AppContext';
import { yearOptions, SWITCH_OPTIONS } from '../utils/constants';
import { SchoolSwitcher } from './SchoolPicker';

const link = ({ isActive }) => 'nav-link' + (isActive ? ' active' : '');

export default function Layout() {
  const { user, logout } = useAuth();
  const { sector, setSector, sectors, schools, school, schoolId, setSchoolId, year, setYear, ready } = useApp();
  const isBO = sector === 'BO';
  const isSO = sector === 'SO';
  const isTest = sector === 'TEST';
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
            {SWITCH_OPTIONS.filter((s) => sectors.includes(s.key)).map((s) => (
              <button key={s.key} role="tab" aria-selected={s.key === sector} title={s.label}
                className={s.key === sector ? 'active' : ''} onClick={() => setSector(s.key)}>
                {s.short}
              </button>
            ))}
          </div>
        ) : sector && (
          <div className="sector-single">{SWITCH_OPTIONS.find((s) => s.key === sector)?.label}</div>
        )}

        <nav>
          <NavLink to="/" end className={link}>{isBO ? 'Overzicht' : isSO ? 'Kwaliteitsbeeld' : 'Dashboard'}</NavLink>
          {isTest && (
            <>
              <NavLink to="/rok" className={link}>ROK</NavLink>
              <NavLink to="/doelen" className={link}>Operationele doelen</NavLink>
              <NavLink to="/kalender" className={link}>Kalender</NavLink>
              <NavLink to="/meetpunten" className={link}>Meetpunten</NavLink>
              <NavLink to="/taken" className={link}>Actielijst</NavLink>
            </>
          )}
          {isSO && (
            <>
              <NavLink to="/indicatoren" className={link}>Indicatoren</NavLink>
              <NavLink to="/kalender" className={link}>Kalender</NavLink>
            </>
          )}
          {isBO && (
            <>
              <NavLink to="/vragenlijst" className={link}>Vragenlijst</NavLink>
              <NavLink to="/jaarplan" className={link}>Jaarplan</NavLink>
              <NavLink to="/trends" className={link}>Trends</NavLink>
            </>
          )}
          {!isTest && <NavLink to="/rok" className={link}>ROK</NavLink>}
          <NavLink to="/documenten" className={link}>Documenten</NavLink>

          {isStaff && (
            <>
              <div className="nav-heading">Beheer</div>
              <NavLink to="/scholen" className={link}>Scholen</NavLink>
              <NavLink to="/gebruikers" className={link}>Gebruikers</NavLink>
            </>
          )}
          {user.role === 'admin' && isBO && (
            <>
              <div className="nav-heading">Sjablonen BO</div>
              <NavLink to="/sjablonen/vragen" className={link}>Vragen</NavLink>
              <NavLink to="/sjablonen/jaarplan" className={link}>Standaard jaarplan</NavLink>
              <NavLink to="/sjablonen/lijsten" className={link}>Keuzelijsten</NavLink>
            </>
          )}
          {user.role === 'admin' && isSO && (
            <>
              <div className="nav-heading">Sjablonen SO</div>
              <NavLink to="/sjablonen/indicatoren" className={link}>Indicatoren</NavLink>
            </>
          )}
          {user.role === 'admin' && isTest && (
            <>
              <div className="nav-heading">Sjablonen Test</div>
              <NavLink to="/sjablonen/resultaten" className={link}>Beoogde resultaten</NavLink>
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
