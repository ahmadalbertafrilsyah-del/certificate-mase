"use client";
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { db } from '@/lib/firebase';
import { collection, getDocs, query, orderBy, limit } from 'firebase/firestore';

export default function CertificatePortal() {
  const [searchId, setSearchId] = useState('');
  const [events, setEvents] = useState([]);
  const router = useRouter();

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const q = query(collection(db, "events"), orderBy("createdAt", "desc"), limit(3));
        const querySnapshot = await getDocs(q);
        setEvents(querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      } catch (error) {
        console.error("Gagal mengambil data acara", error);
      }
    };
    fetchEvents();
  }, []);

  const containerVariants = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.2 } } };
  const itemVariants = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 50 } } };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col overflow-hidden">
      
      <motion.header 
        initial={{ y: -100, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 0.8, ease: "easeOut" }}
        className="absolute top-0 w-full z-50 py-4 md:py-6 bg-slate-950/30 backdrop-blur-md border-b border-white/10"
      >
        <div className="container mx-auto px-4 lg:px-16 flex justify-between items-center max-w-7xl">
          <div className="flex items-center gap-3">
             <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-[0_0_15px_rgba(16,185,129,0.5)] overflow-hidden p-1">
                 <img src="https://i.ibb.co.com/N2sxbS2k/logo.png" alt="Logo Mahatma" className="w-full h-full object-contain" />
             </div>
             <div className="flex flex-col">
                <span className="font-extrabold text-base md:text-lg tracking-tight text-white">Mahatma <span className="text-emerald-400">Academy</span></span>
                <span className="text-[8px] md:text-[9px] font-bold tracking-widest uppercase text-slate-300">Sistem Verifikasi Digital</span>
             </div>
          </div>
          
          <Link href="/admin/login" className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 border border-white/20 rounded-full text-white text-xs font-bold transition-all shadow-sm backdrop-blur-sm">
             <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5.121 17.804A13.937 13.937 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0zm6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
             <span className="hidden md:inline uppercase tracking-widest text-[10px]">Admin</span>
          </Link>
        </div>
      </motion.header>

      <section className="relative bg-slate-950 pt-32 pb-20 md:pt-40 md:pb-32 px-4 flex flex-col items-center justify-center min-h-[60vh] md:min-h-[75vh]">
        <motion.div 
          animate={{ y: [0, -20, 0], scale: [1, 1.05, 1], opacity: [0.2, 0.3, 0.2] }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-0 left-1/2 -translate-x-1/2 w-[150%] md:w-full max-w-3xl h-[300px] md:h-[500px] bg-emerald-900/50 rounded-full blur-[100px] md:blur-[120px] pointer-events-none"
        />
        
        <div className="relative z-10 max-w-4xl mx-auto text-center w-full mt-10 md:mt-0">
          <motion.h1 initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.2 }} className="text-3xl md:text-5xl lg:text-6xl font-black text-white mb-6 leading-tight drop-shadow-lg px-2">
            Verifikasi Keaslian <br className="hidden md:block" /> Sertifikat
          </motion.h1>
          <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.4 }} className="text-slate-300 mb-10 md:mb-14 text-sm md:text-base max-w-2xl mx-auto leading-relaxed px-4 font-medium">
            Pastikan kredibilitas dokumen Anda. Masukkan Nomor Seri Sertifikat yang diterbitkan secara resmi oleh Mahatma Academy.
          </motion.p>
          
          <motion.form 
            initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.6, delay: 0.6, type: "spring", bounce: 0.4 }} 
            onSubmit={e => { e.preventDefault(); searchId && router.push(`/verify/MASE-${searchId}`); }} 
            className="max-w-xl mx-auto bg-white/10 backdrop-blur-md p-2 rounded-2xl border border-white/20 mx-4 md:mx-auto hover:border-emerald-500/50 hover:shadow-[0_0_40px_rgba(16,185,129,0.3)] transition-all duration-500"
          >
            <div className="flex flex-col sm:flex-row gap-2 bg-white rounded-xl p-1.5 shadow-inner relative overflow-hidden">
                <div className="flex items-center w-full px-4 py-3.5 md:py-4 bg-transparent border-b sm:border-b-0 sm:border-r border-slate-100 focus-within:bg-slate-50 transition-colors rounded-t-lg sm:rounded-l-lg sm:rounded-tr-none">
                    <span className="text-slate-400 font-bold mr-1 text-sm md:text-base">MASE-</span>
                    <input 
                        type="text" 
                        placeholder="202607210301001" 
                        className="w-full bg-transparent outline-none text-slate-900 font-bold placeholder:text-slate-300 text-sm md:text-base" 
                        value={searchId} 
                        onChange={(e) => setSearchId(e.target.value.replace(/^MASE-/i, ''))} 
                        required 
                    />
                </div>
                <button type="submit" className="w-full sm:w-auto bg-slate-900 hover:bg-emerald-600 text-white font-bold px-8 py-3.5 md:py-4 rounded-xl transition-colors duration-300 shadow-md uppercase tracking-wider text-xs md:text-sm whitespace-nowrap">Cek Dokumen</button>
            </div>
          </motion.form>
        </div>
      </section>

      <section className="py-12 md:py-20 px-4 md:px-6 max-w-6xl mx-auto w-full flex-grow relative z-20 -mt-8 md:-mt-16">
        <motion.div initial={{ opacity: 0, y: 40 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-100px" }} transition={{ duration: 0.8 }} className="bg-white rounded-3xl p-8 md:p-14 shadow-[0_20px_50px_rgba(0,0,0,0.05)] border border-slate-100">
            <h2 className="text-2xl md:text-3xl font-black text-center text-slate-900 mb-10 relative inline-block left-1/2 -translate-x-1/2">
              Agenda Acara Terbaru
              <div className="absolute -bottom-3 left-1/4 right-1/4 h-1.5 bg-emerald-500 rounded-full"></div>
            </h2>
            
            <motion.div variants={containerVariants} initial="hidden" whileInView="show" viewport={{ once: true }} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 md:gap-8">
                {events.length > 0 ? events.map(item => (
                    <motion.div key={item.id} variants={itemVariants} whileHover={{ y: -8, scale: 1.02 }} className="border border-slate-100 rounded-2xl p-6 shadow-sm hover:shadow-xl hover:border-emerald-200 transition-all duration-300 bg-slate-50 hover:bg-white cursor-pointer group">
                        <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-widest bg-emerald-100/80 px-3 py-1.5 rounded-md group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                          Telah Terlaksana
                        </span>
                        <h3 className="font-bold text-base md:text-lg text-slate-900 mt-5 mb-3 leading-snug">{item.name}</h3>
                        <div className="space-y-2 mt-auto">
                            <p className="text-xs font-medium text-slate-500 flex items-center gap-2"><svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2-2v12a2 2 0 002 2z"></path></svg>{item.date}</p>
                            <p className="text-xs font-medium text-slate-500 flex items-center gap-2"><svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>{item.location}</p>
                        </div>
                    </motion.div>
                )) : (
                    <div className="col-span-full text-center py-10 text-slate-400 font-medium">Belum ada agenda yang tersimpan.</div>
                )}
            </motion.div>
        </motion.div>
      </section>
    </div>
  );
}