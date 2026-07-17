"use client";
import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { collection, getDocs } from 'firebase/firestore';

export default function AdminDashboard() {
  const [stats, setStats] = useState({ events: 0, participants: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const eventsSnap = await getDocs(collection(db, "events"));
        const partsSnap = await getDocs(collection(db, "participants"));
        setStats({
            events: eventsSnap.size,
            participants: partsSnap.size
        });
      } catch (error) {
        console.error("Gagal mengambil data statistik", error);
      }
      setLoading(false);
    };
    fetchStats();
  }, []);

  return (
    <div className="p-6 md:p-10 animate-in fade-in duration-500">
      <div className="mb-10">
          <h2 className="text-3xl font-black text-slate-900">Overview Sistem</h2>
          <p className="text-sm text-slate-500 mt-2">Ringkasan data penerbitan sertifikat Mahatma Academy.</p>
      </div>

      {/* Kartu Statistik */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
          <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-200 relative overflow-hidden">
             <div className="absolute top-0 right-0 p-6 opacity-5 text-7xl">🎓</div>
             <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Total Sertifikat Terbit</p>
             <h3 className="text-5xl font-black text-slate-900">{loading ? '...' : stats.participants}</h3>
             <p className="text-xs text-emerald-600 font-bold mt-3 bg-emerald-50 inline-block px-3 py-1 rounded-md">Terdaftar di Database</p>
          </div>
          <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-200 relative overflow-hidden">
             <div className="absolute top-0 right-0 p-6 opacity-5 text-7xl">📅</div>
             <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Total Kegiatan / Acara</p>
             <h3 className="text-5xl font-black text-slate-900">{loading ? '...' : stats.events}</h3>
             <p className="text-xs text-blue-600 font-bold mt-3 bg-blue-50 inline-block px-3 py-1 rounded-md">Kegiatan Resmi</p>
          </div>
      </div>

      {/* Area Panduan Cepat */}
      <div className="bg-white border border-slate-200 shadow-sm rounded-3xl p-8 md:p-10 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-50 rounded-full blur-[80px] pointer-events-none"></div>
          <h4 className="text-xl font-bold mb-6 relative z-10 text-slate-900">Alur Kerja Penerbitan Sertifikat</h4>
          <ol className="list-decimal list-inside space-y-4 text-slate-600 text-sm md:text-base relative z-10 font-medium">
              <li className="p-2 hover:bg-slate-50 rounded-lg transition">Masuk ke menu <b className="text-emerald-700">Sertifikat & Acara</b> dan klik tombol <b className="text-slate-900">+ Buat Baru</b>.</li>
              <li className="p-2 hover:bg-slate-50 rounded-lg transition">Isi detail kegiatan dan lakukan <b className="text-emerald-700">Import file Excel</b> peserta.</li>
              <li className="p-2 hover:bg-slate-50 rounded-lg transition">Klik tombol <b className="text-emerald-700">Kanvas Desain</b> pada kegiatan yang baru saja dibuat.</li>
              <li className="p-2 hover:bg-slate-50 rounded-lg transition">Upload background A4 kosong, lalu geser nama dan QR code ke posisi yang tepat.</li>
              <li className="p-2 hover:bg-slate-50 rounded-lg transition">Kembali ke tabel dan klik <b className="text-emerald-700">Generate & Kirim Email</b>.</li>
          </ol>
      </div>
    </div>
  );
}