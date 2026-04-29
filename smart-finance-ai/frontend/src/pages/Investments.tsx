import { useState, useEffect } from 'react';
import axios from 'axios';
import { Plus, Trash2, Edit2, TrendingUp, TrendingDown, Sparkles } from 'lucide-react';
import { useBalance } from '../context/BalanceContext';

const API_URL = import.meta.env.VITE_API_URL || 'https://aplikasikeuangan-lemon.vercel.app/api';

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
}

export default function Investments() {
  const { formatCurrencyMasked } = useBalance();
  const [investments, setInvestments] = useState<Investment[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isGeneratingPrice, setIsGeneratingPrice] = useState(false);
  
  const [formData, setFormData] = useState({
    name: '',
    category: '',
    quantity: '1',
    unitType: 'Lembar',
    investedAmount: '',
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

  const handleEdit = (inv: Investment) => {
    setFormData({
      name: inv.name,
      category: inv.category,
      quantity: (inv.quantity || 1).toString(),
      unitType: inv.unitType || 'Lembar',
      investedAmount: inv.investedAmount.toString(),
      lastPricePerUnit: (inv.lastPricePerUnit || 0).toString(),
      dividends: (inv.dividends || 0).toString(),
      date: new Date(inv.date).toISOString().split('T')[0]
    });
    setEditingId(inv.id);
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const qty = parseFloat(formData.quantity || '1');
      const price = parseFloat(formData.lastPricePerUnit || '0');
      const multiplier = formData.unitType === 'Lot' ? 100 : 1;

      const payload = {
        ...formData,
        currentValue: (qty * price * multiplier).toString(),
      };
      if (editingId) {
        await axios.put(`${API_URL}/investments/${editingId}`, payload);
      } else {
        await axios.post(`${API_URL}/investments`, payload);
      }
      setIsModalOpen(false);
      setEditingId(null);
      setFormData({ name: '', category: '', quantity: '1', unitType: 'Lembar', investedAmount: '', lastPricePerUnit: '', dividends: '', date: new Date().toISOString().split('T')[0] });
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
        setFormData({ ...formData, lastPricePerUnit: res.data.price.toString() });
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
    <div className="space-y-6">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold text-slate-800">Investments</h1>
          <p className="text-slate-500 mt-1">Manage and track your investment portfolio.</p>
        </div>
        <button onClick={() => { setEditingId(null); setFormData({ name: '', category: '', quantity: '1', unitType: 'Lembar', investedAmount: '', lastPricePerUnit: '', dividends: '', date: new Date().toISOString().split('T')[0] }); setIsModalOpen(true); }} className="btn-primary flex items-center gap-2">
          <Plus size={20} />
          <span>Add New</span>
        </button>
      </div>

      <div className="glass-panel overflow-x-auto">
        <table className="w-full text-left text-sm text-slate-600">
          <thead className="bg-slate-50 text-slate-500 uppercase border-b border-slate-200">
            <tr>
              <th className="px-6 py-4">Name</th>
              <th className="px-6 py-4">Category</th>
              <th className="px-6 py-4 text-right">Qty/Unit</th>
              <th className="px-6 py-4 text-right">Avg Price</th>
              <th className="px-6 py-4 text-right">Invested</th>
              <th className="px-6 py-4 text-right">Current Value</th>
              <th className="px-6 py-4 text-right">Total Return</th>
              <th className="px-6 py-4 text-center">Action</th>
            </tr>
          </thead>
          <tbody>
            {investments.map((inv) => {
              const ret = (inv.currentValue - inv.investedAmount) + (inv.dividends || 0);
              const isPositive = ret >= 0;
              return (
                <tr key={inv.id} className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors">
                  <td className="px-6 py-4 font-medium text-slate-800">
                    <div className="flex items-center gap-3">
                      <div className={`p-1.5 rounded-md ${isPositive ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'}`}>
                        {isPositive ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
                      </div>
                      {inv.name}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 border border-slate-200 text-slate-600">
                      {inv.category}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right text-slate-600">
                    {inv.quantity} {inv.unitType}
                  </td>
                  <td className="px-6 py-4 text-right text-slate-600">
                    {formatCurrency(inv.averagePrice || 0)}
                  </td>
                  <td className="px-6 py-4 text-right text-slate-600">
                    {formatCurrency(inv.investedAmount)}
                  </td>
                  <td className="px-6 py-4 text-right font-medium text-slate-800">
                    {formatCurrency(inv.currentValue)}
                  </td>
                  <td className={`px-6 py-4 text-right font-medium ${isPositive ? 'text-emerald-500' : 'text-rose-500'}`}>
                    {isPositive ? '+' : ''}{formatCurrency(ret)}
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
                <td colSpan={8} className="px-6 py-8 text-center text-slate-500">
                  No investments found. Click "Add New" to create one.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="glass-panel w-full max-w-md p-6 animate-in fade-in zoom-in duration-200 overflow-y-auto max-h-[90vh]">
            <h2 className="text-2xl font-bold mb-6 text-slate-800">{editingId ? 'Edit Investment' : 'New Investment'}</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1">Name</label>
                <input required type="text" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} className="glass-input w-full" placeholder="e.g. BBCA, Emas Antam, BTC" />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1">Category</label>
                <select required value={formData.category} onChange={(e) => setFormData({...formData, category: e.target.value})} className="glass-input w-full bg-white">
                  <option value="" disabled>Select Category</option>
                  <option value="Saham">Saham</option>
                  <option value="Reksadana">Reksadana</option>
                  <option value="Kripto">Kripto</option>
                  <option value="Emas">Emas</option>
                  <option value="Lainnya">Lainnya</option>
                </select>
              </div>

              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-slate-600 mb-1">Quantity</label>
                  <input required type="number" step="any" value={formData.quantity} onChange={(e) => setFormData({...formData, quantity: e.target.value})} className="glass-input w-full" placeholder="1" />
                </div>
                <div className="w-1/3">
                  <label className="block text-sm font-medium text-slate-600 mb-1">Unit</label>
                  <select required value={formData.unitType} onChange={(e) => setFormData({...formData, unitType: e.target.value})} className="glass-input w-full bg-white">
                    <option value="Lembar">Lembar</option>
                    <option value="Lot">Lot</option>
                    <option value="Gram">Gram</option>
                    <option value="Unit">Unit</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1">Total Invested Amount (Modal Awal)</label>
                <input required type="number" value={formData.investedAmount} onChange={(e) => setFormData({...formData, investedAmount: e.target.value})} className="glass-input w-full" placeholder="0" />
              </div>
              
              <div>
                <div className="flex justify-between items-end mb-1">
                  <label className="block text-sm font-medium text-slate-600">Current Price (Per Unit)</label>
                  <button type="button" onClick={handleGeneratePrice} disabled={isGeneratingPrice} className="text-xs flex items-center gap-1 text-violet-600 bg-violet-50 hover:bg-violet-100 px-2 py-1 rounded-md transition-colors border border-violet-200 disabled:opacity-50">
                    <Sparkles size={12} />
                    {isGeneratingPrice ? 'Fetching...' : 'Auto-fill AI'}
                  </button>
                </div>
                <input required type="number" value={formData.lastPricePerUnit} onChange={(e) => setFormData({...formData, lastPricePerUnit: e.target.value})} className="glass-input w-full" placeholder="Manual Input or Use AI" />
                <p className="text-xs text-slate-400 mt-1">Total Valuation will be calculated automatically.</p>
              </div>

              {formData.category === 'Saham' && (
                <div className="animate-in slide-in-from-top-2 duration-300">
                  <label className="block text-sm font-medium text-slate-600 mb-1">Dividends Received (Optional)</label>
                  <input type="number" value={formData.dividends} onChange={(e) => setFormData({...formData, dividends: e.target.value})} className="glass-input w-full border-sky-200 bg-sky-50/50" placeholder="0" />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1">Date</label>
                <input required type="date" value={formData.date} onChange={(e) => setFormData({...formData, date: e.target.value})} className="glass-input w-full" />
              </div>

              <div className="flex justify-end gap-3 pt-4 mt-6 border-t border-slate-200">
                <button type="button" onClick={() => { setIsModalOpen(false); setEditingId(null); }} className="btn-secondary px-4 py-2">Cancel</button>
                <button type="submit" className="btn-primary px-4 py-2">{editingId ? 'Update' : 'Save'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
