import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Transactions from './pages/Transactions';
import Investments from './pages/Investments';
import Advisor from './pages/Advisor';
import Report from './pages/Report';
import { BalanceProvider } from './context/BalanceContext';
import { ThemeProvider } from './context/ThemeContext';

function App() {
  return (
    <ThemeProvider>
      <BalanceProvider>
        <Router>
        <Layout>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/transactions" element={<Transactions />} />
            <Route path="/investments" element={<Investments />} />
            <Route path="/advisor" element={<Advisor />} />
            <Route path="/report" element={<Report />} />
          </Routes>
        </Layout>
      </Router>
    </BalanceProvider>
    </ThemeProvider>
  );
}

export default App;
