import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Transactions from './pages/Transactions';
import Investments from './pages/Investments';
import Advisor from './pages/Advisor';
import { BalanceProvider } from './context/BalanceContext';

function App() {
  return (
    <BalanceProvider>
      <Router>
        <Layout>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/transactions" element={<Transactions />} />
            <Route path="/investments" element={<Investments />} />
            <Route path="/advisor" element={<Advisor />} />
          </Routes>
        </Layout>
      </Router>
    </BalanceProvider>
  );
}

export default App;
