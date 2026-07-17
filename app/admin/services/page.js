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
    if(confirm("Apakah Anda yakin ingin menghapus layanan ini?")) {
      await deleteDoc(doc(db, "services", id));
      fetchServices();
    }
  };

  return (
    <div className="p-6 md:p-10 w-full animate-in fade-in duration-300">
        <div className="max-w-5xl">
            <h2 className="text-2xl md:text-3xl font-black text-slate-900 mb-2">Pengaturan Layanan</h2>
            <p className="text-sm text-slate-500 mb-8">Kelola kategori layanan untuk dikaitkan dengan acara sertifikat.</p>
            
            <form onSubmit={handleAdd} className="bg-white p-6 md:p-8 rounded-md shadow-sm border border-slate-200 mb-8 flex flex-col md:flex-row gap-4 md:items-end">
                <div className="flex-1">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-widest block mb-2">Nama Layanan Baru</label>
                    <input 
                        type="text" 
                        value={newService} 
                        onChange={e=>setNewService(e.target.value)} 
                        required 
                        className="w-full border-2 border-slate-100 p-3.5 rounded-md focus:border-emerald-500 outline-none text-sm font-bold bg-slate-50 focus:bg-white transition" 
                        placeholder="Cth: Pelatihan ISO 9001" 
                    />
                </div>
                <button type="submit" className="bg-slate-900 hover:bg-emerald-600 text-white font-bold px-8 py-3.5 rounded-md text-sm transition shadow-md whitespace-nowrap w-full md:w-auto">
                    + Tambah Layanan
                </button>
            </form>

            <div className="bg-white rounded-md shadow-sm border border-slate-200 overflow-hidden">
                {loading ? (
                    <p className="p-8 text-center text-slate-500 text-sm font-medium">Memuat data...</p>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse min-w-[500px]">
                            <thead className="bg-slate-50 text-[10px] uppercase tracking-widest text-slate-500 border-b border-slate-200">
                                <tr>
                                    <th className="p-5 text-center">Nama Layanan</th>
                                    <th className="p-5 text-center">Aksi</th>
                                </tr>
                            </thead>
                            <tbody>
                                {services.map(srv => (
                                    <tr key={srv.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                                        <td className="p-5 font-bold text-sm text-slate-800">{srv.name}</td>
                                        <td className="p-5 text-right">
                                            <button 
                                                onClick={() => handleDelete(srv.id)} 
                                                className="px-4 py-2 bg-red-50 text-red-600 hover:bg-red-100 rounded-md text-xs font-bold transition border border-transparent hover:border-red-200"
                                            >
                                                Hapus
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                                {services.length === 0 && (
                                    <tr>
                                        <td colSpan="2" className="p-8 text-center text-slate-400 text-sm">
                                            Belum ada kategori layanan yang ditambahkan.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    </div>
  );
}