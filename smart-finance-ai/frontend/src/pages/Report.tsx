import { useState, useEffect } from 'react';
import axios from 'axios';
import { Bot, FileText, Download, Loader2 } from 'lucide-react';
import { useBalance } from '../context/BalanceContext';
import Mascot from '../components/Mascot';
import ReactMarkdown from 'react-markdown';

const API_URL = import.meta.env.VITE_API_URL || 'https://aplikasikeuangan-lemon.vercel.app/api';
const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

export default function Report() {
  const { formatCurrencyMasked } = useBalance();
  const [summary, setSummary] = useState({
    totalIncome: 0,
    totalExpense: 0,
    balance: 0,
    totalInvestmentValue: 0,
    gabunganAset: 0
  });
  const [loading, setLoading] = useState(true);
  const [aiAnalysis, setAiAnalysis] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [mascotMood, setMascotMood] = useState<'neutral' | 'thinking' | 'excited'>('neutral');
  const [mascotMessage, setMascotMessage] = useState('Yuk kita cek laporan keuanganmu!');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const sumRes = await axios.get(`${API_URL}/summary`);
        setSummary(sumRes.data);
      } catch (error) {
        console.error("Failed to fetch summary:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleFixsasiAI = async () => {
    if (!GEMINI_API_KEY) {
      alert("Gemini API Key is missing in environment variables.");
      return;
    }
    
    setIsAnalyzing(true);
    setMascotMood('thinking');
    setMascotMessage('Sedang menganalisis laporan keuanganmu...');

    try {
      const prompt = `Saya memiliki data keuangan bulan ini sebagai berikut:
Total Pemasukan: Rp ${summary.totalIncome.toLocaleString('id-ID')}
Total Pengeluaran: Rp ${summary.totalExpense.toLocaleString('id-ID')}
Saldo Kas: Rp ${summary.balance.toLocaleString('id-ID')}
Total Aset Investasi: Rp ${summary.totalInvestmentValue.toLocaleString('id-ID')}
Total Gabungan Aset: Rp ${summary.gabunganAset.toLocaleString('id-ID')}

Tolong berikan "Fixsasi" atau kesimpulan analisis profesional namun ramah mengenai kondisi keuangan saya saat ini, dan berikan saran untuk bulan depan. Tulis dalam bahasa Indonesia yang memotivasi. Format dengan poin-poin.`;

      const response = await axios.post(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`,
        {
          contents: [{ parts: [{ text: prompt }] }],
        }
      );

      const analysisText = response.data.candidates[0].content.parts[0].text;
      setAiAnalysis(analysisText);
      setMascotMood('excited');
      setMascotMessage('Analisis selesai! Hasilnya luar biasa!');
      
      // Auto save to database
      await axios.post(`${API_URL}/monthly-reports`, {
        month: new Date().toISOString().substring(0, 7), // YYYY-MM
        totalAssets: summary.gabunganAset,
        totalIncome: summary.totalIncome,
        totalExpense: summary.totalExpense,
        investmentValue: summary.totalInvestmentValue,
        aiAnalysis: analysisText
      });
      
    } catch (error) {
      console.error("Failed to generate AI analysis:", error);
      setMascotMood('neutral');
      setMascotMessage('Waduh, gagal menganalisis. Coba lagi ya!');
    } finally {
      setIsAnalyzing(false);
    }
  };

  if (loading) return <div className="flex h-full items-center justify-center"><div className="animate-pulse text-emerald-500">Memuat Laporan...</div></div>;

  return (
    <div className="space-y-6 pb-20 md:pb-0 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-800 tracking-tight flex items-center gap-2">
            <FileText className="text-emerald-500" />
            Laporan Keuangan
          </h1>
          <p className="text-slate-500 mt-1">Draf laporan sementara bulan ini.</p>
        </div>
        <button 
          onClick={handleFixsasiAI}
          disabled={isAnalyzing}
          className="btn-primary flex items-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
        >
          {isAnalyzing ? <Loader2 className="animate-spin" size={18} /> : <Bot size={18} />}
          {isAnalyzing ? 'Menganalisis...' : 'Fixsasi AI'}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="glass-panel p-6">
          <h3 className="text-lg font-bold text-slate-800 border-b border-slate-100 pb-3 mb-4">Ringkasan Bulan Ini</h3>
          
          <div className="space-y-4">
            <div className="flex justify-between items-center p-3 bg-slate-50 rounded-lg border border-slate-100">
              <span className="text-slate-600 font-medium">Total Pemasukan</span>
              <span className="text-emerald-600 font-bold">{formatCurrencyMasked(summary.totalIncome)}</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-slate-50 rounded-lg border border-slate-100">
              <span className="text-slate-600 font-medium">Total Pengeluaran</span>
              <span className="text-rose-600 font-bold">{formatCurrencyMasked(summary.totalExpense)}</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-slate-50 rounded-lg border border-slate-100">
              <span className="text-slate-600 font-medium">Aset Investasi</span>
              <span className="text-sky-600 font-bold">{formatCurrencyMasked(summary.totalInvestmentValue)}</span>
            </div>
            <div className="flex justify-between items-center p-4 bg-emerald-50 rounded-xl border border-emerald-100 mt-6">
              <span className="text-emerald-800 font-bold text-lg">Total Kekayaan</span>
              <span className="text-emerald-700 font-black text-xl">{formatCurrencyMasked(summary.gabunganAset)}</span>
            </div>
          </div>
          
          <p className="text-xs text-slate-400 mt-6 italic flex items-center gap-1">
            * Laporan akan terekap otomatis di database setiap akhir bulan.
          </p>
        </div>

        <div className="glass-panel p-6 flex flex-col">
          <h3 className="text-lg font-bold text-slate-800 border-b border-slate-100 pb-3 mb-4 flex items-center gap-2">
            <Bot className="text-indigo-500" size={20} />
            Analisis Fixsasi AI
          </h3>
          
          <div className="flex-1 bg-slate-50 rounded-xl border border-slate-200 p-4 overflow-y-auto max-h-[400px]">
            {aiAnalysis ? (
              <div className="prose prose-sm prose-slate max-w-none">
                <ReactMarkdown>{aiAnalysis}</ReactMarkdown>
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-slate-400 space-y-3">
                <Bot size={48} className="text-slate-300 opacity-50" />
                <p className="text-center">Klik tombol "Fixsasi AI" di atas<br/>untuk menganalisis laporan bulan ini.</p>
              </div>
            )}
          </div>
        </div>
      </div>
      
      <Mascot message={mascotMessage} mood={mascotMood} />
    </div>
  );
}
