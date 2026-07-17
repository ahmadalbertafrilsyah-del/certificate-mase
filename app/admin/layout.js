"use client";
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { auth } from '@/lib/firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';

export default function AdminLayout({ children }) {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      // Hanya kunci halaman jika belum login DAN sedang berada di rute /admin (bukan login)
      if (!currentUser && pathname !== '/admin/login') {
        router.push('/admin/login');
      } else {
        setUser(currentUser);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, [pathname, router]);

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-slate-50"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div></div>;
  if (pathname === '/admin/login') return children;
  if (!user) return null;

  const handleLogout = async () => {
    await signOut(auth);
    router.push('/admin/login');
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] flex flex-col md:flex-row text-slate-800">
      
      {/* SIDEBAR TERANG (DESKTOP) & BOTTOM NAV (MOBILE) */}
      <aside className="fixed bottom-0 w-full md:relative md:w-72 bg-white flex flex-col border-t md:border-t-0 md:border-r border-slate-200 shadow-[0_-4px_20px_rgba(0,0,0,0.02)] md:shadow-[4px_0_24px_rgba(0,0,0,0.02)] z-50 order-2 md:order-1 h-16 md:h-screen transition-all">
        
        <div className="hidden md:block p-8 border-b border-slate-100 text-center md:text-left">
            <div className="flex items-center justify-center md:justify-start gap-3 mb-2">
                <div className="w-10 h-10 bg-emerald-600 rounded-xl flex items-center justify-center text-white font-black shadow-md">M</div>
                <h1 className="text-xl font-black text-slate-900 tracking-wide">Mahatma</h1>
            </div>
            <p className="text-[9px] font-bold text-emerald-600 uppercase tracking-widest bg-emerald-50 inline-block px-3 py-1.5 rounded-md mt-2">Portal Admin Resmi</p>
        </div>

        <nav className="flex md:flex-col justify-around md:justify-start items-center md:items-stretch h-full md:h-auto md:flex-1 p-2 md:p-6 md:space-y-3">
            <p className="hidden md:block text-[10px] font-bold text-slate-400 uppercase tracking-widest px-4 mb-2 mt-2">Menu Utama</p>
            
            <Link href="/admin" className={`flex flex-col md:flex-row items-center gap-1 md:gap-3 px-4 py-2 md:py-3.5 rounded-xl text-[10px] md:text-sm font-bold transition-all ${pathname === '/admin' ? 'text-emerald-800 bg-emerald-50 border border-emerald-100 shadow-sm' : 'text-slate-500 hover:text-emerald-700 hover:bg-slate-50 border border-transparent'}`}>
                <span className="text-lg md:text-base">📊</span> <span className="hidden md:inline">Dashboard</span>
            </Link>
            
            <Link href="/admin/services" className={`flex flex-col md:flex-row items-center gap-1 md:gap-3 px-4 py-2 md:py-3.5 rounded-xl text-[10px] md:text-sm font-bold transition-all ${pathname.includes('/admin/services') ? 'text-emerald-800 bg-emerald-50 border border-emerald-100 shadow-sm' : 'text-slate-500 hover:text-emerald-700 hover:bg-slate-50 border border-transparent'}`}>
                <span className="text-lg md:text-base">📑</span> <span className="hidden md:inline">Layanan (Service)</span>
            </Link>
            
            <Link href="/admin/certificates" className={`flex flex-col md:flex-row items-center gap-1 md:gap-3 px-4 py-2 md:py-3.5 rounded-xl text-[10px] md:text-sm font-bold transition-all ${pathname.includes('/admin/certificates') ? 'text-emerald-800 bg-emerald-50 border border-emerald-100 shadow-sm' : 'text-slate-500 hover:text-emerald-700 hover:bg-slate-50 border border-transparent'}`}>
                <span className="text-lg md:text-base">🎓</span> <span className="hidden md:inline">Sertifikat & Acara</span>
            </Link>
        </nav>

        <div className="hidden md:block p-6 border-t border-slate-100">
            <button onClick={handleLogout} className="w-full text-left px-4 py-3 rounded-xl text-sm font-bold text-red-500 hover:bg-red-50 hover:text-red-600 transition-colors flex items-center justify-between border border-transparent hover:border-red-100">
                Keluar Sistem <span className="text-lg">&rarr;</span>
            </button>
        </div>
      </aside>

      <main className="flex-1 h-[calc(100vh-4rem)] md:h-screen overflow-y-auto order-1 md:order-2 bg-[#f8fafc] pb-20 md:pb-0">
        {children}
      </main>
    </div>
  );
}