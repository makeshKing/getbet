
import React from 'react';
import { LayoutDashboard, Briefcase, UserCircle } from 'lucide-react';

interface MobileBottomNavProps {
  onNavigate: (page: string) => void;
  activePage: string;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({ onNavigate, activePage }) => {
  const navItems = [
    { id: 'home', label: 'Markets', icon: LayoutDashboard },
    { id: 'portfolio', label: 'Portfolio', icon: Briefcase },
    { id: 'profile', label: 'Profile', icon: UserCircle }
  ];

  return (
    <div id="mobile-bottom-nav" className="md:hidden fixed bottom-0 left-0 right-0 z-30 pb-[env(safe-area-inset-bottom)] bg-white/80 dark:bg-[#070b14]/90 backdrop-blur-2xl border-t border-slate-200/50 dark:border-white/5 shadow-[0_-8px_40px_rgba(0,0,0,0.12)]">
      <div className="flex justify-around items-center h-16 sm:h-20 px-6">
        {navItems.map((item) => {
          const isActive = activePage === item.id || (item.id === 'home' && activePage.startsWith('market'));
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={`flex flex-col items-center justify-center flex-1 transition-all duration-300 active-scale group ${
                isActive 
                  ? 'text-indigo-600 dark:text-indigo-400' 
                  : 'text-slate-400 dark:text-slate-600'
              }`}
            >
              <div className={`p-2 rounded-2xl transition-all duration-300 transform ${isActive ? 'bg-indigo-600/10 dark:bg-indigo-400/10 -translate-y-1' : 'group-hover:translate-y-[-2px]'}`}>
                <item.icon size={22} strokeWidth={isActive ? 2.5 : 2} />
              </div>
              <span className={`text-[9px] font-black uppercase tracking-[0.2em] mt-1 transition-all ${isActive ? 'opacity-100 scale-100' : 'opacity-40 scale-90'}`}>
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
