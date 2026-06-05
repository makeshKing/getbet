
import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Navbar } from './components/Navbar';
import { MobileBottomNav } from './components/MobileBottomNav';
import { MarketList } from './pages/MarketList';
import { MarketDetail } from './pages/MarketDetail';
import { Portfolio } from './pages/Portfolio';
import { Profile } from './pages/Profile';
import { AdminLayout } from './components/admin/AdminLayout';
import { AdminDashboard } from './pages/admin/Dashboard';
import { AdminHome } from './pages/admin/Home';
import { AdminUsers } from './pages/admin/Users';
import { AdminMarkets } from './pages/admin/Markets';
import { AdminMarketCreate } from './pages/admin/MarketCreate';
import { AdminSettings } from './pages/admin/Settings';
import { AdminWithdrawalQueue } from './components/AdminWithdrawalQueue';
import { AdminDepositQueue } from './components/AdminDepositQueue';
import { AdminDeclaredMarkets } from './pages/admin/DeclaredMarkets';
import { AdminMarketResolution } from './pages/admin/MarketResolution';
import { AdminFinancialReports } from './pages/admin/FinancialReports';
import { AdminLogin } from './pages/admin/Login';
import { Login } from './pages/auth/Login';
import { Signup } from './pages/auth/Signup';
import { useAuth } from './context/AuthContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: 'USER' | 'ADMIN';
  fallback?: React.ReactNode;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  requiredRole = 'USER',
  fallback = (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-950 p-4">
      <div className="text-center max-w-md">
        <h1 className="text-4xl font-bold text-slate-900 dark:text-white mb-4">Access Denied</h1>
        <p className="text-slate-500 dark:text-slate-400 mb-6">You need admin privileges to access this area.</p>
        <button
          onClick={() => window.location.href = '/'}
          className="px-6 py-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors font-bold"
        >
          Return to Home
        </button>
      </div>
    </div>
  )
}) => {
  const { userProfile: user, loading } = useAuth();

  // While auth state is being determined, show a spinner — never flash a 401
  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-950">
        <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    // User not authenticated — redirect to appropriate login
    const isAdminRoute = requiredRole === 'ADMIN';
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-950 p-4">
        <div className="text-center max-w-md">
          <h1 className="text-4xl font-bold text-slate-900 dark:text-white mb-4">401</h1>
          <p className="text-slate-500 dark:text-slate-400 mb-6">Authentication required. Please log in.</p>
          <button
            onClick={() => window.location.href = isAdminRoute ? '/admin/login' : '/login'}
            className="px-6 py-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors font-bold"
          >
            {isAdminRoute ? 'Go to Admin Login' : 'Go to Login'}
          </button>
        </div>
      </div>
    );
  }

  if (requiredRole === 'ADMIN' && user.role !== 'ADMIN') {
    // User doesn't have admin role
    return fallback;
  }

  // User has required role, render children
  return <>{children}</>;
};

type View =
  | 'home' | 'market-detail' | 'portfolio' | 'leaderboard' | 'profile' | 'login' | 'signup'
  | 'admin-home' | 'admin-dashboard' | 'admin-users' | 'admin-markets' | 'admin-market-create' | 'admin-deposits' | 'admin-withdrawals' | 'admin-settings'
  | 'admin-declared-markets' | 'admin-resolve-market' | 'admin-financials';

