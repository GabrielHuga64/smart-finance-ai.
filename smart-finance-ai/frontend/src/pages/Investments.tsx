import { useState, useEffect } from 'react';
import axios from 'axios';
import { Plus, Trash2, Edit2, TrendingUp, TrendingDown, Sparkles } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { useBalance } from '../context/BalanceContext';

const API_URL = import.meta.env.VITE_API_URL || '/_/backend/api';
const COLORS = ['#38bdf8', '#10b981', '#f43f5e', '#8b5cf6', '#f59e0b', '#06b6d4', '#ec4899'];

interface InvestmentPurchase {
  id: string;
  quantity: number;
  pricePerUnit: number;
  totalAmount: number;
  date: string;
}

interface InvestmentDividend {
  id: string;
  amount: number;
  date: string;
}

interface Investment {
  id: string;
  name: string;
  category: string;
  investedAmount: number;
  currentValue: number;
  dividends: number;
  quantity?: number;
  unitType?: string;
  averagePrice?: number;
  lastPricePerUnit?: number;
  date: string;
  purchases?: InvestmentPurchase[];
  dividendRecords?: InvestmentDividend[];
}

export default function Investments() {
  const { formatCurrencyMasked } = useBalance();
  const [investments, setInvestments] = useState<Investment[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isGeneratingPrice, setIsGeneratingPrice] = useState(false);
  const [editMode, setEditMode] = useState<'global' | 'lots' | 'dividends'>('global');
  const [currentLotIndex, setCurrentLotIndex] = useState(0);
  const [lotFormData, setLotFormData] = useState({ quantity: '1', pricePerUnit: '0', date: '' });
  const [lotEditingId, setLotEditingId] = useState<string | null>(null);
  const [dividendFormData, setDividendFormData] = useState({ amount: '', date: new Date().toISOString().split('T')[0] });
  
  const [formData, setFormData] = useState({
    name: '',
    category: '',
    quantity: '1',
    unitType: 'Lembar',
    buyPricePerUnit: '',
    lastPricePerUnit: '',
    dividends: '',
    date: new Date().toISOString().split('T')[0]
  });

  const fetchInvestments = async () => {
    try {
      const res = await axios.get(`${API_URL}/investments`);
      setInvestments(res.data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvestments();
  }, []);

  const formatCurrency = formatCurrencyMasked;

  // 1. Investment Data (Donut - Global)
  const totalInvestment = investments.reduce((sum, inv) => sum + inv.currentValue, 0) || 1;
  const investmentData = investments.reduce<{name: string; value: number}[]>((acc, curr) => {
    const existing = acc.find(item => item.name === curr.category);
    if (existing) existing.value += curr.currentValue;
    else acc.push({ name: curr.category, value: curr.currentValue });
    return acc;
  }, [])
  .map(item => ({ ...item, percentage: ((item.value / totalInvestment) * 100).toFixed(1) }));

  // 2. Investment Data (Sub-Categories)
  const investmentCategories = [...new Set(investments.map(i => i.category))];
  const standardInvestmentCategories = ["Saham", "Reksadana", "Kripto", "Emas", "Lainnya"];
  const allInvestmentCategories = [...new Set([...standardInvestmentCategories, ...investmentCategories])].filter(Boolean);
  const subCategoryData: Record<string, {name: string; value: number; percentage: string}[]> = {};
  
  investmentCategories.forEach(category => {
    const itemsInCategory = investments.filter(i => i.category === category);
    const totalInCategory = itemsInCategory.reduce((sum, i) => sum + i.currentValue, 0) || 1;
    
    subCategoryData[category] = itemsInCategory.map(item => ({
      name: item.name || 'Unknown',
      value: item.currentValue,
      percentage: ((item.currentValue / totalInCategory) * 100).toFixed(1)
    }));
  });

  const handleEdit = (inv: Investment) => {
    setFormData({
      name: inv.name,
      category: inv.category,
      quantity: (inv.quantity || 1).toString(),
      unitType: inv.unitType || 'Lembar',
      buyPricePerUnit: (inv.investedAmount / (inv.quantity || 1)).toString(),
      lastPricePerUnit: (inv.lastPricePerUnit || 0).toString(),
      dividends: (inv.dividends || 0).toString(),
      date: new Date(inv.date).toISOString().split('T')[0]
    });
    setEditingId(inv.id);
    if (inv.purchases && inv.purchases.length > 0) {
      setEditMode('lots');
      setCurrentLotIndex(0);
      const lot = inv.purchases[0];
      setLotFormData({
        quantity: lot.quantity.toString(),
        pricePerUnit: lot.pricePerUnit.toString(),
        date: new Date(lot.date).toISOString().split('T')[0]
      });
      setLotEditingId(lot.id);
    } else {
      setEditMode('global');
    }
    setIsModalOpen(true);
  };

  const handleLotChange = (index: number) => {
    const inv = investments.find(i => i.id === editingId);
    if (inv && inv.purchases && inv.purchases[index]) {
      setCurrentLotIndex(index);
      const lot = inv.purchases[index];
      setLotFormData({
        quantity: lot.quantity.toString(),
        pricePerUnit: lot.pricePerUnit.toString(),
        date: new Date(lot.date).toISOString().split('T')[0]
      });
      setLotEditingId(lot.id);
    }
  };

  const handleLotSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!lotEditingId) return;
    try {
      await axios.put(`${API_URL}/investment-purchases/${lotEditingId}`, lotFormData);
      await fetchInvestments();
      alert('Lot updated successfully!');
      // Update form data to reflect new averages
      const updatedInv = investments.find(i => i.id === editingId);
      if (updatedInv) handleEdit(updatedInv); // Refreshes the modal view
    } catch (error) {
      console.error('Failed to update lot', error);
      alert('Failed to update lot');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const qty = parseFloat(formData.quantity || '1');
      const price = parseFloat(formData.lastPricePerUnit || '0');
      const buyPrice = parseFloat(formData.buyPricePerUnit || '0');

      const payload = {
        ...formData,
        investedAmount: (qty * buyPrice).toString(),
        currentValue: (qty * price).toString(),
      };
      if (editingId) {
        await axios.put(`${API_URL}/investments/${editingId}`, payload);
      } else {
        await axios.post(`${API_URL}/investments`, payload);
      }
      setIsModalOpen(false);
      setEditingId(null);
      setFormData({ name: '', category: '', quantity: '1', unitType: 'Lembar', buyPricePerUnit: '', lastPricePerUnit: '', dividends: '', date: new Date().toISOString().split('T')[0] });
      fetchInvestments();
    } catch (error) {
      console.error('Failed to save investment');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this investment?')) return;
    try {
      await axios.delete(`${API_URL}/investments/${id}`);
      fetchInvestments();
    } catch (error) {
      console.error('Failed to delete');
    }
  };

  const handleLotDelete = async (lotId: string) => {
    if (!confirm('Are you sure you want to delete this purchase lot?')) return;
    try {
      await axios.delete(`${API_URL}/investment-purchases/${lotId}`);
      await fetchInvestments();
      alert('Lot deleted successfully!');
      setIsModalOpen(false);
      setEditingId(null);
    } catch (error) {
      console.error('Failed to delete lot', error);
      alert('Failed to delete lot');
    }
  };

  const handleDividendSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingId) return;
    try {
      await axios.post(`${API_URL}/investment-dividends`, {
        investmentId: editingId,
        amount: parseFloat(dividendFormData.amount),
        date: dividendFormData.date
      });
      await fetchInvestments();
      alert('Dividend added successfully!');
      setDividendFormData({ amount: '', date: new Date().toISOString().split('T')[0] });
    } catch (error) {
      console.error('Failed to add dividend', error);
      alert('Failed to add dividend');
    }
  };

  const handleDividendDelete = async (divId: string) => {
    if (!confirm('Are you sure you want to delete this dividend record?')) return;
    try {
      await axios.delete(`${API_URL}/investment-dividends/${divId}`);
      await fetchInvestments();
      alert('Dividend deleted successfully!');
    } catch (error) {
      console.error('Failed to delete dividend', error);
      alert('Failed to delete dividend');
    }
  };

  const handleGeneratePrice = async () => {
    if (!formData.name || !formData.category) {
      alert("Harap isi 'Name' dan 'Category' terlebih dahulu agar AI bisa mencari harga.");
      return;
    }
    
    setIsGeneratingPrice(true);
    try {
      const res = await axios.post(`${API_URL}/ai/get-price`, {
        name: formData.name,
        category: formData.category
      });
      if (res.data.price) {
        let aiPrice = parseFloat(res.data.price);
        if (formData.unitType === 'Lot') {
          aiPrice = aiPrice * 100;
        }
        setFormData({ ...formData, lastPricePerUnit: aiPrice.toString() });
      } else {
        alert("Gagal mendapatkan harga. Silakan isi manual.");
      }
    } catch (error) {
      console.error("Error fetching price", error);
      alert("Terjadi kesalahan saat AI mencari harga. Silakan isi manual.");
    } finally {
      setIsGeneratingPrice(false);
    }
  };

  if (loading) return <div className="flex h-full items-center justify-center"><div className="animate-pulse text-sky-500">Loading...</div></div>;

  return (
    <div className="space-y-6 pb-20 md:pb-0">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-800 dark:text-slate-100">Investments</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Manage and track your investment portfolio.</p>
        </div>
        <button onClick={() => { setEditingId(null); setFormData({ name: '', category: '', quantity: '1', unitType: 'Lembar', buyPricePerUnit: '', lastPricePerUnit: '', dividends: '', date: new Date().toISOString().split('T')[0] }); setIsModalOpen(true); }} className="btn-primary flex items-center gap-2">
          <Plus size={20} />
          <span>Add New</span>
        </button>
      </div>

      <div className="glass-panel overflow-x-auto">
        <table className="w-full text-left text-sm text-slate-600 dark:text-slate-300">
          <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 uppercase border-b border-slate-200 dark:border-slate-700">
            <tr>
              <th className="px-6 py-4">Name</th>
              <th className="px-6 py-4">Category</th>
              <th className="px-6 py-4 text-right">Qty/Unit</th>
              <th className="px-6 py-4 text-right">Avg Price</th>
              <th className="px-6 py-4 text-right">Invested</th>
              <th className="px-6 py-4 text-right">Current Value</th>
              <th className="px-6 py-4 text-right">Capital Gain</th>
              <th className="px-6 py-4 text-right">Dividend</th>
              <th className="px-6 py-4 text-right">Total Return</th>
              <th className="px-6 py-4 text-center">Action</th>
            </tr>
          </thead>
          <tbody>
            {investments.map((inv) => {
              const capitalGain = inv.currentValue - inv.investedAmount;
              const dividend = inv.dividends || 0;
              const totalReturn = capitalGain + dividend;
              const isPositive = totalReturn >= 0;
              const isCapitalGainPositive = capitalGain >= 0;
              const isDividendPositive = dividend > 0;

              return (
                <tr key={inv.id} className="border-b border-slate-100 dark:border-slate-700/50 hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors">
                  <td className="px-6 py-4 font-medium text-slate-800 dark:text-slate-200">
                    <div className="flex items-center gap-3">
                      <div className={`p-1.5 rounded-md ${isPositive ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'}`}>
                        {isPositive ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
                      </div>
                      {inv.name}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300">
                      {inv.category}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right text-slate-600 dark:text-slate-300">
                    {inv.quantity} {inv.unitType}
                  </td>
                  <td className="px-6 py-4 text-right text-slate-600 dark:text-slate-300">
                    {formatCurrency(inv.averagePrice || 0)}
                  </td>
                  <td className="px-6 py-4 text-right text-slate-600 dark:text-slate-300">
                    {formatCurrency(inv.investedAmount)}
                  </td>
                  <td className="px-6 py-4 text-right font-medium text-slate-800 dark:text-slate-200">
                    {formatCurrency(inv.currentValue)}
                  </td>
                  <td className={`px-6 py-4 text-right font-medium ${isCapitalGainPositive ? 'text-emerald-500' : 'text-rose-500'}`}>
                    {isCapitalGainPositive ? '+' : ''}{formatCurrency(capitalGain)}
                  </td>
                  <td className={`px-6 py-4 text-right font-medium ${isDividendPositive ? 'text-sky-500' : 'text-slate-400 dark:text-slate-500'}`}>
                    {isDividendPositive ? '+' : ''}{formatCurrency(dividend)}
                  </td>
                  <td className={`px-6 py-4 text-right font-medium ${isPositive ? 'text-emerald-500' : 'text-rose-500'}`}>
                    {isPositive ? '+' : ''}{formatCurrency(totalReturn)}
                  </td>
                  <td className="px-6 py-4 text-center space-x-3">
                    <button onClick={() => handleEdit(inv)} className="text-slate-400 hover:text-sky-500 transition-colors">
                      <Edit2 size={18} />
                    </button>
                    <button onClick={() => handleDelete(inv.id)} className="text-slate-400 hover:text-rose-500 transition-colors">
                      <Trash2 size={18} />
                    </button>
                  </td>
                </tr>
              );
            })}
            {investments.length === 0 && (
              <tr>
                <td colSpan={8} className="px-6 py-8 text-center text-slate-500 dark:text-slate-400">
                  No investments found. Click "Add New" to create one.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">
        {/* 1. Investment Allocation */}
        <div className="glass-panel p-6">
          <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-6 border-b border-slate-100 dark:border-slate-700 pb-2">Investment Allocation</h3>
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
                  <Tooltip formatter={(value: any) => formatCurrency(value)} contentStyle={{ borderRadius: '8px', backgroundColor: 'var(--color-bg)', color: 'var(--color-text-main)', border: 'none' }} />
                  <Legend verticalAlign="bottom" height={36} wrapperStyle={{ fontSize: '12px' }} />
                </PieChart>
              </ResponsiveContainer>
            ) : <div className="text-slate-400">No investment data</div>}
          </div>
        </div>
      </div>

      {/* Investment Sub-Categories */}
      {Object.keys(subCategoryData).length > 0 && (
        <div className="mt-6">
          <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-4 px-1">Investment Sub-Categories</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {Object.entries(subCategoryData).map(([category, data], idx) => (
              <div key={category} className="glass-panel p-6">
                <h4 className="text-md font-bold text-slate-700 dark:text-slate-200 mb-4 border-b border-slate-100 dark:border-slate-700 pb-2">{category}</h4>
                <div className="h-[200px] flex items-center justify-center">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={data}
                        cx="50%"
                        cy="50%"
                        outerRadius={70}
                        dataKey="value"
                        stroke="none"
                      >
                        {data.map((_entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[(index + idx * 2) % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value: any) => formatCurrency(value)} contentStyle={{ borderRadius: '8px', backgroundColor: 'var(--color-bg)', color: 'var(--color-text-main)', border: 'none' }} />
                      <Legend verticalAlign="bottom" height={30} wrapperStyle={{ fontSize: '11px' }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 dark:bg-slate-900/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="glass-panel w-full max-w-md p-6 animate-in fade-in zoom-in duration-200 overflow-y-auto max-h-[90vh]">
            <h2 className="text-2xl font-bold mb-4 text-slate-800 dark:text-slate-100">{editingId ? 'Edit Investment' : 'New Investment'}</h2>
            
            {editingId ? (
              <div className="flex gap-2 mb-6 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg">
                <button 
                  onClick={() => setEditMode('global')}
                  className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-colors ${editMode === 'global' ? 'bg-white dark:bg-slate-700 text-sky-600 dark:text-sky-400 shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`}
                >
                  Global
                </button>
                {(investments.find(i => i.id === editingId)?.purchases?.length || 0) > 0 && (
                  <button 
                    onClick={() => setEditMode('lots')}
                    className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-colors ${editMode === 'lots' ? 'bg-white dark:bg-slate-700 text-sky-600 dark:text-sky-400 shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`}
                  >
                    Lots
                  </button>
                )}
                {investments.find(i => i.id === editingId)?.category === 'Saham' && (
                  <button 
                    onClick={() => setEditMode('dividends')}
                    className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-colors ${editMode === 'dividends' ? 'bg-white dark:bg-slate-700 text-sky-600 dark:text-sky-400 shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`}
                  >
                    Dividends
                  </button>
                )}
              </div>
            ) : null}

            {editMode === 'global' ? (
              <>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">Name</label>
                    <input required type="text" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} className="glass-input w-full" placeholder="e.g. BBCA, Emas Antam, BTC" />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">Category</label>
                    <input required type="text" list="investment-categories" value={formData.category} onChange={(e) => setFormData({...formData, category: e.target.value})} className="glass-input w-full bg-white dark:bg-slate-900" placeholder="e.g. Saham, Properti" />
                    <datalist id="investment-categories">
                      {allInvestmentCategories.map(cat => (
                        <option key={cat} value={cat} />
                      ))}
                    </datalist>
                  </div>

                  <div className="flex gap-4">
                    <div className="flex-1">
                      <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">Quantity</label>
                      <input required type="number" step="any" value={formData.quantity} onChange={(e) => setFormData({...formData, quantity: e.target.value})} className="glass-input w-full" placeholder="1" />
                    </div>
                    <div className="w-1/3">
                      <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">Unit</label>
                      <select required value={formData.unitType} onChange={(e) => setFormData({...formData, unitType: e.target.value})} className="glass-input w-full bg-white dark:bg-slate-900">
                        <option value="Lembar">Lembar</option>
                        <option value="Lot">Lot</option>
                        <option value="Gram">Gram</option>
                        <option value="Unit">Unit</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">Average Buy Price (Per Unit)</label>
                    <input required type="number" step="any" value={formData.buyPricePerUnit} onChange={(e) => setFormData({...formData, buyPricePerUnit: e.target.value})} className="glass-input w-full" placeholder="0" />
                    {formData.quantity && formData.buyPricePerUnit && (
                      <p className="text-xs text-sky-600 dark:text-sky-400 mt-1 font-medium">
                        Total Invested: {formatCurrency(parseFloat(formData.quantity || '0') * parseFloat(formData.buyPricePerUnit || '0'))}
                      </p>
                    )}
                  </div>
                  
                  <div>
                    <div className="flex justify-between items-end mb-1">
                      <label className="block text-sm font-medium text-slate-600 dark:text-slate-300">Current Price (Per Unit)</label>
                      <button type="button" onClick={handleGeneratePrice} disabled={isGeneratingPrice} className="text-xs flex items-center gap-1 text-violet-600 dark:text-violet-400 bg-violet-50 dark:bg-violet-900/30 hover:bg-violet-100 dark:hover:bg-violet-900/50 px-2 py-1 rounded-md transition-colors border border-violet-200 dark:border-violet-800 disabled:opacity-50">
                        <Sparkles size={12} />
                        {isGeneratingPrice ? 'Fetching...' : 'Auto-fill AI'}
                      </button>
                    </div>
                    <input required type="number" value={formData.lastPricePerUnit} onChange={(e) => setFormData({...formData, lastPricePerUnit: e.target.value})} className="glass-input w-full" placeholder="Manual Input or Use AI" />
                    <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">Total Valuation will be calculated automatically.</p>
                  </div>

                  {formData.category === 'Saham' && (
                    <div className="animate-in slide-in-from-top-2 duration-300">
                      <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">Dividends Received (Optional)</label>
                      <input type="number" value={formData.dividends} onChange={(e) => setFormData({...formData, dividends: e.target.value})} className="glass-input w-full border-sky-200 dark:border-sky-800 bg-sky-50/50 dark:bg-sky-900/20" placeholder="0" />
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">Date</label>
                    <input required type="date" value={formData.date} onChange={(e) => setFormData({...formData, date: e.target.value})} className="glass-input w-full" />
                  </div>

                  <div className="flex justify-end gap-3 pt-4 mt-6 border-t border-slate-200 dark:border-slate-700">
                    <button type="button" onClick={() => { setIsModalOpen(false); setEditingId(null); }} className="btn-secondary px-4 py-2">Cancel</button>
                    <button type="submit" className="btn-primary px-4 py-2">{editingId ? 'Update' : 'Save'}</button>
                  </div>
                </form>
                
                {editingId && (
                  <div className="mt-8 border-t border-slate-200 dark:border-slate-700 pt-6">
                    <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-4">Purchase History (Lots)</h3>
                    <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700">
                      <table className="w-full text-left text-xs text-slate-600 dark:text-slate-300">
                        <thead className="bg-slate-100 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 uppercase">
                          <tr>
                            <th className="px-4 py-2">Date</th>
                            <th className="px-4 py-2 text-right">Qty</th>
                            <th className="px-4 py-2 text-right">Price/Unit</th>
                            <th className="px-4 py-2 text-right">Total</th>
                          </tr>
                        </thead>
                        <tbody>
                          {investments.find(i => i.id === editingId)?.purchases?.map((lot) => (
                            <tr key={lot.id} className="border-b border-slate-100 dark:border-slate-700/50 last:border-0">
                              <td className="px-4 py-3">{new Date(lot.date).toLocaleDateString()}</td>
                              <td className="px-4 py-3 text-right">{lot.quantity}</td>
                              <td className="px-4 py-3 text-right">{formatCurrency(lot.pricePerUnit)}</td>
                              <td className="px-4 py-3 text-right font-medium">{formatCurrency(lot.totalAmount)}</td>
                            </tr>
                          ))}
                          {(!investments.find(i => i.id === editingId)?.purchases || investments.find(i => i.id === editingId)?.purchases?.length === 0) && (
                            <tr>
                              <td colSpan={4} className="px-4 py-4 text-center text-slate-400 italic">No purchase history found.</td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </>
            ) : editMode === 'lots' ? (
              <div className="animate-in fade-in duration-300">
                <div className="bg-sky-50 dark:bg-sky-900/20 p-4 rounded-xl mb-6 border border-sky-100 dark:border-sky-800">
                   <h3 className="font-bold text-slate-800 dark:text-slate-100 text-lg">{investments.find(i => i.id === editingId)?.name}</h3>
                   <div className="flex justify-between items-center mt-2">
                     <p className="text-sm text-slate-500 dark:text-slate-400">Total Qty: <span className="font-medium text-slate-700 dark:text-slate-200">{investments.find(i => i.id === editingId)?.quantity}</span></p>
                     <p className="text-sm text-slate-500 dark:text-slate-400">Avg Price: <span className="font-medium text-slate-700 dark:text-slate-200">{formatCurrency(investments.find(i => i.id === editingId)?.averagePrice || 0)}</span></p>
                   </div>
                </div>
                
                <div className="flex items-center justify-between mb-6 bg-slate-50 dark:bg-slate-800 p-2 rounded-lg border border-slate-200 dark:border-slate-700">
                   <button onClick={() => handleLotChange(currentLotIndex - 1)} disabled={currentLotIndex === 0} className="w-8 h-8 flex items-center justify-center rounded-md bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-500 dark:text-slate-300 disabled:opacity-30 hover:bg-slate-100 dark:hover:bg-slate-600 transition-colors shadow-sm">&lt;</button>
                   <span className="text-sm font-medium text-slate-600 dark:text-slate-300">
                     Purchase {investments.find(i => i.id === editingId)?.purchases?.length! - currentLotIndex} of {investments.find(i => i.id === editingId)?.purchases?.length}
                   </span>
                   <button onClick={() => handleLotChange(currentLotIndex + 1)} disabled={currentLotIndex === investments.find(i => i.id === editingId)?.purchases?.length! - 1} className="w-8 h-8 flex items-center justify-center rounded-md bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-500 dark:text-slate-300 disabled:opacity-30 hover:bg-slate-100 dark:hover:bg-slate-600 transition-colors shadow-sm">&gt;</button>
                </div>

                <form onSubmit={handleLotSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">Quantity</label>
                    <input required type="number" step="any" value={lotFormData.quantity} onChange={(e) => setLotFormData({...lotFormData, quantity: e.target.value})} className="glass-input w-full" placeholder="1" />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">Price Per Unit</label>
                    <input required type="number" value={lotFormData.pricePerUnit} onChange={(e) => setLotFormData({...lotFormData, pricePerUnit: e.target.value})} className="glass-input w-full" placeholder="0" />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">Total Validated</label>
                    <div className="px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-300 font-medium">
                      {formatCurrency((parseFloat(lotFormData.quantity || '0') * parseFloat(lotFormData.pricePerUnit || '0')))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">Date</label>
                    <input required type="date" value={lotFormData.date} onChange={(e) => setLotFormData({...lotFormData, date: e.target.value})} className="glass-input w-full" />
                  </div>

                  <div className="flex justify-between items-center pt-4 mt-6 border-t border-slate-200 dark:border-slate-700">
                    <button type="button" onClick={() => handleLotDelete(lotEditingId!)} className="text-rose-500 hover:text-rose-600 dark:hover:text-rose-400 p-2 transition-colors">
                      <Trash2 size={20} />
                    </button>
                    <div className="flex gap-3">
                      <button type="button" onClick={() => { setIsModalOpen(false); setEditingId(null); }} className="btn-secondary px-4 py-2">Close</button>
                      <button type="submit" className="btn-primary px-4 py-2">Save Lot</button>
                    </div>
                  </div>
                </form>
              </div>
            ) : editMode === 'dividends' ? (
              <div className="animate-in fade-in duration-300">
                <div className="bg-sky-50 dark:bg-sky-900/20 p-4 rounded-xl mb-6 border border-sky-100 dark:border-sky-800">
                   <h3 className="font-bold text-slate-800 dark:text-slate-100 text-lg">{investments.find(i => i.id === editingId)?.name} Dividend History</h3>
                   <div className="flex justify-between items-center mt-2">
                     <p className="text-sm text-slate-500 dark:text-slate-400">Total Dividends Received: <span className="font-medium text-emerald-600 dark:text-emerald-400">{formatCurrency(investments.find(i => i.id === editingId)?.dividends || 0)}</span></p>
                   </div>
                </div>

                <form onSubmit={handleDividendSubmit} className="space-y-4 mb-6 p-4 border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800/50">
                  <h4 className="font-bold text-sm text-slate-700 dark:text-slate-300">Add New Dividend</h4>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Total Amount (Rp)</label>
                    <input required type="number" step="any" value={dividendFormData.amount} onChange={(e) => setDividendFormData({...dividendFormData, amount: e.target.value})} className="glass-input w-full text-sm py-2" placeholder="e.g. 50000" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Date Received</label>
                    <input required type="date" value={dividendFormData.date} onChange={(e) => setDividendFormData({...dividendFormData, date: e.target.value})} className="glass-input w-full text-sm py-2" />
                  </div>
                  <button type="submit" className="btn-primary w-full py-2 text-sm mt-2">Save Dividend</button>
                </form>

                <div className="border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden">
                  <table className="w-full text-left text-xs text-slate-600 dark:text-slate-300">
                    <thead className="bg-slate-100 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 uppercase">
                      <tr>
                        <th className="px-4 py-2">Date</th>
                        <th className="px-4 py-2 text-right">Amount</th>
                        <th className="px-4 py-2 text-center">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {investments.find(i => i.id === editingId)?.dividendRecords?.map((div) => (
                        <tr key={div.id} className="border-b border-slate-100 dark:border-slate-700/50 last:border-0">
                          <td className="px-4 py-3">{new Date(div.date).toLocaleDateString()}</td>
                          <td className="px-4 py-3 text-right font-medium text-emerald-600 dark:text-emerald-400">+{formatCurrency(div.amount)}</td>
                          <td className="px-4 py-3 text-center">
                            <button onClick={() => handleDividendDelete(div.id)} className="text-rose-400 hover:text-rose-600 transition-colors">
                              <Trash2 size={14} />
                            </button>
                          </td>
                        </tr>
                      ))}
                      {(!investments.find(i => i.id === editingId)?.dividendRecords || investments.find(i => i.id === editingId)?.dividendRecords?.length === 0) && (
                        <tr>
                          <td colSpan={3} className="px-4 py-6 text-center text-slate-400 italic">No dividend records found.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                <div className="flex justify-end pt-4 mt-6 border-t border-slate-200 dark:border-slate-700">
                  <button type="button" onClick={() => { setIsModalOpen(false); setEditingId(null); }} className="btn-secondary px-4 py-2">Close</button>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}
