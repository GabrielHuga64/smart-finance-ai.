import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, ReceiptText, Sparkles, Wallet, TrendingUp, Eye, EyeOff, FileText, Moon, Sun } from 'lucide-react';
import { motion } from 'framer-motion';
import { useBalance } from '../context/BalanceContext';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { LogOut } from 'lucide-react';

const NAV_ITEMS = [
  { path: '/', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/transactions', label: 'Transactions', icon: ReceiptText },
  { path: '/investments', label: 'Investments', icon: TrendingUp },
  { path: '/report', label: 'Laporan', icon: FileText },
  { path: '/advisor', label: 'AI Advisor', icon: Sparkles },
];

export default function Layout({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const { visibilityState, toggleBalance } = useBalance();
  const { theme, toggleTheme } = useTheme();
  const { logout, user } = useAuth();

  return (
    <div className="flex h-screen bg-slate-50 dark:bg-slate-900 transition-colors duration-200 overflow-hidden">
      {/* Sidebar for Desktop/Tablet */}
      <aside className="w-64 bg-white dark:bg-slate-800 border-r border-slate-200 dark:border-slate-700 flex-col hidden md:flex z-10 transition-colors">
        <div className="p-6 flex items-center justify-between border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="bg-sky-100 dark:bg-sky-900/40 p-2 rounded-xl text-sky-600 dark:text-sky-400">
              <Wallet size={24} />
            </div>
            <h1 className="font-bold tracking-tight text-xl text-slate-800 dark:text-slate-100">
              FineFinance
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={toggleTheme} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors">
              {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
            </button>
            <button onClick={toggleBalance} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors relative" title={visibilityState === 0 ? "Mask >50M" : visibilityState === 1 ? "Mask All" : "Show All"}>
              {visibilityState === 0 && <><Eye size={20} className="opacity-50" /><span className="absolute -top-1 -right-1 text-[10px] font-bold text-sky-500">*</span></>}
              {visibilityState === 1 && <EyeOff size={20} />}
              {visibilityState === 2 && <Eye size={20} />}
            </button>
          </div>
        </div>
        
        <nav className="flex-1 px-4 py-6 space-y-2">
          {NAV_ITEMS.map((item) => {
            const isActive = location.pathname === item.path;
            const Icon = item.icon;
            
            return (
              <Link key={item.path} to={item.path} className="block relative">
                {isActive && (
                  <motion.div
                    layoutId="active-nav"
                    className="absolute inset-0 bg-sky-50 dark:bg-sky-900/20 rounded-xl"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.2 }}
                  />
                )}
                <div className={`relative px-4 py-3 flex items-center gap-3 rounded-xl transition-colors ${isActive ? 'text-sky-600 dark:text-sky-400' : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-50/50 dark:hover:bg-slate-700/50'}`}>
                  <Icon size={20} />
                  <span className="font-medium">{item.label}</span>
                </div>
              </Link>
            );
          })}
        </nav>
        <div className="p-4 border-t border-slate-100 dark:border-slate-700">
          <div className="flex items-center gap-3 mb-4 px-2">
            {user?.picture ? (
              <img src={user.picture} alt="Profile" className="w-8 h-8 rounded-full border border-slate-200 dark:border-slate-600" />
            ) : (
              <div className="w-8 h-8 rounded-full bg-sky-100 dark:bg-sky-900 flex items-center justify-center text-sky-600 dark:text-sky-400 font-bold">
                {user?.name?.[0] || 'U'}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-slate-800 dark:text-slate-200 truncate">{user?.name}</p>
            </div>
          </div>
          <button onClick={logout} className="w-full flex items-center gap-2 justify-center px-4 py-2 text-sm text-rose-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/30 rounded-xl transition-colors">
            <LogOut size={18} />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* Mobile Top Navigation Additions (Theme Toggle) */}
      <div className="md:hidden fixed top-0 left-0 right-0 h-14 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 z-50 flex items-center justify-between px-4">
        <h1 className="font-bold text-lg text-slate-800 dark:text-slate-100 flex items-center gap-2">
          <Wallet size={20} className="text-sky-500" /> FineFinance
        </h1>
        <div className="flex items-center gap-4">
          <button onClick={toggleTheme} className="text-slate-500 dark:text-slate-400">
            {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
          </button>
          <button onClick={toggleBalance} className="text-slate-500 dark:text-slate-400 relative" title={visibilityState === 0 ? "Mask >50M" : visibilityState === 1 ? "Mask All" : "Show All"}>
            {visibilityState === 0 && <><Eye size={20} className="opacity-50" /><span className="absolute -top-1 -right-1 text-[10px] font-bold text-sky-500">*</span></>}
            {visibilityState === 1 && <EyeOff size={20} />}
            {visibilityState === 2 && <Eye size={20} />}
          </button>
          <button onClick={logout} className="text-rose-500 hover:text-rose-600 dark:hover:text-rose-400" title="Logout">
            <LogOut size={20} />
          </button>
        </div>
      </div>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto w-full pb-20 md:pb-0 pt-14 md:pt-0">
        <div className="h-full flex flex-col relative max-w-7xl mx-auto w-full">
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-8">
            {children}
          </div>
        </div>
      </main>

      {/* Mobile Bottom Navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 flex justify-around items-center h-16 z-50 px-2 safe-area-pb transition-colors">
        {NAV_ITEMS.map((item) => {
          const isActive = location.pathname === item.path;
          const Icon = item.icon;
          
          return (
            <Link key={item.path} to={item.path} className="flex flex-col items-center justify-center w-full h-full relative">
              {isActive && (
                <motion.div
                  layoutId="mobile-active-nav"
                  className="absolute -top-1 w-8 h-1 bg-sky-500 rounded-b-md"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.2 }}
                />
              )}
              <div className={`flex flex-col items-center ${isActive ? 'text-sky-600 dark:text-sky-400' : 'text-slate-400 dark:text-slate-500'}`}>
                <Icon size={20} className="mb-1" />
                <span className="text-[10px] font-medium">{item.label}</span>
              </div>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
