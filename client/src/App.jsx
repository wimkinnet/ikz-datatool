import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { AppProvider } from './context/AppContext';
import { PrivateRoute, RoleRoute, SectorRoute, SectorPick } from './components/Guards';
import { ConfirmProvider } from './components/Confirm';
import Layout from './components/Layout';
import Login from './pages/Login';
import Overzicht from './pages/Overzicht';
import Vragenlijst from './pages/Vragenlijst';
import Jaarplan from './pages/Jaarplan';
import Trends from './pages/Trends';
import Documenten from './pages/Documenten';
import Scholen from './pages/Scholen';
import Gebruikers from './pages/Gebruikers';
import Vragen from './pages/Vragen';
import Lijsten from './pages/Lijsten';
import Profiel from './pages/Profiel';
import Kwaliteitsbeeld from './pages/so/Kwaliteitsbeeld';
import Indicatoren from './pages/so/Indicatoren';
import Kalender from './pages/so/Kalender';
import IndicatorTemplates from './pages/so/IndicatorTemplates';
import Doelen from './pages/test/Doelen';
import Meetpunten from './pages/test/Meetpunten';
import Taken from './pages/test/Taken';
import Resultaten from './pages/test/Resultaten';
import TestKalender from './pages/test/TestKalender';
import TestDashboard from './pages/test/TestDashboard';

const staff = ['admin', 'consultant'];

export default function App() {
  return (
    <AuthProvider>
      <AppProvider>
        <ConfirmProvider>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/" element={<PrivateRoute><Layout /></PrivateRoute>}>
              <Route index element={<SectorPick BO={<Overzicht />} SO={<Kwaliteitsbeeld />} TEST={<Doelen />} />} />
              <Route path="indicatoren" element={<SectorRoute sector="SO"><Indicatoren /></SectorRoute>} />
              <Route path="kalender" element={<SectorPick BO={<SectorRoute sector="SO"><Kalender /></SectorRoute>} SO={<Kalender />} TEST={<RoleRoute roles={['admin']}><TestKalender /></RoleRoute>} />} />
              <Route path="dashboard" element={<RoleRoute roles={['admin']}><SectorRoute sector="TEST"><TestDashboard /></SectorRoute></RoleRoute>} />
              <Route path="meetpunten" element={<RoleRoute roles={['admin']}><SectorRoute sector="TEST"><Meetpunten /></SectorRoute></RoleRoute>} />
              <Route path="taken" element={<RoleRoute roles={['admin']}><SectorRoute sector="TEST"><Taken /></SectorRoute></RoleRoute>} />
              <Route path="vragenlijst" element={<SectorRoute sector="BO"><Vragenlijst /></SectorRoute>} />
              <Route path="jaarplan" element={<SectorRoute sector="BO"><Jaarplan /></SectorRoute>} />
              <Route path="trends" element={<SectorRoute sector="BO"><Trends /></SectorRoute>} />
              <Route path="documenten" element={<Documenten />} />
              <Route path="profiel" element={<Profiel />} />
              <Route path="scholen" element={<RoleRoute roles={staff}><Scholen /></RoleRoute>} />
              <Route path="gebruikers" element={<RoleRoute roles={staff}><Gebruikers /></RoleRoute>} />
              <Route path="sjablonen/vragen" element={<RoleRoute roles={['admin']}><SectorRoute sector="BO"><Vragen /></SectorRoute></RoleRoute>} />
              <Route path="sjablonen/jaarplan" element={<RoleRoute roles={['admin']}><SectorRoute sector="BO"><Jaarplan template /></SectorRoute></RoleRoute>} />
              <Route path="sjablonen/lijsten" element={<RoleRoute roles={['admin']}><SectorRoute sector="BO"><Lijsten /></SectorRoute></RoleRoute>} />
              <Route path="sjablonen/resultaten" element={<RoleRoute roles={['admin']}><SectorRoute sector="TEST"><Resultaten /></SectorRoute></RoleRoute>} />
              <Route path="sjablonen/indicatoren" element={<RoleRoute roles={['admin']}><SectorRoute sector="SO"><IndicatorTemplates /></SectorRoute></RoleRoute>} />
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </ConfirmProvider>
      </AppProvider>
    </AuthProvider>
  );
}
