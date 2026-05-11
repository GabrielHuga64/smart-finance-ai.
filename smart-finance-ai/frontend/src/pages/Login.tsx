import { useState } from 'react';
import { GoogleLogin } from '@react-oauth/google';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { ShieldCheck, TrendingUp, AlertCircle } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || '/_/backend/api';

export default function Login() {
  const { login } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSuccess = async (credentialResponse: any) => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await axios.post(`${API_URL}/auth/google`, {
        token: credentialResponse.credential,
      });
      login(res.data.token, res.data.user);
    } catch (err) {
      console.error(err);
      setError('Gagal login dengan Google. Silakan coba lagi.');
      setIsLoading(false);
    }
  };

  const handleError = () => {
    setError('Login dibatalkan atau gagal.');
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex flex-col justify-center items-center p-4 relative overflow-hidden">
      {/* Background decorations */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-sky-400/20 dark:bg-sky-600/10 blur-[120px]" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-emerald-400/20 dark:bg-emerald-600/10 blur-[120px]" />

      <div className="glass-panel p-8 md:p-12 w-full max-w-md text-center animate-in fade-in slide-in-from-bottom-8 duration-700 relative z-10">
        <div className="w-20 h-20 mx-auto bg-gradient-to-br from-sky-500 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-sky-500/30 mb-8 transform -rotate-6 hover:rotate-0 transition-transform duration-300">
          <TrendingUp size={40} className="text-white" />
        </div>
        
        <h1 className="text-3xl font-bold text-slate-800 dark:text-white mb-2">Smart Finance AI</h1>
        <p className="text-slate-500 dark:text-slate-400 mb-8">
          Kelola aset dan keuangan Anda dengan cerdas, aman, dan privat.
        </p>

        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700/50">
          <h2 className="text-lg font-semibold text-slate-700 dark:text-slate-200 mb-6 flex items-center justify-center gap-2">
            <ShieldCheck className="text-emerald-500" size={20} />
            Login untuk Melanjutkan
          </h2>

          {error && (
            <div className="mb-6 p-3 bg-rose-50 dark:bg-rose-900/30 border border-rose-100 dark:border-rose-800 rounded-lg flex items-start gap-2 text-left">
              <AlertCircle className="text-rose-500 shrink-0 mt-0.5" size={16} />
              <p className="text-sm text-rose-600 dark:text-rose-400">{error}</p>
            </div>
          )}

          {isLoading ? (
            <div className="flex flex-col items-center py-4">
              <div className="w-8 h-8 border-4 border-sky-200 border-t-sky-500 rounded-full animate-spin mb-4"></div>
              <p className="text-sm text-slate-500 dark:text-slate-400">Mengautentikasi...</p>
            </div>
          ) : (
            <div className="flex justify-center">
              <GoogleLogin
                onSuccess={handleSuccess}
                onError={handleError}
                useOneTap
                theme="outline"
                shape="pill"
              />
            </div>
          )}
        </div>

        <p className="text-xs text-slate-400 dark:text-slate-500 mt-8">
          Data Anda dienkripsi dan diisolasi secara ketat. Tidak ada pengguna lain yang dapat melihat data Anda.
        </p>
      </div>
    </div>
  );
}
