"use client";
import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase'; 
import { collection, addDoc, getDocs, deleteDoc, doc } from 'firebase/firestore';

export default function AdminServices() {
  const [services, setServices] = useState([]);
  const [newService, setNewService] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchServices = async () => {
    setLoading(true);
    const querySnapshot = await getDocs(collection(db, "services"));
    setServices(querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    setLoading(false);
  };

  useEffect(() => { fetchServices(); }, []);

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!newService) return;
    await addDoc(collection(db, "services"), { name: newService });
    setNewService('');
    fetchServices();
  };

  const handleDelete = async (id) => {
    if(confirm("Hapus layanan ini?")) {
      await deleteDoc(doc(db, "services", id));
      fetchServices();
    }
  };

  return (
    <div className="p-6 md:p-10 max-w-4xl mx-auto">
        <h2 className="text-2xl md:text-3xl font-black text-slate-900 font-serif mb-2">Pengaturan Layanan</h2>
        <p className="text-sm text-slate-500 mb-8">Kelola kategori layanan untuk dikaitkan dengan acara sertifikat.</p>
        
        <form onSubmit={handleAdd} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 mb-8 flex gap-4 items-end">
            <div className="flex-1">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest block mb-2">Nama Layanan Baru</label>
                <input type="text" value={newService} onChange={e=>setNewService(e.target.value)} required className="w-full border-2 border-slate-100 p-3 rounded-xl focus:border-emerald-500 outline-none text-sm font-bold bg-slate-50 focus:bg-white transition" placeholder="Cth: Pelatihan ISO" />
            </div>
            <button type="submit" className="bg-slate-900 hover:bg-emerald-600 text-white font-bold px-6 py-3 rounded-xl text-sm transition shadow-md whitespace-nowrap">+ Tambah</button>
        </form>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            {loading ? <p className="p-6 text-center text-slate-500 text-sm">Memuat data...</p> : (
                <table className="w-full text-left border-collapse">
                    <thead className="bg-slate-50 text-[10px] uppercase tracking-widest text-slate-500 border-b border-slate-200">
                        <tr><th className="p-4">Nama Layanan</th><th className="p-4 text-right">Aksi</th></tr>
                    </thead>
                    <tbody>
                        {services.map(srv => (
                            <tr key={srv.id} className="border-b border-slate-100">
                                <td className="p-4 font-bold text-sm text-slate-800">{srv.name}</td>
                                <td className="p-4 text-right"><button onClick={() => handleDelete(srv.id)} className="text-xs text-red-500 font-bold hover:underline">Hapus</button></td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            )}
        </div>
    </div>
  );
}