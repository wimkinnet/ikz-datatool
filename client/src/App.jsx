import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { AppProvider } from './context/AppContext';
import { PrivateRoute, RoleRoute } from './components/Guards';
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
              <Route index element={<Overzicht />} />
              <Route path="vragenlijst" element={<Vragenlijst />} />
              <Route path="jaarplan" element={<Jaarplan />} />
              <Route path="trends" element={<Trends />} />
              <Route path="documenten" element={<Documenten />} />
              <Route path="profiel" element={<Profiel />} />
              <Route path="scholen" element={<RoleRoute roles={staff}><Scholen /></RoleRoute>} />
              <Route path="gebruikers" element={<RoleRoute roles={staff}><Gebruikers /></RoleRoute>} />
              <Route path="sjablonen/vragen" element={<RoleRoute roles={['admin']}><Vragen /></RoleRoute>} />
              <Route path="sjablonen/jaarplan" element={<RoleRoute roles={['admin']}><Jaarplan template /></RoleRoute>} />
              <Route path="sjablonen/lijsten" element={<RoleRoute roles={['admin']}><Lijsten /></RoleRoute>} />
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </ConfirmProvider>
      </AppProvider>
    </AuthProvider>
  );
}