function App() {
  const { userProfile, isAdmin } = useAuth();
  const navigateRouter = useNavigate();
  const location = useLocation();
  const [currentView, setCurrentView] = useState<View>(() => {
    const path = window.location.pathname;

    if (path === '/admin/dashboard') {
      return 'admin-dashboard';
    } else if (path === '/admin' || path === '/admin/home') {
      return 'admin-home';
    } else if (path === '/admin/users') {
      return 'admin-users';
    } else if (path === '/admin/markets') {
      return 'admin-markets';
    } else if (path === '/admin/market/create') {
      return 'admin-market-create';
    } else if (path === '/admin/deposits') {
      return 'admin-deposits';
    } else if (path === '/admin/withdrawals') {
      return 'admin-withdrawals';
    } else if (path === '/admin/settings') {
      return 'admin-settings';
    } else if (path === '/admin/declared-markets') {
      return 'admin-declared-markets';
    } else if (path === '/admin/resolve-market') {
      return 'admin-resolve-market';
    } else if (path === '/admin/financials') {
      return 'admin-financials';
    } else if (path === '/login') {
      return 'login';
    } else if (path === '/register') {
      return 'signup';
    }

    return 'home'; // default
  });
  const [selectedMarketId, setSelectedMarketId] = useState<string | null>(null);
  const [adminResolutionMarketId, setAdminResolutionMarketId] = useState<string | null>(null);
  const [isDarkMode, setIsDarkMode] = useState(false);

  // Sync currentView state with URL location
  useEffect(() => {
    const path = location.pathname;

    if (path === '/') {
      setCurrentView('home');
    } else if (path === '/admin/dashboard') {
      setCurrentView('admin-dashboard');
    } else if (path === '/admin' || path === '/admin/home') {
      setCurrentView('admin-home');
    } else if (path === '/admin/users') {
      setCurrentView('admin-users');
    } else if (path === '/admin/markets') {
      setCurrentView('admin-markets');
    } else if (path === '/admin/market/create') {
      setCurrentView('admin-market-create');
    } else if (path === '/admin/deposits') {
      setCurrentView('admin-deposits');
    } else if (path === '/admin/withdrawals') {
      setCurrentView('admin-withdrawals');
    } else if (path === '/admin/settings') {
      setCurrentView('admin-settings');
    } else if (path === '/admin/declared-markets') {
      setCurrentView('admin-declared-markets');
    } else if (path === '/admin/resolve-market') {
      setCurrentView('admin-resolve-market');
    } else if (path === '/admin/financials') {
      setCurrentView('admin-financials');
    } else if (path === '/login') {
      setCurrentView('login');
    } else if (path === '/register') {
      setCurrentView('signup');
    }
    // Note: /admin/login is handled separately in RouterWrapper
  }, [location]);

  useEffect(() => {
    if (localStorage.theme === 'dark' || (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
      setIsDarkMode(true);
      document.documentElement.classList.add('dark');
    } else {
      setIsDarkMode(false);
      document.documentElement.classList.remove('dark');
    }
  }, []);

  // Test deposit with screenshot on app load
  useEffect(() => {
    console.log('App loaded, testing deposit with screenshot');
    // testDepositWithScreenshot(); // Disabled auto-test to avoid duplicates
  }, []);

  // Add a global function for manual testing
  useEffect(() => {
    // testDeposit and store mocks removed
  }, []);

  const toggleTheme = () => {
    if (isDarkMode) {
      document.documentElement.classList.remove('dark');
      localStorage.theme = 'light';
      setIsDarkMode(false);
    } else {
      document.documentElement.classList.add('dark');
      localStorage.theme = 'dark';
      setIsDarkMode(true);
    }
  };

  const navigate = (page: string) => {
    window.scrollTo({ top: 0, behavior: 'smooth' });

    if (page === 'home') {
      setCurrentView('home');
      setSelectedMarketId(null);
      navigateRouter('/');
    }
    else if (page === 'portfolio') {
      setCurrentView('portfolio');
      navigateRouter('/portfolio');
    }
    else if (page === 'profile') {
      setCurrentView('profile');
      navigateRouter('/profile');
    }
    else if (page === 'leaderboard') {
      setCurrentView('leaderboard');
      navigateRouter('/leaderboard');
    }
    else if (page === 'login') {
      setCurrentView('login');
      navigateRouter('/login');
    }
    else if (page === 'signup') {
      setCurrentView('signup');
      navigateRouter('/register');
    }
    else if (page.startsWith('admin-')) {
      // Check admin access for admin routes
      if (!isAdmin) {
        alert('Admin access required!');
        // Redirect to admin login page
        navigateRouter('/admin/login');
        return;
      } else {
        // Map page to correct URL
        if (page === 'admin-dashboard') {
          navigateRouter('/admin/dashboard');
        } else if (page === 'admin-home') {
          navigateRouter('/admin');
        } else if (page === 'admin-users') {
          navigateRouter('/admin/users');
        } else if (page === 'admin-markets') {
          navigateRouter('/admin/markets');
        } else if (page === 'admin-market-create') {
          navigateRouter('/admin/market/create');
        } else if (page === 'admin-deposits') {
          navigateRouter('/admin/deposits');
        } else if (page === 'admin-withdrawals') {
          navigateRouter('/admin/withdrawals');
        } else if (page === 'admin-settings') {
          navigateRouter('/admin/settings');
        } else if (page === 'admin-declared-markets') {
          navigateRouter('/admin/declared-markets');
        } else if (page === 'admin-resolve-market') {
          navigateRouter('/admin/resolve-market');
        } else if (page === 'admin-financials') {
          navigateRouter('/admin/financials');
        }
      }
    }
  };

  const openMarket = (id: string) => {
    setSelectedMarketId(id);
    setCurrentView('market-detail');
  };

  const openAdminResolution = (id: string) => {
    setAdminResolutionMarketId(id);
    setCurrentView('admin-resolve-market');
  };

  const isAdminView = currentView.startsWith('admin-');

  return (
    <div className="min-h-screen bg-white dark:bg-slate-950 font-sans text-slate-900 dark:text-slate-100 transition-colors duration-500">
      {!['login', 'signup'].includes(currentView) && (
        <Navbar onNavigate={navigate} activePage={currentView} isDarkMode={isDarkMode} toggleTheme={toggleTheme} />
      )}

      <main key={currentView} className={`animate-fade-in-up pb-20 md:pb-0 ${isAdminView || ['login', 'signup'].includes(currentView) ? '' : 'max-w-7xl mx-auto'}`}>
        {currentView === 'home' && <MarketList onMarketClick={openMarket} />}
        {currentView === 'market-detail' && selectedMarketId && <ProtectedRoute requiredRole="USER"><MarketDetail marketId={selectedMarketId} onBack={() => navigate('home')} /></ProtectedRoute>}
        {currentView === 'portfolio' && <ProtectedRoute requiredRole="USER"><Portfolio /></ProtectedRoute>}
        {currentView === 'profile' && <ProtectedRoute requiredRole="USER"><Profile /></ProtectedRoute>}
        {currentView === 'login' && <Login />}
        {currentView === 'signup' && <Signup />}
        {currentView === 'leaderboard' && (
          <div className="flex flex-col items-center justify-center pt-20 px-4 text-center">
            <div className="bg-white dark:bg-slate-800 p-8 rounded-lg shadow-xl border border-slate-200 dark:border-slate-700 max-w-md transition-all">
              <h2 className="text-2xl font-bold mb-4">Coming Soon</h2>
              <p className="text-slate-500 dark:text-slate-400 mb-6">The Leaderboard feature is part of our upcoming roadmap.</p>
              <button onClick={() => navigate('home')} className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 font-bold transition-all hover:translate-x-1">Return Home &rarr;</button>
            </div>
          </div>
        )}

        {currentView.startsWith('admin-') && (
          <ProtectedRoute requiredRole="ADMIN">
            <AdminLayout activeView={currentView} onNavigate={navigate}>
              {currentView === 'admin-home' && <AdminHome onNavigate={navigate} />}
              {currentView === 'admin-dashboard' && <AdminDashboard onNavigate={navigate} />}
              {currentView === 'admin-users' && <AdminUsers />}
              {currentView === 'admin-markets' && <AdminMarkets onNavigate={navigate} />}
              {currentView === 'admin-market-create' && <AdminMarketCreate onBack={() => navigate('admin-markets')} />}
              {currentView === 'admin-deposits' && (
                <div className="space-y-4">
                  <h1 className="text-2xl font-bold text-slate-900 dark:text-white uppercase tracking-tight">Deposit Requests</h1>
                  <AdminDepositQueue />
                </div>
              )}
              {currentView === 'admin-withdrawals' && (
                <div className="space-y-4">
                  <h1 className="text-2xl font-bold text-slate-900 dark:text-white uppercase tracking-tight">Withdrawal Requests</h1>
                  <AdminWithdrawalQueue />
                </div>
              )}
              {currentView === 'admin-settings' && <AdminSettings />}
              {currentView === 'admin-declared-markets' && <AdminDeclaredMarkets onResolveClick={openAdminResolution} />}
              {currentView === 'admin-resolve-market' && adminResolutionMarketId && (
                <AdminMarketResolution
                  marketId={adminResolutionMarketId}
                  onBack={() => navigate('admin-declared-markets')}
                />
              )}
              {currentView === 'admin-financials' && <AdminFinancialReports onNavigate={navigate} />}
            </AdminLayout>
          </ProtectedRoute>
        )}
      </main>

      {!isAdminView && !['login', 'signup'].includes(currentView) && <MobileBottomNav onNavigate={navigate} activePage={currentView} />}
    </div>
  );
}

export default App;
