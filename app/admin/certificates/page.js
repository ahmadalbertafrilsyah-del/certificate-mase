"use client";
import { useState, useEffect } from 'react';
import Link from 'next/link';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import { toPng } from 'html-to-image';
import { db } from '@/lib/firebase'; 
import { collection, addDoc, getDocs, writeBatch, doc, query, where } from 'firebase/firestore';

export default function AdminCertificates() {
  const [activeTab, setActiveTab] = useState('list');
  const [eventsList, setEventsList] = useState([]);
  const [servicesList, setServicesList] = useState([]);
  const [participants, setParticipants] = useState([]); 
  const [loading, setLoading] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false); // State untuk loading PDF

  // Form States
  const [form, setForm] = useState({ name: '', serviceId: '', date: '', location: '', time: '' });

  const fetchData = async () => {
    setLoading(true);
    const evSnap = await getDocs(collection(db, "events"));
    setEventsList(evSnap.docs.map(d => ({ id: d.id, ...d.data() })));
    const svSnap = await getDocs(collection(db, "services"));
    setServicesList(svSnap.docs.map(d => ({ id: d.id, ...d.data() })));
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [activeTab]);

  const handleImportExcel = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      const bstr = evt.target.result;
      const wb = XLSX.read(bstr, { type: 'binary' });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const data = XLSX.utils.sheet_to_json(ws);
      const formattedData = data.map(row => ({
        name: row.Nama || row.name || '',
        certId: row.NomorSertifikat || row.nomor || '',
        email: row.Email || row.email || row.EMAIL || ''
      })).filter(item => item.name !== '');
      setParticipants(prev => [...prev, ...formattedData]);
    };
    reader.readAsBinaryString(file);
    e.target.value = null;
  };

  const handleSaveEvent = async (e) => {
    e.preventDefault();
    if(participants.length === 0) return alert("Harap masukkan minimal 1 peserta dari Excel!");
    setLoading(true);
    try {
        // 1. Simpan Data Acara Utama
        const eventRef = await addDoc(collection(db, "events"), {
            ...form,
            participantCount: participants.length,
            createdAt: new Date().toISOString()
        });

        // 2. Simpan Peserta Massal (Batch Write - Sangat Cepat untuk ratusan data)
        const batch = writeBatch(db);
        participants.forEach(p => {
            const pRef = doc(collection(db, "participants"));
            batch.set(pRef, { 
                eventId: eventRef.id, 
                name: p.name, 
                certId: p.certId,
                email: p.email || '', // Pastikan email ikut tersimpan ke database
                status: 'verified' 
            });
        });
        await batch.commit();

        alert("Acara dan Data Peserta berhasil disimpan!");
        setForm({ name: '', serviceId: '', date: '', location: '', time: '' });
        setParticipants([]);
        setActiveTab('list');
    } catch (err) {
        console.error(err);
        alert("Terjadi kesalahan sistem.");
    }
    setLoading(false);
  };

  // --- LOGIKA GENERATE PDF & KIRIM EMAIL ---
  const handleBatchGenerateAndSend = async (eventData) => {
    if (!eventData.design || !eventData.design.bgUrl) {
        return alert("Desain sertifikat belum diatur! Klik 'Kanvas Desain' terlebih dahulu.");
    }
    
    setIsDownloading(true);

    try {
        // 1. Fetch seluruh peserta khusus untuk acara ini dari Firestore
        const q = query(collection(db, "participants"), where("eventId", "==", eventData.id));
        const partSnap = await getDocs(q);
        const eventParticipants = partSnap.docs.map(d => d.data());

        if (eventParticipants.length === 0) {
            alert("Tidak ada data peserta ditemukan untuk acara ini.");
            setIsDownloading(false);
            return;
        }

        // 2. Buat kontainer HTML rahasia untuk merender kanvas
        const hiddenContainer = document.createElement('div');
        hiddenContainer.style.position = 'absolute';
        hiddenContainer.style.top = '-9999px';
        hiddenContainer.style.left = '-9999px';
        document.body.appendChild(hiddenContainer);

        let successCount = 0;
        let failCount = 0;

        // 3. Looping generate & kirim
        for (let i = 0; i < eventParticipants.length; i++) {
          const p = eventParticipants[i];
          const config = eventData.design;
          
          hiddenContainer.innerHTML = `
            <div id="cert-render-${i}" style="width: 1123px; height: 794px; background-image: url('${config.bgUrl}'); background-size: cover; background-repeat: no-repeat; position: relative; font-family: 'Playfair Display', serif;">
              <div style="position: absolute; left: ${config.positions.name.x}px; top: ${config.positions.name.y}px;">
                <h2 style="font-size: 54px; margin: 0; font-weight: bold; color: #0f172a; white-space: nowrap;">${p.name}</h2>
              </div>
              <div style="position: absolute; left: ${config.positions.certId.x}px; top: ${config.positions.certId.y}px;">
                <p style="font-size: 20px; margin: 0; font-family: monospace; font-weight: bold; color: #1e293b; white-space: nowrap;">No: ${p.certId}</p>
              </div>
              <div style="position: absolute; left: ${config.positions.qr.x}px; top: ${config.positions.qr.y}px; width: 120px; height: 120px; background: white; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 10px; text-align: center; font-family: sans-serif;">
                 SCAN ME<br/>${p.certId}
              </div>
            </div>
          `;

          const elementToRender = document.getElementById(`cert-render-${i}`);
          
          // Render ke gambar PNG
          const dataUrl = await toPng(elementToRender, { quality: 1.0, pixelRatio: 2 });
          
          // Buat PDF A4 Landscape
          const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
          pdf.addImage(dataUrl, 'PNG', 0, 0, 297, 210);
          
          // Logika Email vs Download Manual
          if (p.email) {
              const pdfBase64 = pdf.output('datauristring');
              
              // Tembak ke API Nodemailer
              const response = await fetch('/api/send-certificate', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                      email: p.email,
                      name: p.name,
                      certId: p.certId,
                      pdfBase64: pdfBase64,
                      eventName: eventData.name
                  })
              });

              if (response.ok) {
                  successCount++;
              } else {
                  // Jika API gagal, fallback unduh manual
                  pdf.save(`Sertifikat_${p.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.pdf`);
                  failCount++;
              }
          } else {
              // Jika peserta tidak punya email, unduh manual saja
              pdf.save(`Sertifikat_${p.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.pdf`);
              failCount++; 
          }
        }

        // Hapus elemen tersembunyi
        document.body.removeChild(hiddenContainer);
        alert(`Proses Selesai!\nBerhasil dikirim ke Email: ${successCount}\nDiunduh Manual (Gagal/Tidak ada Email): ${failCount}`);
        
    } catch (error) {
        console.error(error);
        alert("Terjadi kesalahan saat memproses sertifikat.");
    }
    setIsDownloading(false);
  };

  return (
    <div className="p-4 md:p-10 animate-in fade-in duration-300">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-8 border-b border-slate-200 pb-4 gap-4">
            <div>
                <h2 className="text-2xl md:text-3xl font-black text-slate-900 font-serif">Sertifikat Acara</h2>
                <p className="text-xs md:text-sm text-slate-500 mt-1">Buat acara dan terbitkan sertifikat massal.</p>
            </div>
            <div className="flex bg-slate-100 rounded-lg p-1 w-full md:w-auto border border-slate-200 shadow-inner">
                <button onClick={() => setActiveTab('list')} className={`flex-1 md:flex-none px-5 py-2.5 rounded-md text-xs font-bold transition ${activeTab === 'list' ? 'bg-white text-emerald-700 shadow-sm border border-slate-200/50' : 'text-slate-500 hover:text-slate-700'}`}>Daftar Acara</button>
                <button onClick={() => setActiveTab('create')} className={`flex-1 md:flex-none px-5 py-2.5 rounded-md text-xs font-bold transition ${activeTab === 'create' ? 'bg-white text-emerald-700 shadow-sm border border-slate-200/50' : 'text-slate-500 hover:text-slate-700'}`}>+ Buat Baru</button>
            </div>
        </div>

        {activeTab === 'list' && (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse min-w-[700px]">
                        <thead>
                            <tr className="bg-slate-50 text-[10px] uppercase tracking-widest text-slate-500 border-b border-slate-200">
                                <th className="p-5">Nama & Detail Acara</th>
                                <th className="p-5 text-center">Peserta</th>
                                <th className="p-5 text-right">Aksi Desain & PDF</th>
                            </tr>
                        </thead>
                        <tbody>
                            {eventsList.map(ev => (
                                <tr key={ev.id} className="border-b border-slate-100 hover:bg-slate-50">
                                    <td className="p-5">
                                        <p className="font-bold text-sm text-slate-900 mb-1">{ev.name}</p>
                                        <p className="text-[11px] text-slate-500 font-medium">{ev.date} • {ev.location}</p>
                                    </td>
                                    <td className="p-5 text-center"><span className="px-3 py-1 bg-emerald-50 text-emerald-700 border border-emerald-100 rounded-full text-xs font-bold">{ev.participantCount || 0}</span></td>
                                    <td className="p-5 text-right space-x-2 whitespace-nowrap">
                                        <Link href={`/admin/certificates/design?eventId=${ev.id}`} className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg text-xs font-bold hover:bg-slate-200 transition">
                                            Kanvas Desain
                                        </Link>
                                        {/* TOMBOL GENERATE EMAIL BARU DISINI */}
                                        <button 
                                            onClick={() => handleBatchGenerateAndSend(ev)} 
                                            disabled={isDownloading}
                                            className="px-4 py-2 bg-indigo-50 text-indigo-700 rounded-lg text-xs font-bold hover:bg-indigo-600 hover:text-white transition disabled:opacity-50"
                                        >
                                            {isDownloading ? 'Memproses & Mengirim...' : 'Generate & Kirim Email'}
                                        </button>
                                    </td>
                                </tr>
                            ))}
                            {eventsList.length === 0 && !loading && <tr><td colSpan="3" className="p-8 text-center text-slate-400 text-sm">Belum ada acara yang dibuat.</td></tr>}
                        </tbody>
                    </table>
                </div>
            </div>
        )}

        {activeTab === 'create' && (
            <form onSubmit={handleSaveEvent} className="bg-white p-6 md:p-8 rounded-2xl shadow-sm border border-slate-200">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-8">
                    <div className="md:col-span-2">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-widest block mb-2">Nama Kegiatan</label>
                        <input type="text" required value={form.name} onChange={e=>setForm({...form, name: e.target.value})} className="w-full border-2 border-slate-100 p-3.5 rounded-xl focus:border-emerald-500 outline-none text-sm font-bold bg-slate-50 focus:bg-white" placeholder="Contoh: Seminar Nasional ISO..." />
                    </div>
                    <div>
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-widest block mb-2">Pilih Layanan</label>
                        <select required value={form.serviceId} onChange={e=>setForm({...form, serviceId: e.target.value})} className="w-full border-2 border-slate-100 p-3.5 rounded-xl focus:border-emerald-500 outline-none text-sm font-bold bg-slate-50">
                            <option value="">-- Pilih Kategori --</option>
                            {servicesList.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-widest block mb-2">Tanggal</label>
                        <input type="date" required value={form.date} onChange={e=>setForm({...form, date: e.target.value})} className="w-full border-2 border-slate-100 p-3.5 rounded-xl focus:border-emerald-500 outline-none text-sm bg-slate-50" />
                    </div>
                    <div className="md:col-span-2">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-widest block mb-2">Lokasi / Tempat</label>
                        <input type="text" required value={form.location} onChange={e=>setForm({...form, location: e.target.value})} className="w-full border-2 border-slate-100 p-3.5 rounded-xl focus:border-emerald-500 outline-none text-sm bg-slate-50" placeholder="Zoom Meeting / Gedung Universitas..." />
                    </div>
                </div>

                <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 mb-8">
                    <div className="flex justify-between items-center mb-6">
                        <div><h4 className="font-bold text-sm text-slate-900">Data Peserta (Excel)</h4><p className="text-xs text-slate-500">Format kolom: Nama, NomorSertifikat, Email</p></div>
                        <label className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold cursor-pointer shadow-md transition">
                            📤 Import File <input type="file" accept=".xlsx" onChange={handleImportExcel} className="hidden" />
                        </label>
                    </div>
                    {participants.length > 0 ? (
                        <div className="max-h-60 overflow-y-auto border border-slate-200 rounded-xl bg-white shadow-inner">
                            <table className="w-full text-left text-xs"><thead className="bg-slate-100 sticky top-0"><tr><th className="p-3 border-b border-slate-200">Nama Lengkap</th><th className="p-3 border-b border-slate-200">No. Sertifikat</th><th className="p-3 border-b border-slate-200">Email</th></tr></thead><tbody>{participants.map((p, i) => (<tr key={i} className="border-b border-slate-50"><td className="p-3 font-bold text-slate-800">{p.name}</td><td className="p-3 font-mono text-emerald-600">{p.certId}</td><td className="p-3 text-slate-500">{p.email || '-'}</td></tr>))}</tbody></table>
                        </div>
                    ) : ( <div className="text-center py-10 border-2 border-dashed border-slate-200 rounded-xl text-slate-400 text-sm font-medium">Belum ada data diimpor.</div> )}
                </div>
                
                <div className="flex justify-end">
                    <button type="submit" disabled={loading} className="bg-slate-900 hover:bg-slate-800 disabled:bg-slate-400 text-white font-bold px-10 py-4 rounded-xl text-sm transition shadow-lg">
                        {loading ? 'Menyimpan...' : 'Simpan Acara & Peserta'}
                    </button>
                </div>
            </form>
        )}
    </div>
  );
}