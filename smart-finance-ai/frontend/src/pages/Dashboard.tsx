import { useEffect, useState } from 'react';
import axios from 'axios';
import { motion } from 'framer-motion';
import { ArrowDownRight, ArrowUpRight, Wallet, TrendingUp } from 'lucide-react';
import { Tooltip, ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend } from 'recharts';
import { useBalance } from '../context/BalanceContext';

const API_URL = import.meta.env.VITE_API_URL || 'https://aplikasikeuangan-lemon.vercel.app/api';
const COLORS = ['#38bdf8', '#10b981', '#f43f5e', '#8b5cf6', '#f59e0b', '#06b6d4', '#ec4899'];

interface Transaction {
  id: string;
  amount: number;
  type: string;
  category: string;
  description: string;
  date: string;
}

interface Investment {
  id: string;
  category: string;
  currentValue: number;
}

export default function Dashboard() {
  const { formatCurrencyMasked } = useBalance();
  const [summary, setSummary] = useState({ 
    totalIncome: 0, 
    totalExpense: 0, 
    balance: 0,
    totalInvestmentValue: 0,
    gabunganAset: 0 
  });
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [investments, setInvestments] = useState<Investment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [sumRes, txRes, invRes] = await Promise.all([
          axios.get(`${API_URL}/summary`),
          axios.get(`${API_URL}/transactions`),
          axios.get(`${API_URL}/investments`)
        ]);
        setSummary(sumRes.data);
        setTransactions(txRes.data);
        setInvestments(invRes.data);
      } catch (error) {
        console.error("Error fetching data", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const formatCurrency = formatCurrencyMasked;

  // 1. Expense Data (Pie)
  const totalExpense = summary.totalExpense || 1; 
  const expenseData = transactions
    .filter(t => t.type === 'EXPENSE')
    .reduce<{name: string; value: number}[]>((acc, curr) => {
      const existing = acc.find(item => item.name === curr.category);
      if (existing) existing.value += curr.amount;
      else acc.push({ name: curr.category, value: curr.amount });
      return acc;
    }, [])
    .map(item => ({ ...item, percentage: ((item.value / totalExpense) * 100).toFixed(1) }));

  // 2. Income Data (Bar)
  const incomeData = transactions
    .filter(t => t.type === 'INCOME')
    .reduce<{name: string; value: number}[]>((acc, curr) => {
      const existing = acc.find(item => item.name === curr.category);
      if (existing) existing.value += curr.amount;
      else acc.push({ name: curr.category, value: curr.amount });
      return acc;
    }, []);

  // 3. Investment Data (Donut)
  const totalInvestment = summary.totalInvestmentValue || 1;
  const investmentData = investments.reduce<{name: string; value: number}[]>((acc, curr) => {
    const existing = acc.find(item => item.name === curr.category);
    if (existing) existing.value += curr.currentValue;
    else acc.push({ name: curr.category, value: curr.currentValue });
    return acc;
  }, [])
  .map(item => ({ ...item, percentage: ((item.value / totalInvestment) * 100).toFixed(1) }));

  // 4. Asset Composition (Bar)
  const assetData = [
    { name: 'Saldo Kas', value: Math.max(0, summary.balance) }, // Avoid negative bars if possible
    { name: 'Aset Investasi', value: summary.totalInvestmentValue }
  ];

  if (loading) return <div className="flex h-full items-center justify-center"><div className="animate-pulse text-sky-500">Loading...</div></div>;

  return (
    <div className="space-y-6 pb-12">
      <div className="pb-4 border-b border-slate-200">
        <h1 className="text-3xl font-bold text-slate-800">Financial KPI Dashboard</h1>
        <p className="text-slate-500 mt-1">Overview of your combined assets, income, and expenses.</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <motion.div initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="glass-panel p-6 border-sky-200 bg-sky-50/30">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sky-600 font-medium mb-1">Gabungan Aset</p>
              <h2 className="text-2xl font-bold text-slate-800">{formatCurrency(summary.gabunganAset)}</h2>
              <p className="text-xs text-slate-500 mt-2">Saldo + Investasi + Deviden</p>
            </div>
            <div className="p-3 bg-sky-100 rounded-xl text-sky-600">
              <Wallet size={24} />
            </div>
          </div>
        </motion.div>

        <motion.div initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.1 }} className="glass-panel p-6 border-emerald-200 bg-emerald-50/30">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-emerald-600 font-medium mb-1">Total Pendapatan</p>
              <h2 className="text-2xl font-bold text-slate-800">{formatCurrency(summary.totalIncome)}</h2>
            </div>
            <div className="p-3 bg-emerald-100 rounded-xl text-emerald-600">
              <ArrowUpRight size={24} />
            </div>
          </div>
        </motion.div>

        <motion.div initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.2 }} className="glass-panel p-6 border-rose-200 bg-rose-50/30">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-rose-600 font-medium mb-1">Total Pengeluaran</p>
              <h2 className="text-2xl font-bold text-slate-800">{formatCurrency(summary.totalExpense)}</h2>
            </div>
            <div className="p-3 bg-rose-100 rounded-xl text-rose-600">
              <ArrowDownRight size={24} />
            </div>
          </div>
        </motion.div>

        <motion.div initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.3 }} className="glass-panel p-6 border-violet-200 bg-violet-50/30">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-violet-600 font-medium mb-1">Aset Investasi</p>
              <h2 className="text-2xl font-bold text-slate-800">{formatCurrency(summary.totalInvestmentValue)}</h2>
            </div>
            <div className="p-3 bg-violet-100 rounded-xl text-violet-600">
              <TrendingUp size={24} />
            </div>
          </div>
        </motion.div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* 1. Investment Allocation */}
        <div className="glass-panel p-6">
          <h3 className="text-lg font-bold text-slate-800 mb-6 border-b border-slate-100 pb-2">1. Investment Allocation</h3>
          <div className="h-[250px] flex items-center justify-center">
            {investmentData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={investmentData}
                    cx="50%"
                    cy="50%"
                    innerRadius={70}
                    outerRadius={100}
                    paddingAngle={3}
                    dataKey="value"
                    stroke="none"
                  >
                    {investmentData.map((_entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: any) => formatCurrency(value)} contentStyle={{ borderRadius: '8px' }} />
                  <Legend verticalAlign="bottom" height={36} wrapperStyle={{ fontSize: '12px' }} />
                </PieChart>
              </ResponsiveContainer>
            ) : <div className="text-slate-400">No investment data</div>}
          </div>
        </div>

        {/* 2. Total Assets Breakdown */}
        <div className="glass-panel p-6">
          <h3 className="text-lg font-bold text-slate-800 mb-6 border-b border-slate-100 pb-2">2. Total Assets Breakdown</h3>
          <div className="h-[250px] flex items-center justify-center">
             <ResponsiveContainer width="100%" height="100%">
              <BarChart data={assetData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="name" tick={{ fill: '#64748b' }} axisLine={false} tickLine={false} />
                <YAxis tickFormatter={(val) => `Rp ${val / 1000000}M`} tick={{ fill: '#64748b' }} axisLine={false} tickLine={false} />
                <Tooltip formatter={(value: any) => formatCurrency(value)} cursor={{ fill: '#f1f5f9' }} contentStyle={{ borderRadius: '8px' }} />
                <Bar dataKey="value" fill="#38bdf8" radius={[4, 4, 0, 0]}>
                  {assetData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.name === 'Saldo Kas' ? '#10b981' : '#8b5cf6'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* 3. Expense Analysis */}
        <div className="glass-panel p-6">
          <h3 className="text-lg font-bold text-slate-800 mb-6 border-b border-slate-100 pb-2">3. Expense Analysis</h3>
          <div className="h-[250px] flex items-center justify-center">
            {expenseData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={expenseData}
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    dataKey="value"
                    stroke="white"
                    strokeWidth={2}
                  >
                    {expenseData.map((_entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[(index + 3) % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: any) => formatCurrency(value)} contentStyle={{ borderRadius: '8px' }} />
                  <Legend verticalAlign="bottom" height={36} wrapperStyle={{ fontSize: '12px' }} />
                </PieChart>
              </ResponsiveContainer>
            ) : <div className="text-slate-400">No expense data</div>}
          </div>
        </div>

        {/* 4. Income Analysis */}
        <div className="glass-panel p-6">
          <h3 className="text-lg font-bold text-slate-800 mb-6 border-b border-slate-100 pb-2">4. Income Analysis</h3>
          <div className="h-[250px] flex items-center justify-center">
            {incomeData.length > 0 ? (
               <ResponsiveContainer width="100%" height="100%">
                <BarChart data={incomeData} layout="vertical" margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
                  <XAxis type="number" tickFormatter={(val) => `Rp ${val / 1000000}M`} tick={{ fill: '#64748b' }} axisLine={false} tickLine={false} />
                  <YAxis dataKey="name" type="category" tick={{ fill: '#64748b', fontSize: 12 }} axisLine={false} tickLine={false} width={80} />
                  <Tooltip formatter={(value: any) => formatCurrency(value)} cursor={{ fill: '#f1f5f9' }} contentStyle={{ borderRadius: '8px' }} />
                  <Bar dataKey="value" fill="#10b981" radius={[0, 4, 4, 0]} barSize={30} />
                </BarChart>
              </ResponsiveContainer>
            ) : <div className="text-slate-400">No income data</div>}
          </div>
        </div>

      </div>
    </div>
  );
}
