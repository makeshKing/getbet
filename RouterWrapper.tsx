import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import App from './App';
import { AdminLogin } from './pages/admin/Login';
import { AuthProvider } from './context/AuthContext';
import { AppProvider } from './context/AppContext';
import { CurrencyProvider } from './context/CurrencyContext';
import { ToastProvider } from './components/ui/Toast';
import { ErrorBoundary } from './components/ErrorBoundary';

const RouterWrapper: React.FC = () => {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <AppProvider>
          <CurrencyProvider>
            <ToastProvider>
              <BrowserRouter>
                <Routes>
                  {/* Public route for admin login */}
                  <Route path="/admin/login" element={<AdminLogin />} />
                  {/* Admin routes that should be handled by App component */}
                  <Route path="/admin" element={<App />} />
                  <Route path="/admin/*" element={<App />} />
                  {/* Catch-all route for the main app */}
                  <Route path="/*" element={<App />} />
                </Routes>
              </BrowserRouter>
            </ToastProvider>
          </CurrencyProvider>
        </AppProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
};

export default RouterWrapper;