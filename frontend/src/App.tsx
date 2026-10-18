import type { ReactNode } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import AppShell from './components/AppShell';
import { useAuth } from './context/AuthContext';
import Login from './pages/Login';
import Medications from './pages/Medications';
import Profile from './pages/Profile';
import Schedule from './pages/Schedule';
import { useAppState } from './context/AppState';

function RequireAuth({ children }: { children: ReactNode }) {
  const { token } = useAuth();
  return token ? <>{children}</> : <Navigate to='/login' replace />;
}

function RequireProfile({ children }: { children: ReactNode }) {
  const { profileDone, entries } = useAppState();
  return profileDone || entries.length > 0 ? <>{children}</> : <Navigate to='/profile' replace />;
}

export default function App() {
  return (
    <Routes>
      <Route path='/login' element={<Login />} />
      <Route
        element={
          <RequireAuth>
            <AppShell />
          </RequireAuth>
        }
      >
        <Route path='/medications' element={<Medications />} />
        <Route path='/schedule' element={<Schedule />} />
        <Route path='/profile' element={<Profile />} />
        <Route path='/medications' element={<RequireProfile><Medications /></RequireProfile>} />
        <Route path='/schedule' element={<RequireProfile><Schedule /></RequireProfile>} />
      </Route>
      <Route path='*' element={<Navigate to='/schedule' replace />} />
    </Routes>
  );
}