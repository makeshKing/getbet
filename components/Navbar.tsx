
import React, { useState, useRef, useEffect } from 'react';
import { User, LayoutDashboard, ShieldCheck, UserCircle, LogOut, ChevronDown, Banknote, Menu, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useCurrency } from '../context/CurrencyContext';
import { Role } from '../types';

interface NavbarProps {
  onNavigate: (page: string) => void;
  activePage: string;
}

export const Navbar: React.FC<NavbarProps> = ({ onNavigate, activePage }) => {
  const { userProfile: user, signOut } = useAuth();
  const { currency, setCurrency, formatMoney } = useCurrency();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleNav = (page: string) => {
    onNavigate(page);
    setIsMenuOpen(false);
    setIsMobileNavOpen(false);
  };

  const navItems = [
    { id: 'home', label: 'Markets' },
    { id: 'portfolio', label: 'Portfolio' },
    { id: 'leaderboard', label: 'Activity' }
  ];

  return (
    <>
    <nav className="border-b border-theme-border bg-theme-bg-nav backdrop-blur-xl sticky top-0 z-50 transition-all duration-500">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-14 md:h-16">

          {/* Logo & Desktop Links */}
          <div className="flex items-center gap-8">
            <div
              className="flex-shrink-0 flex items-center cursor-pointer group"
              onClick={() => onNavigate(user?.role === Role.STAFF ? 'staff-requests' : 'home')}
            >
              <span className="font-bold text-lg sm:text-xl tracking-tight text-theme-text-primary">Oddara</span>
            </div>

            {user?.role !== Role.STAFF && (
              <div className="hidden md:flex space-x-1">
                {navItems.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => onNavigate(item.id)}
                    className={`px-5 py-2.5 rounded-full text-sm font-bold transition-all duration-300 relative group overflow-hidden ${activePage === item.id || (item.id === 'home' && activePage.startsWith('market'))
                      ? 'bg-theme-bg-surface-2 text-theme-text-primary border border-theme-border shadow-lg scale-105'
                      : 'text-theme-text-secondary hover:text-theme-text-primary hover:bg-theme-bg-surface-2'
                      }`}
                  >
                    <span className="relative z-10">{item.label}</span>
                  </button>
                ))}
              </div>
            )}

            {/* Mobile Hamburger Button Removed */}
          </div>

          {/* Right Actions */}
          <div className="flex items-center space-x-2 sm:space-x-5">
            {user?.role !== Role.STAFF && (
              <button
                onClick={() => setCurrency(currency === 'NPR' ? 'USD' : 'NPR')}
                className="p-2.5 text-xs font-black uppercase tracking-widest text-theme-text-secondary hover:text-theme-info transition-all duration-300 hover:bg-theme-bg-surface-2 rounded-xl active:scale-90"
                title="Toggle Currency"
              >
                {currency}
              </button>
            )}

            {user ? (
              <>
                {/* Balance Pill */}
                {user.role !== Role.STAFF && (
                  <div className="flex items-center bg-theme-bg-surface border border-theme-border/50 backdrop-blur-md rounded-full pl-4 pr-1.5 py-1.5 shadow-sm group hover:border-emerald-500 transition-all duration-500 cursor-default">
                    <span className="text-xs sm:text-sm font-bold text-theme-text-primary mr-2 sm:mr-4 tabular-nums tracking-tight">
                      {formatMoney(user.balance)}
                    </span>
                    <button className="bg-theme-accent hover:opacity-90 text-theme-text-primary rounded-full p-1.5 transition-all shadow-md active:scale-90">
                      <Banknote size={14} strokeWidth={3} />
                    </button>
                  </div>
                )}

                {/* User Dropdown */}
                <div className="relative" ref={menuRef}>
                  <div
                    className={`flex items-center gap-2 cursor-pointer transition-all duration-300 p-1 rounded-2xl ${isMenuOpen ? 'bg-theme-bg-surface-2' : 'hover:bg-theme-bg-surface-2'}`}
                    onClick={() => setIsMenuOpen(!isMenuOpen)}
                  >
                    <div className="h-9 w-9 rounded-full bg-theme-bg-surface border-2 border-theme-border shadow-sm flex items-center justify-center overflow-hidden">
                      {user.avatarUrl ? <img src={user.avatarUrl} alt="User" className="w-full h-full object-cover" /> : <User size={18} className="text-indigo-600" />}
                    </div>
                    <ChevronDown size={14} className={`text-theme-text-muted hidden sm:block transition-transform duration-300 ${isMenuOpen ? 'rotate-180' : ''}`} />
                  </div>

                  {isMenuOpen && (
                    <div className="absolute right-0 top-14 w-64 bg-theme-bg-surface rounded-2xl shadow-xl border border-theme-border py-2.5 z-50 animate-in fade-in zoom-in-95 duration-300 origin-top-right">
                      <div className="px-5 py-4 border-b border-theme-border mb-2">
                        <p className="text-sm font-bold text-theme-text-primary truncate">{user.name}</p>
                        <p className="text-xs text-theme-text-secondary truncate mt-0.5">{user.email}</p>
                      </div>

                      {user.role === Role.ADMIN && (
                        <button
                          onClick={() => handleNav('admin-home')}
                          className="w-full text-left px-5 py-3 text-sm font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-theme-bg-surface hover:text-indigo-600 flex items-center transition-all duration-200"
                        >
                          <ShieldCheck size={18} className="mr-3.5 text-indigo-500" /> Admin Dashboard
                        </button>
                      )}

                      {(user.role === Role.ADMIN || user.role === Role.STAFF) && (
                        <button
                          onClick={() => handleNav('staff-requests')}
                          className="w-full text-left px-5 py-3 text-sm font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-theme-bg-surface hover:text-indigo-600 flex items-center transition-all duration-200"
                        >
                          <LayoutDashboard size={18} className="mr-3.5 text-theme-accent" /> Staff Dashboard
                        </button>
                      )}

                      {user.role !== Role.STAFF && (
                        <button
                          onClick={() => handleNav('profile')}
                          className="w-full text-left px-5 py-3 text-sm font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-theme-bg-surface hover:text-indigo-600 flex items-center transition-all duration-200"
                        >
                          <UserCircle size={18} className="mr-3.5 text-slate-400" /> My Profile
                        </button>
                      )}

                      <div className="border-t border-slate-100 dark:border-slate-800 mt-2 pt-2">
                        <button
                          onClick={() => {
                            signOut();
                            setIsMenuOpen(false);
                            onNavigate('login');
                          }}
                          className="w-full text-left px-5 py-3 text-sm font-bold text-red-600 hover:bg-red-50 flex items-center transition-all duration-200"
                        >
                          <LogOut size={18} className="mr-3.5" /> Sign Out
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="flex items-center gap-3">
                <button
                  onClick={() => onNavigate('login')}
                  className="px-5 py-2.5 rounded-xl text-sm font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-theme-bg-surface transition-all"
                >
                  Log In
                </button>
                <button
                  onClick={() => onNavigate('signup')}
                  className="px-5 py-2.5 rounded-xl text-sm font-bold bg-theme-accent text-theme-text-primary hover:opacity-90 shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/40 transition-all active:scale-95"
                >
                  Sign Up
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>

    {/* Mobile Navigation Drawer */}
    {isMobileNavOpen && (
      <div className="md:hidden fixed inset-0 top-14 z-40 bg-black/50 backdrop-blur-sm" onClick={() => setIsMobileNavOpen(false)}>
        <div 
          className="bg-theme-bg-surface border-b border-theme-border shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="px-4 py-3 space-y-1">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => handleNav(item.id)}
                className={`w-full text-left px-4 py-3 rounded-xl text-sm font-bold transition-all ${
                  activePage === item.id || (item.id === 'home' && activePage.startsWith('market'))
                    ? 'bg-theme-accent/10 text-theme-info'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-theme-bg-surface'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    )}
    </>
  );
};
