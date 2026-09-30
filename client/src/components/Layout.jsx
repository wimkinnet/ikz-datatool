import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useApp } from '../context/AppContext';
import { yearOptions } from '../utils/constants';

const link = ({ isActive }) => 'nav-link' + (isActive ? ' active' : '');

export default function Layout() {
  const { user, logout } = useAuth();
  const { schools, school, schoolId, setSchoolId, year, setYear, ready } = useApp();
  const navigate = useNavigate();
  const isStaff = user.role !== 'client';

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          IKZ Datatool
          <span>Interne kwaliteitszorg</span>
        </div>

        <nav>
          <NavLink to="/" end className={link}>Overzicht</NavLink>
          <NavLink to="/vragenlijst" className={link}>Vragenlijst</NavLink>
          <NavLink to="/jaarplan" className={link}>Jaarplan</NavLink>
          <NavLink to="/trends" className={link}>Trends</NavLink>
          <NavLink to="/documenten" className={link}>Documenten</NavLink>

          {isStaff && (
            <>
              <div className="nav-heading">Beheer</div>
              <NavLink to="/scholen" className={link}>Scholen</NavLink>
              <NavLink to="/gebruikers" className={link}>Gebruikers</NavLink>
            </>
          )}
          {user.role === 'admin' && (
            <>
              <div className="nav-heading">Sjablonen</div>
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
                <select value={schoolId} onChange={(e) => setSchoolId(e.target.value)} aria-label="School">
                  {schools.map((s) => <option key={s._id} value={s._id}>{s.name}</option>)}
                </select>
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
