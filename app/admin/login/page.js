"use client";
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { auth } from '@/lib/firebase'; 
import { signInWithEmailAndPassword } from 'firebase/auth';

export default function AdminLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      await signInWithEmailAndPassword(auth, email, password);
      router.push('/admin');
    } catch (err) {
      setError("Login gagal! Periksa kembali email dan password Anda.");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-3xl shadow-[0_10px_40px_rgba(0,0,0,0.08)] border border-slate-100 overflow-hidden">
        <div className="bg-emerald-50 p-10 text-center border-b border-emerald-100">
            <div className="w-14 h-14 bg-emerald-600 rounded-2xl mx-auto flex items-center justify-center text-white font-black text-3xl shadow-lg mb-5">M</div>
            <h1 className="text-2xl font-black text-emerald-900 tracking-wide">Portal Admin</h1>
            <p className="text-emerald-600 text-[10px] font-bold tracking-widest uppercase mt-2">Mahatma E-Certificate</p>
        </div>
        
        <form onSubmit={handleLogin} className="p-8">
            {error && <div className="mb-6 p-3 bg-red-50 border border-red-100 text-red-600 text-xs font-bold rounded-lg text-center">{error}</div>}
            <div className="space-y-5">
                <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-2">Email Admin</label>
                    <input 
                        type="email" required 
                        value={email} onChange={e => setEmail(e.target.value)}
                        className="w-full border-2 border-slate-100 p-3.5 rounded-xl focus:border-emerald-500 outline-none text-sm font-bold bg-slate-50 focus:bg-white transition-colors" 
                        placeholder="admin@mahatma.id" 
                    />
                </div>
                <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-2">Password</label>
                    <input 
                        type="password" required 
                        value={password} onChange={e => setPassword(e.target.value)}
                        className="w-full border-2 border-slate-100 p-3.5 rounded-xl focus:border-emerald-500 outline-none text-sm font-bold bg-slate-50 focus:bg-white transition-colors" 
                        placeholder="••••••••" 
                    />
                </div>
            </div>
            
            <button 
                type="submit" 
                disabled={loading}
                className="w-full mt-8 bg-emerald-600 hover:bg-emerald-500 disabled:bg-emerald-300 text-white font-bold py-4 rounded-xl transition-all shadow-md text-sm uppercase tracking-wider"
            >
                {loading ? 'Memverifikasi...' : 'Masuk ke Dashboard'}
            </button>
        </form>
      </div>
    </div>
  );
}