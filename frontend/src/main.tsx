import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import './index.css';
import App from './App';
import { AuthProvider } from './context/AuthContext';
import { AppStateProvider } from './context/AppState';
import { ClockProvider } from './context/ClockContext';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <AppStateProvider>
          <ClockProvider>
            <App />
          </ClockProvider>
        </AppStateProvider>
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
);