import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { Bot, FileText, Loader2, Download, Trash2, Edit2, Check, X, History, Building2 } from 'lucide-react';
import { useBalance } from '../context/BalanceContext';
import Mascot from '../components/Mascot';
import ReactMarkdown from 'react-markdown';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

const API_URL = import.meta.env.VITE_API_URL || '/_/backend/api';
const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

interface MonthlyReport {
  id: string;
  month: string;
  totalAssets: number;
  totalIncome: number;
  totalExpense: number;
  investmentValue: number;
  aiAnalysis: string;
  createdAt: string;
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
  dividendRecords?: InvestmentDividend[];
}

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

  // History Tab State
  const [activeTab, setActiveTab] = useState<'current' | 'history' | 'dividends'>('current');
  const [historyReports, setHistoryReports] = useState<MonthlyReport[]>([]);
  const [investments, setInvestments] = useState<Investment[]>([]);
  const [editingReportId, setEditingReportId] = useState<string | null>(null);
  const [editAnalysisText, setEditAnalysisText] = useState('');
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const printRef = useRef<HTMLDivElement>(null);
  const [printReport, setPrintReport] = useState<MonthlyReport | null>(null);

  const fetchData = async () => {
    try {
      const [sumRes, histRes, invRes] = await Promise.all([
        axios.get(`${API_URL}/summary`),
        axios.get(`${API_URL}/monthly-reports`),
        axios.get(`${API_URL}/investments`)
      ]);
      setSummary(sumRes.data);
      setHistoryReports(histRes.data);
      setInvestments(invRes.data);
    } catch (error) {
      console.error("Failed to fetch data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
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
      const monthFormatter = new Intl.DateTimeFormat('id-ID', { month: 'long', year: 'numeric' });
      await axios.post(`${API_URL}/monthly-reports`, {
        month: monthFormatter.format(new Date()),
        totalAssets: summary.gabunganAset,
        totalIncome: summary.totalIncome,
        totalExpense: summary.totalExpense,
        investmentValue: summary.totalInvestmentValue,
        aiAnalysis: analysisText
      });
      
      fetchData();
    } catch (error) {
      console.error("Failed to generate AI analysis:", error);
      setMascotMood('neutral');
      setMascotMessage('Waduh, gagal menganalisis. Coba lagi ya!');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleEditInit = (report: MonthlyReport) => {
    setEditingReportId(report.id);
    setEditAnalysisText(report.aiAnalysis || '');
  };

  const handleEditSave = async (id: string) => {
    try {
      await axios.put(`${API_URL}/monthly-reports/${id}`, { aiAnalysis: editAnalysisText });
      setEditingReportId(null);
      fetchData();
    } catch (error) {
      console.error("Failed to update report", error);
      alert('Gagal menyimpan laporan.');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Hapus histori laporan ini?')) return;
    try {
      await axios.delete(`${API_URL}/monthly-reports/${id}`);
      fetchData();
    } catch (error) {
      console.error("Failed to delete", error);
    }
  };

  const handleDownloadPDF = async (report: MonthlyReport) => {
    setDownloadingId(report.id);
    setPrintReport(report);
    // Give state time to update and render the hidden template
    setTimeout(async () => {
      if (printRef.current) {
        try {
          const canvas = await html2canvas(printRef.current, { scale: 2 });
          const imgData = canvas.toDataURL('image/png');
          const pdf = new jsPDF('p', 'mm', 'a4');
          const pdfWidth = pdf.internal.pageSize.getWidth();
          const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
          
          pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
          pdf.save(`Laporan_Keuangan_${report.month.replace(' ', '_')}.pdf`);
        } catch (error) {
          console.error("Failed to generate PDF", error);
          alert("Gagal membuat PDF");
        }
      }
      setPrintReport(null);
      setDownloadingId(null);
    }, 1000);
  };

  if (loading) return <div className="flex h-full items-center justify-center"><div className="animate-pulse text-emerald-500">Memuat Laporan...</div></div>;

  // Process Dividend Data
  const dividendByYearAndStock: Record<string, Record<string, number>> = {};
  const allYearsSet = new Set<string>();
  
  investments.forEach(inv => {
    if (inv.dividendRecords && inv.dividendRecords.length > 0) {
      inv.dividendRecords.forEach(record => {
        const year = new Date(record.date).getFullYear().toString();
        allYearsSet.add(year);
        if (!dividendByYearAndStock[year]) {
          dividendByYearAndStock[year] = {};
        }
        dividendByYearAndStock[year][inv.name] = (dividendByYearAndStock[year][inv.name] || 0) + record.amount;
      });
    }
  });

  const allYears = Array.from(allYearsSet).sort();
  
  // Prepare data for the BarChart
  const chartData = allYears.map(year => {
    const dataPoint: any = { year };
    let total = 0;
    Object.entries(dividendByYearAndStock[year]).forEach(([stock, amount]) => {
      dataPoint[stock] = amount;
      total += amount;
    });
    dataPoint.total = total;
    return dataPoint;
  });

  // Get distinct stock names for the chart bars
  const allDividendStocks = [...new Set(investments.filter(i => i.dividendRecords && i.dividendRecords.length > 0).map(i => i.name))];
  const COLORS = ['#38bdf8', '#10b981', '#f43f5e', '#8b5cf6', '#f59e0b', '#06b6d4', '#ec4899', '#84cc16', '#6366f1'];

  return (
    <div className="space-y-6 pb-20 md:pb-0 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-800 dark:text-slate-100 tracking-tight flex items-center gap-2">
            <FileText className="text-emerald-500" />
            Laporan Keuangan
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Laporan analitik portofolio keuangan Anda.</p>
        </div>
        {activeTab === 'current' && (
          <button 
            onClick={handleFixsasiAI}
            disabled={isAnalyzing}
            className="btn-primary flex items-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {isAnalyzing ? <Loader2 className="animate-spin" size={18} /> : <Bot size={18} />}
            {isAnalyzing ? 'Menganalisis...' : 'Fixsasi AI'}
          </button>
        )}
      </div>

      <div className="flex gap-4 border-b border-slate-200 dark:border-slate-700 pb-2">
        <button 
          onClick={() => setActiveTab('current')} 
          className={`font-semibold pb-2 border-b-2 transition-colors ${activeTab === 'current' ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400' : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
        >
          Draft Bulan Ini
        </button>
        <button 
          onClick={() => setActiveTab('history')} 
          className={`flex items-center gap-2 font-semibold pb-2 border-b-2 transition-colors ${activeTab === 'history' ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400' : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
        >
          <History size={18} /> Histori Laporan
        </button>
        <button 
          onClick={() => setActiveTab('dividends')} 
          className={`font-semibold pb-2 border-b-2 transition-colors ${activeTab === 'dividends' ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400' : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
        >
          Laporan Dividen
        </button>
      </div>

      {activeTab === 'current' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in slide-in-from-bottom-2">
          <div className="glass-panel p-6">
            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 border-b border-slate-100 dark:border-slate-700 pb-3 mb-4">Ringkasan Saat Ini</h3>
            
            <div className="space-y-4">
              <div className="flex justify-between items-center p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-100 dark:border-slate-700">
                <span className="text-slate-600 dark:text-slate-400 font-medium">Total Pemasukan</span>
                <span className="text-emerald-600 dark:text-emerald-400 font-bold">{formatCurrencyMasked(summary.totalIncome)}</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-100 dark:border-slate-700">
                <span className="text-slate-600 dark:text-slate-400 font-medium">Total Pengeluaran</span>
                <span className="text-rose-600 dark:text-rose-400 font-bold">{formatCurrencyMasked(summary.totalExpense)}</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-100 dark:border-slate-700">
                <span className="text-slate-600 dark:text-slate-400 font-medium">Aset Investasi</span>
                <span className="text-sky-600 dark:text-sky-400 font-bold">{formatCurrencyMasked(summary.totalInvestmentValue)}</span>
              </div>
              <div className="flex justify-between items-center p-4 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl border border-emerald-100 dark:border-emerald-800 mt-6">
                <span className="text-emerald-800 dark:text-emerald-400 font-bold text-lg">Total Kekayaan</span>
                <span className="text-emerald-700 dark:text-emerald-300 font-black text-xl">{formatCurrencyMasked(summary.gabunganAset)}</span>
              </div>
            </div>
            
            <p className="text-xs text-slate-400 mt-6 italic flex items-center gap-1">
              * Laporan akan otomatis tersimpan di tab "Histori Laporan" pada akhir bulan.
            </p>
          </div>

          <div className="glass-panel p-6 flex flex-col">
            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 border-b border-slate-100 dark:border-slate-700 pb-3 mb-4 flex items-center gap-2">
              <Bot className="text-indigo-500" size={20} />
              Analisis Fixsasi AI
            </h3>
            
            <div className="flex-1 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700 p-4 overflow-y-auto max-h-[400px]">
              {aiAnalysis ? (
                <div className="prose prose-sm prose-slate dark:prose-invert max-w-none">
                  <ReactMarkdown>{aiAnalysis}</ReactMarkdown>
                </div>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-slate-400 dark:text-slate-500 space-y-3">
                  <Bot size={48} className="text-slate-300 dark:text-slate-600 opacity-50" />
                  <p className="text-center">Klik tombol "Fixsasi AI" di atas<br/>untuk menganalisis laporan bulan ini.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : activeTab === 'history' ? (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2">
          {historyReports.map(report => (
            <div key={report.id} className="glass-panel p-6">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-slate-100 dark:border-slate-700 pb-4 mb-4 gap-4">
                <div>
                  <h3 className="text-xl font-bold text-emerald-600 dark:text-emerald-400">{report.month}</h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400">Total Aset: <span className="font-semibold text-slate-700 dark:text-slate-200">{formatCurrencyMasked(report.totalAssets)}</span></p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {editingReportId === report.id ? (
                    <>
                      <button onClick={() => handleEditSave(report.id)} className="flex items-center gap-1 px-3 py-1.5 bg-emerald-100 text-emerald-600 hover:bg-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:hover:bg-emerald-900/50 rounded-md transition-colors text-sm font-medium">
                        <Check size={16} /> Save
                      </button>
                      <button onClick={() => setEditingReportId(null)} className="flex items-center gap-1 px-3 py-1.5 bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700 rounded-md transition-colors text-sm font-medium">
                        <X size={16} /> Cancel
                      </button>
                    </>
                  ) : (
                    <>
                      <button onClick={() => handleDownloadPDF(report)} disabled={downloadingId === report.id} className="flex items-center gap-1 px-3 py-1.5 bg-sky-100 text-sky-600 hover:bg-sky-200 dark:bg-sky-900/30 dark:text-sky-400 dark:hover:bg-sky-900/50 rounded-md transition-colors text-sm font-medium disabled:opacity-50">
                        {downloadingId === report.id ? <Loader2 className="animate-spin" size={16} /> : <Download size={16} />} 
                        {downloadingId === report.id ? 'Generating...' : 'Download PDF'}
                      </button>
                      <button onClick={() => handleEditInit(report)} className="flex items-center gap-1 px-3 py-1.5 bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700 rounded-md transition-colors text-sm font-medium">
                        <Edit2 size={16} /> Edit
                      </button>
                      <button onClick={() => handleDelete(report.id)} className="flex items-center gap-1 px-3 py-1.5 bg-rose-100 text-rose-600 hover:bg-rose-200 dark:bg-rose-900/30 dark:text-rose-400 dark:hover:bg-rose-900/50 rounded-md transition-colors text-sm font-medium">
                        <Trash2 size={16} /> Delete
                      </button>
                    </>
                  )}
                </div>
              </div>
              
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
                <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-lg border border-slate-100 dark:border-slate-700">
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mb-1">Total Pemasukan</p>
                  <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400">{formatCurrencyMasked(report.totalIncome)}</p>
                </div>
                <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-lg border border-slate-100 dark:border-slate-700">
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mb-1">Total Pengeluaran</p>
                  <p className="text-sm font-bold text-rose-600 dark:text-rose-400">{formatCurrencyMasked(report.totalExpense)}</p>
                </div>
                <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-lg border border-slate-100 dark:border-slate-700">
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mb-1">Nilai Investasi</p>
                  <p className="text-sm font-bold text-sky-600 dark:text-sky-400">{formatCurrencyMasked(report.investmentValue)}</p>
                </div>
              </div>

              <div>
                <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-2">
                  <Bot size={16} className="text-indigo-500" /> Analisis Finansial
                </h4>
                {editingReportId === report.id ? (
                  <textarea 
                    value={editAnalysisText}
                    onChange={(e) => setEditAnalysisText(e.target.value)}
                    className="w-full h-64 p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-emerald-500 outline-none resize-none font-mono text-sm"
                  />
                ) : (
                  <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700 p-4 prose prose-sm prose-slate dark:prose-invert max-w-none">
                    <ReactMarkdown>{report.aiAnalysis || '*Tidak ada analisis.*'}</ReactMarkdown>
                  </div>
                )}
              </div>
            </div>
          ))}
          {historyReports.length === 0 && (
            <div className="text-center py-10 text-slate-400 dark:text-slate-500">
              Belum ada histori laporan.
            </div>
          )}
        </div>
      ) : (
        <div className="animate-in fade-in slide-in-from-bottom-2 space-y-6">
          <div className="glass-panel p-6">
            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 border-b border-slate-100 dark:border-slate-700 pb-3 mb-6">Grafik Dividen Tahunan</h3>
            
            {chartData.length > 0 ? (
              <div className="h-[350px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.2} />
                    <XAxis dataKey="year" stroke="#64748b" />
                    <YAxis stroke="#64748b" tickFormatter={(value) => `Rp ${value.toLocaleString('id-ID')}`} />
                    <Tooltip 
                      formatter={(value: any) => formatCurrencyMasked(value)} 
                      contentStyle={{ borderRadius: '8px', backgroundColor: 'var(--color-bg)', color: 'var(--color-text-main)', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} 
                    />
                    <Legend />
                    {allDividendStocks.map((stock, index) => (
                      <Bar key={stock} dataKey={stock} stackId="a" fill={COLORS[index % COLORS.length]} radius={[0, 0, 0, 0]} />
                    ))}
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="text-center py-10 text-slate-400 dark:text-slate-500">
                Belum ada data dividen. Tambahkan dividen melalui menu Investments.
              </div>
            )}
          </div>

          <div className="glass-panel p-6">
            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 border-b border-slate-100 dark:border-slate-700 pb-3 mb-4">Rincian Dividen per Saham</h3>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-600 dark:text-slate-300">
                <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-700">
                  <tr>
                    <th className="px-4 py-3">Tahun</th>
                    <th className="px-4 py-3">Nama Saham</th>
                    <th className="px-4 py-3 text-right">Total Dividen</th>
                  </tr>
                </thead>
                <tbody>
                  {allYears.length > 0 ? (
                    allYears.map(year => (
                      <React.Fragment key={year}>
                        {Object.entries(dividendByYearAndStock[year]).map(([stock, amount], idx) => (
                          <tr key={`${year}-${stock}`} className="border-b border-slate-100 dark:border-slate-700/50 hover:bg-slate-50/50 dark:hover:bg-slate-800/50">
                            {idx === 0 && (
                              <td className="px-4 py-3 font-bold text-slate-800 dark:text-slate-200 align-top" rowSpan={Object.keys(dividendByYearAndStock[year]).length}>
                                {year}
                              </td>
                            )}
                            <td className="px-4 py-3 font-medium text-emerald-600 dark:text-emerald-400">{stock}</td>
                            <td className="px-4 py-3 text-right font-bold text-slate-700 dark:text-slate-300">{formatCurrencyMasked(amount)}</td>
                          </tr>
                        ))}
                        <tr className="bg-slate-50 dark:bg-slate-800/30 border-b-2 border-slate-200 dark:border-slate-700">
                          <td className="px-4 py-2 font-bold text-slate-600 dark:text-slate-400" colSpan={2}>Total {year}</td>
                          <td className="px-4 py-2 text-right font-black text-emerald-600 dark:text-emerald-400">
                            {formatCurrencyMasked(Object.values(dividendByYearAndStock[year]).reduce((sum, val) => sum + val, 0))}
                          </td>
                        </tr>
                      </React.Fragment>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={3} className="px-4 py-6 text-center text-slate-400 italic">Data dividen kosong.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
      
      {/* Hidden Corporate Template for PDF generation */}
      {printReport && (
        <div style={{ position: 'absolute', top: '-10000px', left: '-10000px' }}>
          <div ref={printRef} className="bg-white text-slate-800 p-10 w-[800px] font-sans" style={{ minHeight: '1122px' }}>
            {/* Header */}
            <div className="flex justify-between items-center border-b-4 border-emerald-600 pb-6 mb-8">
              <div className="flex items-center gap-3">
                <Building2 size={40} className="text-emerald-600" />
                <div>
                  <h1 className="text-3xl font-black text-slate-900 tracking-tight">SMART FINANCE</h1>
                  <p className="text-sm font-semibold text-emerald-600 tracking-widest uppercase">Executive Financial Report</p>
                </div>
              </div>
              <div className="text-right">
                <h2 className="text-xl font-bold text-slate-800">Periode: {printReport.month}</h2>
                <p className="text-slate-500 text-sm">Dicetak pada: {new Date().toLocaleDateString('id-ID')}</p>
              </div>
            </div>

            {/* Financial Highlights */}
            <div className="mb-8">
              <h3 className="text-lg font-bold text-slate-800 border-b border-slate-300 pb-2 mb-4 uppercase tracking-wider">Ringkasan Eksekutif</h3>
              <div className="grid grid-cols-2 gap-6">
                <div className="bg-slate-50 p-5 rounded-lg border border-slate-200">
                  <p className="text-slate-500 text-sm font-semibold mb-1">Total Gabungan Aset</p>
                  <p className="text-2xl font-black text-emerald-700">{formatCurrencyMasked(printReport.totalAssets)}</p>
                </div>
                <div className="bg-slate-50 p-5 rounded-lg border border-slate-200">
                  <p className="text-slate-500 text-sm font-semibold mb-1">Nilai Investasi</p>
                  <p className="text-2xl font-black text-sky-700">{formatCurrencyMasked(printReport.investmentValue)}</p>
                </div>
                <div className="bg-slate-50 p-5 rounded-lg border border-slate-200">
                  <p className="text-slate-500 text-sm font-semibold mb-1">Total Pemasukan</p>
                  <p className="text-xl font-bold text-emerald-600">{formatCurrencyMasked(printReport.totalIncome)}</p>
                </div>
                <div className="bg-slate-50 p-5 rounded-lg border border-slate-200">
                  <p className="text-slate-500 text-sm font-semibold mb-1">Total Pengeluaran</p>
                  <p className="text-xl font-bold text-rose-600">{formatCurrencyMasked(printReport.totalExpense)}</p>
                </div>
              </div>
            </div>

            {/* AI Analysis */}
            <div className="mb-8">
              <h3 className="text-lg font-bold text-slate-800 border-b border-slate-300 pb-2 mb-4 uppercase tracking-wider">Analisis Finansial (AI)</h3>
              <div className="prose prose-sm max-w-none text-slate-700 leading-relaxed bg-slate-50 p-6 rounded-lg border border-slate-200">
                <ReactMarkdown>{printReport.aiAnalysis || ''}</ReactMarkdown>
              </div>
            </div>

            {/* Footer */}
            <div className="mt-12 pt-6 border-t border-slate-200 text-center text-sm text-slate-500">
              <p>Dokumen ini di-generate secara otomatis oleh Smart Finance AI.</p>
              <p className="mt-1">Rahasia & Dokumen Pribadi</p>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'current' && <Mascot message={mascotMessage} mood={mascotMood} />}
    </div>
  );
}
