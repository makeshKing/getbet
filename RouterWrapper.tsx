import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import App from './App';
import { AuthProvider } from './context/AuthContext';
import { AppProvider } from './context/AppContext';
import { CurrencyProvider } from './context/CurrencyContext';
import { ToastProvider } from './components/ui/Toast';
import { ErrorBoundary } from './components/ErrorBoundary';

const AdminLogin = React.lazy(() => import('./pages/admin/Login').then(m => ({ default: m.AdminLogin })));

const RouterWrapper: React.FC = () => {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <AppProvider>
          <CurrencyProvider>
            <ToastProvider>
              <BrowserRouter>
                <React.Suspense fallback={
                  <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-950">
                    <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                  </div>
                }>
                  <Routes>
                    {/* Public route for admin login */}
                    <Route path="/admin/login" element={<AdminLogin />} />
                    {/* Admin routes that should be handled by App component */}
                    <Route path="/admin" element={<App />} />
                    <Route path="/admin/*" element={<App />} />
                    {/* Catch-all route for the main app */}
                    <Route path="/*" element={<App />} />
                  </Routes>
                </React.Suspense>
              </BrowserRouter>
            </ToastProvider>
          </CurrencyProvider>
        </AppProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
};

export default RouterWrapper;