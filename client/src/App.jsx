import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { AppProvider } from './context/AppContext';
import { PrivateRoute, RoleRoute } from './components/Guards';
import { ConfirmProvider } from './components/Confirm';
import Layout from './components/Layout';
import Login from './pages/Login';
import Documenten from './pages/Documenten';
import Scholen from './pages/Scholen';
import Gebruikers from './pages/Gebruikers';
import Profiel from './pages/Profiel';
import Rok from './pages/Rok';
import Dashboard from './pages/test/TestDashboard';
import Doelen from './pages/test/Doelen';
import Kalender from './pages/test/TestKalender';
import Meetpunten from './pages/test/Meetpunten';
import Acties from './pages/test/Taken';
import Domeinen from './pages/test/Resultaten';

const staff = ['admin', 'consultant'];

export default function App() {
  return (
    <AuthProvider>
      <AppProvider>
        <ConfirmProvider>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/" element={<PrivateRoute><Layout /></PrivateRoute>}>
              <Route index element={<Dashboard />} />
              <Route path="rok" element={<Rok />} />
              <Route path="doelen" element={<Doelen />} />
              <Route path="kalender" element={<Kalender />} />
              <Route path="meetpunten" element={<Meetpunten />} />
              <Route path="acties" element={<Acties />} />
              <Route path="documenten" element={<Documenten />} />
              <Route path="profiel" element={<Profiel />} />
              <Route path="scholen" element={<RoleRoute roles={staff}><Scholen /></RoleRoute>} />
              <Route path="gebruikers" element={<RoleRoute roles={staff}><Gebruikers /></RoleRoute>} />
              <Route path="sjablonen/domeinen" element={<RoleRoute roles={['admin']}><Domeinen /></RoleRoute>} />
              {/* Older addresses */}
              <Route path="dashboard" element={<Navigate to="/" replace />} />
              <Route path="taken" element={<Navigate to="/acties" replace />} />
              <Route path="sjablonen/resultaten" element={<Navigate to="/sjablonen/domeinen" replace />} />
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </ConfirmProvider>
      </AppProvider>
    </AuthProvider>
  );
}
