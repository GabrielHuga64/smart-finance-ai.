import { useState } from 'react';
import axios from 'axios';
import { motion } from 'framer-motion';
import { Sparkles, Loader2, MessageSquareText } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'https://aplikasikeuangan-lemon.vercel.app/api';

export default function Advisor() {
  const [analysis, setAnalysis] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleAnalyze = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await axios.post(`${API_URL}/ai/analyze`);
      setAnalysis(res.data.analysis);
    } catch (err) {
      console.error(err);
      setError('Failed to generate analysis. Make sure GEMINI_API_KEY is configured in the backend.');
    } finally {
      setLoading(false);
    }
  };

  // Function to render markdown-like text securely
  const formatText = (text: string) => {
    return text.split('\n').map((line, i) => {
      if (line.startsWith('**') || line.startsWith('##')) {
        return <h3 key={i} className="text-xl font-bold mt-6 mb-2 text-emerald-400">{line.replace(/[*#]/g, '')}</h3>;
      }
      if (line.startsWith('- ') || line.startsWith('* ')) {
        return <li key={i} className="ml-6 mb-2 list-disc">{line.substring(2).replace(/\*\*(.*?)\*\*/g, '$1')}</li>;
      }
      if (line.trim() === '') return <br key={i} />;
      return <p key={i} className="mb-2 text-slate-300 leading-relaxed">{line.replace(/\*\*(.*?)\*\*/g, '$1')}</p>;
    });
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto h-full flex flex-col">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-3 text-slate-800 dark:text-slate-100">
          <Sparkles className="text-emerald-500" />
          AI Financial Advisor
        </h1>
        <p className="text-slate-500 dark:text-slate-400 mt-2">
          Get personalized financial advice, cashflow evaluation, and investment suggestions powered by Google Gemini 2.5 Flash.
        </p>
      </div>

      <div className="glass-panel flex-1 p-6 md:p-8 flex flex-col overflow-hidden relative">
        {/* Background glow */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 blur-3xl rounded-full" />
        
        {!analysis && !loading && !error && (
          <div className="flex-1 flex flex-col items-center justify-center text-center space-y-6 z-10">
            <div className="w-20 h-20 bg-slate-100 dark:bg-slate-800/80 rounded-full flex items-center justify-center shadow-xl border border-slate-200 dark:border-slate-700/50">
              <MessageSquareText size={32} className="text-emerald-500" />
            </div>
            <div>
              <h2 className="text-2xl font-semibold mb-2 text-slate-800 dark:text-slate-100">Ready for your analysis?</h2>
              <p className="text-slate-500 dark:text-slate-400 max-w-md mx-auto">
                I will analyze all your recent transactions, evaluate your cashflow health, and recommend investment strategies based on current market trends.
              </p>
            </div>
            <button onClick={handleAnalyze} className="btn-primary flex items-center gap-2 text-lg px-8 py-4">
              <Sparkles size={24} />
              <span>Generate My Financial Report</span>
            </button>
          </div>
        )}

        {loading && (
          <div className="flex-1 flex flex-col items-center justify-center text-center space-y-4 z-10">
            <Loader2 size={48} className="text-emerald-500 animate-spin" />
            <p className="text-emerald-400 font-medium animate-pulse text-lg">
              Analyzing your financial data...
            </p>
            <p className="text-slate-500 dark:text-slate-400 text-sm">Gemini is evaluating your cashflow and fetching market trends.</p>
          </div>
        )}

        {error && (
          <div className="flex-1 flex flex-col items-center justify-center text-center z-10">
            <div className="text-rose-400 bg-rose-500/10 p-6 rounded-2xl border border-rose-500/20 max-w-lg">
              <p className="font-semibold mb-2 text-lg">Analysis Failed</p>
              <p className="text-sm opacity-90 mb-6">{error}</p>
              <button onClick={handleAnalyze} className="btn-secondary">Try Again</button>
            </div>
          </div>
        )}

        {analysis && !loading && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex-1 overflow-y-auto pr-4 custom-scrollbar z-10"
          >
            <div className="bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700/50 p-6 md:p-8 rounded-2xl shadow-inner">
              <div className="flex items-center gap-3 mb-6 pb-6 border-b border-slate-200 dark:border-slate-700/50">
                <div className="p-2 bg-emerald-500/20 rounded-lg">
                  <Sparkles className="text-emerald-500 dark:text-emerald-400" size={24} />
                </div>
                <div>
                  <h3 className="font-bold text-lg text-slate-800 dark:text-slate-200">Gemini Report</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Personalized Financial Analysis</p>
                </div>
              </div>
              <div className="text-slate-700 dark:text-slate-200">
                {formatText(analysis)}
              </div>
            </div>
            <div className="mt-6 flex justify-center pb-4">
               <button onClick={handleAnalyze} className="btn-secondary flex items-center gap-2">
                 <Sparkles size={16} />
                 Regenerate Analysis
               </button>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
