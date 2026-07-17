"use client";
import { useEffect, useState, use } from 'react';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import Link from 'next/link';

export default function VerifyPage({ params }) {
  const resolvedParams = use(params);
  const certId = resolvedParams.id;
  
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [liveTime, setLiveTime] = useState('');

  useEffect(() => {
    // Waktu live untuk mencegah screenshot palsu
    const timer = setInterval(() => setLiveTime(new Date().toLocaleString('id-ID')), 1000);
    
    const fetchCertificate = async () => {
      try {
        // 1. Cari peserta di koleksi "participants" berdasarkan certId
        const q = query(collection(db, "participants"), where("certId", "==", certId));
        const querySnapshot = await getDocs(q);
        
        if (!querySnapshot.empty) {
          const participantData = querySnapshot.docs[0].data();
          
          // 2. Ambil data acara berdasarkan eventId yang nempel di data peserta
          const eventRef = doc(db, "events", participantData.eventId);
          const eventSnap = await getDoc(eventRef);
          
          setData({ 
            ...participantData, 
            event: eventSnap.exists() ? eventSnap.data() : null 
          });
        }
      } catch (error) {
        console.error("Error fetching data:", error);
      }
      setLoading(false);
    };
    
    fetchCertificate();
    return () => clearInterval(timer);
  }, [certId]);

  // TAMPILAN LOADING
  if (loading) return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center">
        <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="text-slate-500 font-bold tracking-widest text-sm uppercase">Memvalidasi Data...</p>
    </div>
  );

  // TAMPILAN JIKA SERTIFIKAT PALSU / TIDAK DITEMUKAN
  if (!data) return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
      <div className="max-w-md w-full bg-white p-8 rounded-3xl shadow-xl border-t-4 border-red-500 text-center">
        <div className="w-16 h-16 bg-red-100 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4 text-3xl">❌</div>
        <h1 className="text-2xl font-black text-slate-900 mb-2">Dokumen Tidak Valid</h1>
        <p className="text-slate-500 text-sm mb-8 leading-relaxed">Nomor registrasi <b>{certId}</b> tidak ditemukan dalam basis data resmi Mahatma Academy. Mohon periksa kembali nomor yang Anda masukkan.</p>
        <Link href="/" className="inline-block bg-slate-900 text-white px-8 py-3 rounded-xl font-bold text-sm hover:bg-slate-800 transition">
            Kembali ke Pencarian
        </Link>
      </div>
    </div>
  );

  // TAMPILAN JIKA SERTIFIKAT ASLI (VALID)
  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4 flex flex-col items-center">
      <div className="max-w-2xl w-full bg-white rounded-[2rem] shadow-xl border border-slate-100 overflow-hidden">
        
        {/* Header Status Valid */}
        <div className="bg-emerald-600 p-8 text-center text-white relative overflow-hidden">
           <div className="absolute inset-0 bg-white/20 w-16 skew-x-[45deg] animate-[slide_3s_infinite]"></div>
           <div className="w-16 h-16 bg-white text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4 text-3xl shadow-lg">✓</div>
           <h1 className="text-2xl font-black uppercase tracking-widest mb-1">Sertifikat Valid</h1>
           <p className="text-xs text-emerald-100 opacity-90 font-mono tracking-wider">Diperiksa: {liveTime}</p>
        </div>
        
        {/* Detail Data */}
        <div className="p-8 md:p-12">
          <div className="space-y-6 mb-10">
            <div className="border-b border-slate-100 pb-4">
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-1">Diberikan Kepada</p>
              <p className="text-2xl font-black text-slate-900">{data.name}</p>
            </div>
            <div className="border-b border-slate-100 pb-4">
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-1">Nomor Registrasi Sertifikat</p>
              <p className="text-lg font-bold text-emerald-700">{certId}</p>
            </div>
            <div>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-1">Keterangan Kegiatan</p>
              <p className="text-base font-bold text-slate-800 leading-snug">{data.event?.name}</p>
              <p className="text-xs text-slate-500 mt-1">{data.event?.date} • {data.event?.location}</p>
            </div>
          </div>

          <div className="text-center mt-8">
             <Link href="/" className="inline-block bg-slate-100 text-slate-700 px-8 py-3 rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-slate-200 transition">
                Cek Sertifikat Lainnya
             </Link>
          </div>
        </div>
      </div>
    </div>
  );
}