
import React, { useState, useEffect } from 'react';
import { Navbar } from '../components/Navbar';
import { MarketList } from '../pages/MarketList';
import { MarketDetail } from '../pages/MarketDetail';
import { Portfolio } from '../pages/Portfolio';
import { Profile } from '../pages/Profile';
import { AdminLayout } from '../components/admin/AdminLayout';
import { AdminDashboard } from '../pages/admin/Dashboard';
import { AdminUsers } from '../pages/admin/Users';
import { AdminMarkets } from '../pages/admin/Markets';
import { AdminMarketCreate } from '../pages/admin/MarketCreate';
import { AdminSettings } from '../pages/admin/Settings';
import { AdminWithdrawalQueue } from '../components/AdminWithdrawalQueue';
import { QuizPage } from '../pages/QuizPage';
import { AdminQuizList } from '../pages/admin/QuizList';
import { AdminQuizCreate } from '../pages/admin/QuizCreate';
import { AdminDeclaredMarkets } from '../pages/admin/DeclaredMarkets';
import { AdminMarketResolution } from '../pages/admin/MarketResolution';
import { ToastProvider } from '../components/ui/Toast';
import { ErrorBoundary } from '../components/ErrorBoundary';

// Extended Router State
type View = 
    | 'home' | 'market-detail' | 'portfolio' | 'leaderboard' | 'profile' | 'quiz'
    | 'admin-dashboard' | 'admin-users' | 'admin-markets' | 'admin-market-create' | 'admin-withdrawals' | 'admin-settings'
    | 'admin-quizzes' | 'admin-quiz-create' | 'admin-declared-markets' | 'admin-resolve-market';

function App() {
  const [currentView, setCurrentView] = useState<View>('home');
  const [selectedMarketId, setSelectedMarketId] = useState<string | null>(null);
  const [adminResolutionMarketId, setAdminResolutionMarketId] = useState<string | null>(null);
  const [isDarkMode, setIsDarkMode] = useState(false);

  useEffect(() => {
    // Check local storage
    if (localStorage.theme === 'dark') {
      setIsDarkMode(true);
      document.documentElement.classList.add('dark');
    } else {
      setIsDarkMode(false);
      document.documentElement.classList.remove('dark');
    }
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
    // Basic Routing Map
    if (page === 'home') { setCurrentView('home'); setSelectedMarketId(null); }
    else if (page === 'portfolio') setCurrentView('portfolio');
    else if (page === 'profile') setCurrentView('profile');
    else if (page === 'leaderboard') setCurrentView('leaderboard');
    else if (page === 'quiz') setCurrentView('quiz');
    else if (page === 'admin') setCurrentView('admin-dashboard');
    // Admin Sub-routes
    else if (page.startsWith('admin-')) setCurrentView(page as View);
  };

  const openMarket = (id: string) => {
    setSelectedMarketId(id);
    setCurrentView('market-detail');
  };

  const openAdminResolution = (id: string) => {
    setAdminResolutionMarketId(id);
    setCurrentView('admin-resolve-market');
  };

  return (
    <ErrorBoundary>
      <ToastProvider>
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 font-sans text-slate-900 dark:text-slate-100 transition-colors duration-200">
          <Navbar onNavigate={navigate} activePage={currentView} isDarkMode={isDarkMode} toggleTheme={toggleTheme} />
          
          <main>
            {currentView === 'home' && <MarketList onMarketClick={openMarket} />}
            {currentView === 'market-detail' && selectedMarketId && <MarketDetail marketId={selectedMarketId} onBack={() => navigate('home')} onMarketClick={openMarket} />}
            {currentView === 'portfolio' && <Portfolio />}
            {currentView === 'profile' && <Profile />}
            {currentView === 'quiz' && <QuizPage />}
            {currentView === 'leaderboard' && (
                <div className="flex flex-col items-center justify-center pt-20 px-4 text-center">
                    <div className="bg-white dark:bg-slate-800 p-8 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 max-w-md">
                        <h2 className="text-2xl font-bold mb-4">Coming Soon</h2>
                        <p className="text-slate-500 dark:text-slate-400 mb-6">The Leaderboard feature is part of the roadmap.</p>
                        <button onClick={() => navigate('home')} className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 font-medium">Return Home</button>
                    </div>
                </div>
            )}

            {/* Admin Routes wrapped in Layout */}
            {currentView.startsWith('admin-') && (
                <AdminLayout activeView={currentView} onNavigate={navigate}>
                    {currentView === 'admin-dashboard' && <AdminDashboard onNavigate={navigate} />}
                    {currentView === 'admin-users' && <AdminUsers />}
                    {currentView === 'admin-markets' && <AdminMarkets onNavigate={navigate} />}
                    {currentView === 'admin-market-create' && <AdminMarketCreate onBack={() => navigate('admin-markets')} />}
                    {currentView === 'admin-withdrawals' && (
                        <div className="space-y-4">
                            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Withdrawal Requests</h1>
                            <AdminWithdrawalQueue />
                        </div>
                    )}
                    {currentView === 'admin-settings' && <AdminSettings />}
                    {currentView === 'admin-quizzes' && <AdminQuizList onNavigate={navigate} />}
                    {currentView === 'admin-quiz-create' && <AdminQuizCreate onBack={() => navigate('admin-quizzes')} />}
                    {currentView === 'admin-declared-markets' && <AdminDeclaredMarkets onResolveClick={openAdminResolution} />}
                    {currentView === 'admin-resolve-market' && adminResolutionMarketId && (
                        <AdminMarketResolution 
                            marketId={adminResolutionMarketId} 
                            onBack={() => navigate('admin-declared-markets')} 
                        />
                    )}
                </AdminLayout>
            )}
          </main>
        </div>
      </ToastProvider>
    </ErrorBoundary>
  );
}

export default App;
