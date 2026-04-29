import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, ReceiptText, Sparkles, Wallet, TrendingUp, Eye, EyeOff, FileText } from 'lucide-react';
import { motion } from 'framer-motion';
import { useBalance } from '../context/BalanceContext';

const NAV_ITEMS = [
  { path: '/', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/transactions', label: 'Transactions', icon: ReceiptText },
  { path: '/investments', label: 'Investments', icon: TrendingUp },
  { path: '/report', label: 'Laporan', icon: FileText },
  { path: '/advisor', label: 'AI Advisor', icon: Sparkles },
];

export default function Layout({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const { isBalanceHidden, toggleBalance } = useBalance();

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      {/* Sidebar for Desktop/Tablet */}
      <aside className="w-64 bg-white border-r border-slate-200 flex-col hidden md:flex z-10">
        <div className="p-6 flex items-center justify-between border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="bg-sky-100 p-2 rounded-xl text-sky-600">
              <Wallet size={24} />
            </div>
            <h1 className="font-bold tracking-tight text-xl text-slate-800">
              FineFinance
            </h1>
          </div>
          <button onClick={toggleBalance} className="text-slate-400 hover:text-slate-600 transition-colors">
            {isBalanceHidden ? <EyeOff size={20} /> : <Eye size={20} />}
          </button>
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
                    className="absolute inset-0 bg-sky-50 rounded-xl"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.2 }}
                  />
                )}
                <div className={`relative px-4 py-3 flex items-center gap-3 rounded-xl transition-colors ${isActive ? 'text-sky-600' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50/50'}`}>
                  <Icon size={20} />
                  <span className="font-medium">{item.label}</span>
                </div>
              </Link>
            );
          })}
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto w-full pb-20 md:pb-0">
        <div className="h-full flex flex-col relative max-w-7xl mx-auto w-full">
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-8">
            {children}
          </div>
        </div>
      </main>

      {/* Mobile Bottom Navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 flex justify-around items-center h-16 z-50 px-2 safe-area-pb">
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
              <div className={`flex flex-col items-center ${isActive ? 'text-sky-600' : 'text-slate-400'}`}>
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
