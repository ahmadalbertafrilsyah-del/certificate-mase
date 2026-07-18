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
  
  const [isCollapsed, setIsCollapsed] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
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
      
      <aside className={`fixed bottom-0 w-full md:relative bg-white flex flex-col border-t md:border-t-0 md:border-r border-slate-200 shadow-[4px_0_24px_rgba(0,0,0,0.02)] z-50 order-2 md:order-1 h-16 md:h-screen transition-all duration-300 ${isCollapsed ? 'md:w-24' : 'md:w-72'}`}>
        
        <button 
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="hidden md:flex absolute -right-3 top-8 w-6 h-6 bg-emerald-600 text-white rounded-full items-center justify-center shadow-md z-50 hover:bg-emerald-500 transition-colors"
        >
            {isCollapsed ? '▶' : '◀'}
        </button>

        <div className={`hidden md:flex flex-col p-6 border-b border-slate-100 transition-all ${isCollapsed ? 'items-center' : 'items-start'}`}>
            <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-md shrink-0 overflow-hidden p-1 border border-slate-100">
                    <img src="https://i.ibb.co.com/21s67v2h/maseid.jpg" alt="Logo" className="w-full h-full object-contain" />
                </div>
                {!isCollapsed && <h1 className="text-xl font-black text-slate-900 tracking-wide transition-opacity">Mahatma</h1>}
            </div>
            {!isCollapsed && <p className="text-[9px] font-bold text-emerald-600 uppercase tracking-widest bg-emerald-50 inline-block px-3 py-1.5 rounded-md mt-2">Portal Admin Resmi</p>}
        </div>

        <nav className="flex md:flex-col justify-around md:justify-start items-center md:items-stretch h-full md:h-auto md:flex-1 p-2 md:p-4 md:space-y-3">
            {!isCollapsed && <p className="hidden md:block text-[10px] font-bold text-slate-400 uppercase tracking-widest px-4 mb-2 mt-2">Menu Utama</p>}
            
            <Link href="/admin" title="Dashboard" className={`flex flex-col md:flex-row items-center gap-1 md:gap-3 px-4 py-2 md:py-3.5 rounded-xl text-[10px] md:text-sm font-bold transition-all ${pathname === '/admin' ? 'text-emerald-800 bg-emerald-50 border border-emerald-100 shadow-sm' : 'text-slate-500 hover:text-emerald-700 hover:bg-slate-50 border border-transparent'} ${isCollapsed ? 'justify-center' : ''}`}>
                <span className="text-lg md:text-base">📊</span> {!isCollapsed && <span className="hidden md:inline">Dashboard</span>}
            </Link>
            
            <Link href="/admin/services" title="Layanan" className={`flex flex-col md:flex-row items-center gap-1 md:gap-3 px-4 py-2 md:py-3.5 rounded-xl text-[10px] md:text-sm font-bold transition-all ${pathname.includes('/admin/services') ? 'text-emerald-800 bg-emerald-50 border border-emerald-100 shadow-sm' : 'text-slate-500 hover:text-emerald-700 hover:bg-slate-50 border border-transparent'} ${isCollapsed ? 'justify-center' : ''}`}>
                <span className="text-lg md:text-base">📑</span> {!isCollapsed && <span className="hidden md:inline">Layanan (Service)</span>}
            </Link>
            
            <Link href="/admin/certificates" title="Sertifikat & Acara" className={`flex flex-col md:flex-row items-center gap-1 md:gap-3 px-4 py-2 md:py-3.5 rounded-xl text-[10px] md:text-sm font-bold transition-all ${pathname.includes('/admin/certificates') ? 'text-emerald-800 bg-emerald-50 border border-emerald-100 shadow-sm' : 'text-slate-500 hover:text-emerald-700 hover:bg-slate-50 border border-transparent'} ${isCollapsed ? 'justify-center' : ''}`}>
                <span className="text-lg md:text-base">🎓</span> {!isCollapsed && <span className="hidden md:inline">Sertifikat & Acara</span>}
            </Link>
        </nav>

        <div className="hidden md:block p-4 border-t border-slate-100">
            <button onClick={handleLogout} title="Keluar Sistem" className={`w-full px-4 py-3 rounded-xl text-sm font-bold text-red-500 hover:bg-red-50 hover:text-red-600 transition-colors flex items-center border border-transparent hover:border-red-100 ${isCollapsed ? 'justify-center' : 'justify-between'}`}>
                {isCollapsed ? <span className="text-lg">⏏️</span> : <>Keluar Sistem <span className="text-lg">&rarr;</span></>}
            </button>
        </div>
      </aside>

      <main className="flex-1 h-[calc(100vh-4rem)] md:h-screen overflow-y-auto order-1 md:order-2 bg-[#f8fafc] pb-20 md:pb-0">
        {children}
      </main>
    </div>
  );
}