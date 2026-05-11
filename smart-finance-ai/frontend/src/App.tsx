import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Transactions from './pages/Transactions';
import Investments from './pages/Investments';
import Advisor from './pages/Advisor';
import Report from './pages/Report';
import Login from './pages/Login';
import { BalanceProvider } from './context/BalanceContext';
import { ThemeProvider } from './context/ThemeContext';
import { useAuth } from './context/AuthContext';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  
  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900"><div className="w-8 h-8 border-4 border-sky-200 border-t-sky-500 rounded-full animate-spin"></div></div>;
  }
  
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  
  return children;
}

function App() {
  return (
    <ThemeProvider>
      <BalanceProvider>
        <Router>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="*" element={
              <ProtectedRoute>
                <Layout>
                  <Routes>
                    <Route path="/" element={<Dashboard />} />
                    <Route path="/transactions" element={<Transactions />} />
                    <Route path="/investments" element={<Investments />} />
                    <Route path="/advisor" element={<Advisor />} />
                    <Route path="/report" element={<Report />} />
                  </Routes>
                </Layout>
              </ProtectedRoute>
            } />
          </Routes>
        </Router>
    </BalanceProvider>
    </ThemeProvider>
  );
}

export default App;
