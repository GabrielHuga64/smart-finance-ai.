import { useState, useEffect } from 'react';
import axios from 'axios';
import { Plus, Trash2, Edit2, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { useBalance } from '../context/BalanceContext';

const API_URL = import.meta.env.VITE_API_URL || '/_/backend/api';

interface Transaction {
  id: string;
  amount: number;
  type: string;
  category: string;
  description: string;
  date: string;
}

export default function Transactions() {
  const { formatCurrencyMasked } = useBalance();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isCustomCategory, setIsCustomCategory] = useState(false);
  const [isCustomInvestmentCategory, setIsCustomInvestmentCategory] = useState(false);

  const getCurrentMonthString = () => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}`;
  };

  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonthString());
  
  const [formData, setFormData] = useState({
    amount: '',
    type: 'EXPENSE',
    category: '',
    description: '',
    date: new Date().toISOString().split('T')[0],
    addToInvestment: false,
    investmentName: '',
    investmentCategory: 'Saham',
    investmentQuantity: '1',
    investmentUnit: 'Lembar'
  });

  const fetchTransactions = async () => {
    try {
      const res = await axios.get(`${API_URL}/transactions`);
      setTransactions(res.data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTransactions();
  }, []);

  const formatCurrency = formatCurrencyMasked;
  const standardExpenseCategories = ['Food', 'Transport', 'Utilities', 'Shopping', 'Investasi'];
  const standardIncomeCategories = ['Salary', 'Bonus', 'Kupon / Yield', 'Dividen'];

  const expenseCategories = [...new Set([...standardExpenseCategories, ...transactions.filter(tx => tx.type === 'EXPENSE').map(tx => tx.category)])].filter(Boolean);
  const incomeCategories = [...new Set([...standardIncomeCategories, ...transactions.filter(tx => tx.type === 'INCOME').map(tx => tx.category)])].filter(Boolean);

  const transactionCategories = formData.type === 'EXPENSE' ? expenseCategories : incomeCategories;

  const filteredTransactions = transactions.filter(tx => {
    const d = new Date(tx.date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}` === selectedMonth;
  });

  const availableMonths = [...new Set([
    getCurrentMonthString(),
    ...transactions.map(tx => {
      const d = new Date(tx.date);
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      return `${year}-${month}`;
    })
  ])].sort((a, b) => b.localeCompare(a));

  const formatMonthOption = (monthStr: string) => {
    const [year, month] = monthStr.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1, 1);
    return date.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
  };

  const handleEdit = (tx: Transaction) => {
    setFormData({
      amount: tx.amount.toString(),
      type: tx.type,
      category: tx.category,
      description: tx.description || '',
      date: new Date(tx.date).toISOString().split('T')[0],
      addToInvestment: false,
      investmentName: '',
      investmentCategory: 'Saham',
      investmentQuantity: '1',
      investmentUnit: 'Lembar'
    });
    setEditingId(tx.id);
    setIsCustomCategory(false);
    setIsCustomInvestmentCategory(false);
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingId) {
        await axios.put(`${API_URL}/transactions/${editingId}`, formData);
      } else {
        await axios.post(`${API_URL}/transactions`, formData);
        
        if (formData.addToInvestment && formData.type === 'EXPENSE') {
          const qty = parseFloat(formData.investmentQuantity || '1');
          const amount = parseFloat(formData.amount || '0');
          const pricePerUnit = amount / qty;

          await axios.post(`${API_URL}/investments`, {
            name: formData.investmentName,
            category: formData.investmentCategory,
            quantity: formData.investmentQuantity,
            unitType: formData.investmentUnit,
            investedAmount: formData.amount,
            lastPricePerUnit: pricePerUnit.toString(),
            currentValue: formData.amount,
            date: formData.date
          });
        }
      }
      setIsModalOpen(false);
      setEditingId(null);
      setIsCustomCategory(false);
      setIsCustomInvestmentCategory(false);
      setFormData({ amount: '', type: 'EXPENSE', description: '', category: '', date: new Date().toISOString().split('T')[0], addToInvestment: false, investmentName: '', investmentCategory: 'Saham', investmentQuantity: '1', investmentUnit: 'Lembar' });
      fetchTransactions();
    } catch (error) {
      console.error('Failed to save transaction');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this transaction?')) return;
    try {
      await axios.delete(`${API_URL}/transactions/${id}`);
      fetchTransactions();
    } catch (error) {
      console.error('Failed to delete');
    }
  };

  if (loading) return <div className="flex h-full items-center justify-center"><div className="animate-pulse text-sky-500">Loading...</div></div>;

  return (
    <div className="space-y-6 pb-20 md:pb-0">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-800 dark:text-slate-100">Transactions</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Manage your income and expenses.</p>
        </div>
        <button onClick={() => { setEditingId(null); setIsCustomCategory(false); setIsCustomInvestmentCategory(false); setFormData({ amount: '', type: 'EXPENSE', description: '', category: '', date: selectedMonth === getCurrentMonthString() ? new Date().toISOString().split('T')[0] : `${selectedMonth}-01`, addToInvestment: false, investmentName: '', investmentCategory: 'Saham', investmentQuantity: '1', investmentUnit: 'Lembar' }); setIsModalOpen(true); }} className="btn-primary flex items-center gap-2 whitespace-nowrap">
          <Plus size={20} />
          <span>Add New</span>
        </button>
      </div>

      {/* Month Filter Tabs */}
      <div className="flex flex-wrap gap-4 border-b border-slate-200 dark:border-slate-700 pb-2">
        {availableMonths.map(m => (
          <button 
            key={m}
            type="button"
            onClick={() => setSelectedMonth(m)} 
            className={`font-semibold pb-2 border-b-2 transition-colors ${selectedMonth === m ? 'border-sky-500 text-sky-600 dark:text-sky-400' : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
          >
            {formatMonthOption(m)}
          </button>
        ))}
      </div>

      <div className="glass-panel overflow-x-auto">
        <table className="w-full text-left text-sm text-slate-600 dark:text-slate-300">
          <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 uppercase border-b border-slate-200 dark:border-slate-700">
            <tr>
              <th className="px-6 py-4">Date</th>
              <th className="px-6 py-4">Description</th>
              <th className="px-6 py-4">Category</th>
              <th className="px-6 py-4 text-right">Amount</th>
              <th className="px-6 py-4 text-center">Action</th>
            </tr>
          </thead>
          <tbody>
            {filteredTransactions.map((tx) => (
              <tr key={tx.id} className="border-b border-slate-100 dark:border-slate-700/50 hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors">
                <td className="px-6 py-4">{new Date(tx.date).toLocaleDateString()}</td>
                <td className="px-6 py-4 font-medium text-slate-800 dark:text-slate-200">
                  <div className="flex items-center gap-3">
                    <div className={`p-1.5 rounded-md ${tx.type === 'INCOME' ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'}`}>
                      {tx.type === 'INCOME' ? <ArrowUpRight size={16} /> : <ArrowDownRight size={16} />}
                    </div>
                    {tx.description || '-'}
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300">
                    {tx.category}
                  </span>
                </td>
                <td className={`px-6 py-4 text-right font-medium ${tx.type === 'INCOME' ? 'text-emerald-500' : 'text-rose-500'}`}>
                  {tx.type === 'INCOME' ? '+' : '-'}{formatCurrency(tx.amount)}
                </td>
                <td className="px-6 py-4 text-center space-x-3">
                  <button onClick={() => handleEdit(tx)} className="text-slate-400 hover:text-sky-500 transition-colors">
                    <Edit2 size={18} />
                  </button>
                  <button onClick={() => handleDelete(tx.id)} className="text-slate-400 hover:text-rose-500 transition-colors">
                    <Trash2 size={18} />
                  </button>
                </td>
              </tr>
            ))}
            {filteredTransactions.length === 0 && (
              <tr>
                <td colSpan={5} className="px-6 py-8 text-center text-slate-500 dark:text-slate-400">
                  No transactions found. Click "Add New" to create one.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 dark:bg-slate-900/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="glass-panel w-full max-w-md p-6 animate-in fade-in zoom-in duration-200 overflow-y-auto max-h-[90vh]">
            <h2 className="text-2xl font-bold mb-6 text-slate-800 dark:text-slate-100">{editingId ? 'Edit Transaction' : 'New Transaction'}</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              
              <div className="flex gap-4 mb-6">
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, type: 'EXPENSE', category: '' })}
                  className={`flex-1 py-2 rounded-xl border transition-all ${formData.type === 'EXPENSE' ? 'bg-rose-50 dark:bg-rose-900/20 border-rose-300 dark:border-rose-800 text-rose-600 dark:text-rose-400 font-semibold' : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400'}`}
                >
                  Expense
                </button>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, type: 'INCOME', category: '' })}
                  className={`flex-1 py-2 rounded-xl border transition-all ${formData.type === 'INCOME' ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-300 dark:border-emerald-800 text-emerald-600 dark:text-emerald-400 font-semibold' : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400'}`}
                >
                  Income
                </button>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">Amount</label>
                <input required type="number" value={formData.amount} onChange={(e) => setFormData({...formData, amount: e.target.value})} className="glass-input w-full text-lg" placeholder="0" />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">Category</label>
                {!isCustomCategory ? (
                  <select 
                    required 
                    value={transactionCategories.includes(formData.category) ? formData.category : (formData.category ? 'ADD_NEW' : '')} 
                    onChange={(e) => {
                      if (e.target.value === 'ADD_NEW') {
                        setIsCustomCategory(true);
                        setFormData({...formData, category: ''});
                      } else {
                        setFormData({...formData, category: e.target.value});
                      }
                    }}
                    className="glass-input w-full bg-white dark:bg-slate-900"
                  >
                    <option value="" disabled>Select Category...</option>
                    {transactionCategories.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                    <option value="ADD_NEW">+ Tambah Kategori Baru</option>
                  </select>
                ) : (
                  <div className="flex gap-2">
                    <input required type="text" value={formData.category} onChange={(e) => setFormData({...formData, category: e.target.value})} className="glass-input w-full flex-1" placeholder="Ketik kategori baru..." autoFocus />
                    <button type="button" onClick={() => { setIsCustomCategory(false); setFormData({...formData, category: transactionCategories[0] || 'Food'}) }} className="px-3 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-xl transition-colors text-sm font-medium border border-slate-200 dark:border-slate-700">Batal</button>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">Description (Optional)</label>
                <input type="text" value={formData.description} onChange={(e) => setFormData({...formData, description: e.target.value})} className="glass-input w-full" placeholder="e.g. Lunch at KFC" />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">Date</label>
                <input required type="date" value={formData.date} onChange={(e) => setFormData({...formData, date: e.target.value})} className="glass-input w-full" />
              </div>

              {/* Reflection Checkbox */}
              {!editingId && formData.type === 'EXPENSE' && (
                <div className="pt-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input 
                      type="checkbox" 
                      className="rounded border-slate-300 dark:border-slate-600 text-sky-500 focus:ring-sky-500 w-4 h-4 bg-white dark:bg-slate-800"
                      checked={formData.addToInvestment}
                      onChange={(e) => setFormData({...formData, addToInvestment: e.target.checked})}
                    />
                    <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Tambahkan ke Portofolio Investasi?</span>
                  </label>
                </div>
              )}

              {/* Reflection Fields */}
              {formData.addToInvestment && formData.type === 'EXPENSE' && !editingId && (
                <div className="space-y-4 pt-4 border-t border-slate-100 dark:border-slate-800 bg-sky-50/50 dark:bg-sky-900/10 -mx-6 px-6 py-4 rounded-b-xl border-b border-sky-100 dark:border-sky-900/30">
                  <div>
                    <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">Investment Name</label>
                    <input required type="text" value={formData.investmentName} onChange={(e) => setFormData({...formData, investmentName: e.target.value})} className="glass-input w-full bg-white dark:bg-slate-900" placeholder="e.g. BBRI, Emas Antam" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">Asset Category</label>
                    {!isCustomInvestmentCategory ? (
                      <select 
                        required 
                        value={['Saham', 'Reksadana', 'Kripto', 'Emas', 'SBN', 'Lainnya'].includes(formData.investmentCategory) ? formData.investmentCategory : (formData.investmentCategory ? 'ADD_NEW' : '')} 
                        onChange={(e) => {
                          if (e.target.value === 'ADD_NEW') {
                            setIsCustomInvestmentCategory(true);
                            setFormData({...formData, investmentCategory: ''});
                          } else {
                            setFormData({...formData, investmentCategory: e.target.value});
                          }
                        }}
                        className="glass-input w-full bg-white dark:bg-slate-900"
                      >
                        <option value="" disabled>Select Asset Category...</option>
                        {['Saham', 'Reksadana', 'Kripto', 'Emas', 'SBN', 'Lainnya'].map(cat => (
                          <option key={cat} value={cat}>{cat}</option>
                        ))}
                        <option value="ADD_NEW">+ Tambah Kategori Baru</option>
                      </select>
                    ) : (
                      <div className="flex gap-2">
                        <input required type="text" value={formData.investmentCategory} onChange={(e) => setFormData({...formData, investmentCategory: e.target.value})} className="glass-input w-full flex-1" placeholder="Ketik kategori aset baru..." autoFocus />
                        <button type="button" onClick={() => { setIsCustomInvestmentCategory(false); setFormData({...formData, investmentCategory: 'Saham'}) }} className="px-3 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-xl transition-colors text-sm font-medium border border-slate-200 dark:border-slate-700">Batal</button>
                      </div>
                    )}
                  </div>
                  <div className="flex gap-4">
                    <div className="flex-1">
                      <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">Quantity</label>
                      <input required type="number" step="any" value={formData.investmentQuantity} onChange={(e) => setFormData({...formData, investmentQuantity: e.target.value})} className="glass-input w-full bg-white dark:bg-slate-900" placeholder="1" />
                    </div>
                    <div className="w-1/3">
                      <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">Unit</label>
                      <select required value={formData.investmentUnit} onChange={(e) => setFormData({...formData, investmentUnit: e.target.value})} className="glass-input w-full bg-white dark:bg-slate-900">
                        <option value="Lembar">Lembar</option>
                        <option value="Lot">Lot</option>
                        <option value="Gram">Gram</option>
                        <option value="Unit">Unit</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-3 pt-4 mt-6 border-t border-slate-200 dark:border-slate-700">
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
