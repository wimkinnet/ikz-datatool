import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { AppProvider } from './context/AppContext';
import { PrivateRoute, RoleRoute, SectorRoute } from './components/Guards';
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

const staff = ['admin', 'consultant'];

export default function App() {
  return (
    <AuthProvider>
      <AppProvider>
        <ConfirmProvider>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/" element={<PrivateRoute><Layout /></PrivateRoute>}>
              <Route index element={<SectorRoute sector="BO"><Overzicht /></SectorRoute>} />
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
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </ConfirmProvider>
      </AppProvider>
    </AuthProvider>
  );
}
