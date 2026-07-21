"use client";
import { useState, useEffect } from 'react';
import Link from 'next/link';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import { toJpeg } from 'html-to-image'; 
import { renderToString } from 'react-dom/server';
import { QRCodeSVG } from 'qrcode.react';
import { db } from '@/lib/firebase'; 
import { collection, addDoc, getDocs, writeBatch, doc, query, where, deleteDoc, updateDoc } from 'firebase/firestore';

export default function AdminCertificates() {
  const [activeTab, setActiveTab] = useState('list');
  const [eventsList, setEventsList] = useState([]);
  const [servicesList, setServicesList] = useState([]);
  const [participants, setParticipants] = useState([]); 
  const [loading, setLoading] = useState(false);
  
  const [isDownloading, setIsDownloading] = useState(false);
  const [processingEventId, setProcessingEventId] = useState(null);
  const [progressText, setProgressText] = useState('');

  const [searchTerm, setSearchTerm] = useState('');
  const [filterService, setFilterService] = useState('');

  const [form, setForm] = useState({ name: '', serviceId: '', date: '', location: '' });
  const [signers, setSigners] = useState([{ name: '', title: '' }]);

  const [editingIndex, setEditingIndex] = useState(-1);
  const [editForm, setEditForm] = useState({ name: '', certId: '', email: '' });

  // Manage Participants Modal
  const [manageEvent, setManageEvent] = useState(null);
  const [eventParticipants, setEventParticipants] = useState([]);
  const [isManagingLoading, setIsManagingLoading] = useState(false);
  const [editingPartId, setEditingPartId] = useState(null);
  const [partEditForm, setPartEditForm] = useState({ name: '', certId: '', email: '' });
  
  // Selection State for Email/Generate
  const [selectedParticipants, setSelectedParticipants] = useState([]);

  // States untuk Tambah Peserta Manual di Modal
  const [isAddingParticipant, setIsAddingParticipant] = useState(false);
  const [newParticipantForm, setNewParticipantForm] = useState({ name: '', certId: '', email: '' });
  
  const [isImportingModal, setIsImportingModal] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    const evSnap = await getDocs(collection(db, "events"));
    setEventsList(evSnap.docs.map(d => ({ id: d.id, ...d.data() })));
    const svSnap = await getDocs(collection(db, "services"));
    setServicesList(svSnap.docs.map(d => ({ id: d.id, ...d.data() })));
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [activeTab]);

  const filteredEvents = eventsList.filter(ev => {
    const matchSearch = ev.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchService = filterService ? ev.serviceId === filterService : true;
    return matchSearch && matchService;
  });

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

  const handleSaveEdit = (idx) => {
      const newParts = [...participants];
      newParts[idx] = editForm;
      setParticipants(newParts);
      setEditingIndex(-1);
  };

  const handleSaveEvent = async (e) => {
    e.preventDefault();
    if(participants.length === 0) return alert("Harap masukkan minimal 1 peserta dari Excel!");
    setLoading(true);
    try {
        const eventRef = await addDoc(collection(db, "events"), {
            ...form,
            signers: signers,
            participantCount: participants.length,
            createdAt: new Date().toISOString()
        });

        const batch = writeBatch(db);
        participants.forEach(p => {
            const pRef = doc(collection(db, "participants"));
            batch.set(pRef, { 
                eventId: eventRef.id, 
                name: p.name, 
                certId: p.certId,
                email: p.email || '', 
                status: 'verified' 
            });
        });
        await batch.commit();

        alert("Acara dan Data Peserta berhasil disimpan!");
        setForm({ name: '', serviceId: '', date: '', location: '' });
        setSigners([{ name: '', title: '' }]);
        setParticipants([]);
        setActiveTab('list');
    } catch (err) {
        console.error(err);
        alert("Terjadi kesalahan sistem.");
    }
    setLoading(false);
  };

  const handleDeleteEvent = async (eventId) => {
    if(confirm("Apakah Anda yakin ingin menghapus acara ini? Seluruh data peserta yang terkait juga akan dihapus permanen.")) {
        setLoading(true);
        try {
            await deleteDoc(doc(db, "events", eventId));
            const q = query(collection(db, "participants"), where("eventId", "==", eventId));
            const partSnap = await getDocs(q);
            
            const batch = writeBatch(db);
            partSnap.forEach((d) => {
                batch.delete(d.ref);
            });
            await batch.commit();

            alert("Acara berhasil dihapus!");
            fetchData(); 
        } catch (error) {
            console.error("Gagal menghapus acara:", error);
            alert("Terjadi kesalahan saat menghapus acara.");
        }
        setLoading(false);
    }
  };

  const openManageParticipants = async (ev) => {
      setManageEvent(ev);
      setSelectedParticipants([]);
      setIsAddingParticipant(false);
      setNewParticipantForm({ name: '', certId: '', email: '' });
      setIsManagingLoading(true);
      try {
          const q = query(collection(db, "participants"), where("eventId", "==", ev.id));
          const snap = await getDocs(q);
          const parts = snap.docs.map(d => ({ id: d.id, ...d.data() }));
          setEventParticipants(parts);
          // Set checked default semua
          setSelectedParticipants(parts.map(p => p.id));
      } catch (err) {
          console.error(err);
          alert("Gagal memuat daftar peserta.");
      }
      setIsManagingLoading(false);
  };

  const handleAddParticipantDb = async () => {
      if (!newParticipantForm.name || !newParticipantForm.certId) {
          return alert("Nama dan Nomor Sertifikat wajib diisi!");
      }
      try {
          const newRef = await addDoc(collection(db, "participants"), {
              eventId: manageEvent.id,
              name: newParticipantForm.name,
              certId: newParticipantForm.certId,
              email: newParticipantForm.email || '',
              status: 'verified'
          });
          
          const newParticipant = { id: newRef.id, eventId: manageEvent.id, ...newParticipantForm, status: 'verified' };
          
          setEventParticipants(prev => [...prev, newParticipant]);
          setSelectedParticipants(prev => [...prev, newRef.id]);
          
          setIsAddingParticipant(false);
          setNewParticipantForm({ name: '', certId: '', email: '' });
          
          await updateDoc(doc(db, "events", manageEvent.id), {
              participantCount: eventParticipants.length + 1
          });
          fetchData(); 
          
      } catch (err) {
          console.error(err);
          alert("Gagal menambahkan peserta.");
      }
  };

  // FUNGSI BARU: Import Excel Langsung di Dalam Modal Kelola Peserta
  const handleImportExcelModal = async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      
      setIsImportingModal(true);
      const reader = new FileReader();
      
      reader.onload = async (evt) => {
          try {
              const bstr = evt.target.result;
              const wb = XLSX.read(bstr, { type: 'binary' });
              const ws = wb.Sheets[wb.SheetNames[0]];
              const data = XLSX.utils.sheet_to_json(ws);
              
              const formattedData = data.map(row => ({
                  name: row.Nama || row.name || '',
                  certId: row.NomorSertifikat || row.nomor || '',
                  email: row.Email || row.email || row.EMAIL || ''
              })).filter(item => item.name !== '' && item.certId !== '');

              if(formattedData.length === 0) {
                  setIsImportingModal(false);
                  return alert("Tidak ada data valid yang ditemukan dalam file Excel. Pastikan kolom bernama: Nama, NomorSertifikat, Email");
              }

              const batch = writeBatch(db);
              const newParticipantsDisplay = [];
              const newParticipantIds = [];

              // Buat referensi batch untuk masing-masing peserta baru
              formattedData.forEach(p => {
                  const pRef = doc(collection(db, "participants"));
                  batch.set(pRef, { 
                      eventId: manageEvent.id, 
                      name: p.name, 
                      certId: p.certId,
                      email: p.email || '', 
                      status: 'verified' 
                  });
                  newParticipantsDisplay.push({ id: pRef.id, eventId: manageEvent.id, name: p.name, certId: p.certId, email: p.email || '', status: 'verified' });
                  newParticipantIds.push(pRef.id);
              });

              // Eksekusi penulisan ke database
              await batch.commit();

              // Update data di state React
              setEventParticipants(prev => [...prev, ...newParticipantsDisplay]);
              setSelectedParticipants(prev => [...prev, ...newParticipantIds]);

              // Update jumlah peserta di data acara
              await updateDoc(doc(db, "events", manageEvent.id), {
                  participantCount: eventParticipants.length + formattedData.length
              });
              
              fetchData();
              alert(`${formattedData.length} data peserta berhasil diimpor dan disimpan!`);

          } catch (error) {
              console.error(error);
              alert("Terjadi kesalahan saat memproses file Excel.");
          }
          setIsImportingModal(false);
      };
      
      reader.readAsBinaryString(file);
      e.target.value = null; // Reset input agar bisa upload file yang sama lagi jika perlu
  };

  const saveParticipantEdit = async (id) => {
      try {
          await updateDoc(doc(db, "participants", id), partEditForm);
          setEventParticipants(prev => prev.map(p => p.id === id ? { ...p, ...partEditForm } : p));
          setEditingPartId(null);
          alert("Data peserta berhasil diperbarui!");
      } catch (err) {
          console.error(err);
          alert("Gagal memperbarui data peserta.");
      }
  };

  const deleteParticipantDb = async (id) => {
      if(confirm("Hapus peserta ini dari acara?")) {
          try {
              await deleteDoc(doc(db, "participants", id));
              setEventParticipants(prev => prev.filter(p => p.id !== id));
              setSelectedParticipants(prev => prev.filter(pId => pId !== id));
              
              await updateDoc(doc(db, "events", manageEvent.id), {
                  participantCount: eventParticipants.length - 1
              });
              fetchData();
          } catch (err) {
              console.error(err);
              alert("Gagal menghapus peserta.");
          }
      }
  };

  const handleSelectAll = (e) => {
      if(e.target.checked) {
          setSelectedParticipants(eventParticipants.map(p => p.id));
      } else {
          setSelectedParticipants([]);
      }
  };

  const handleSelectRow = (id) => {
      if(selectedParticipants.includes(id)) {
          setSelectedParticipants(prev => prev.filter(item => item !== id));
      } else {
          setSelectedParticipants(prev => [...prev, id]);
      }
  };

  const handleBatchGenerateAndSend = async () => {
    if (!manageEvent.design || !manageEvent.design.bgUrl) {
        return alert("Desain sertifikat belum diatur! Klik 'Kanvas Desain' terlebih dahulu.");
    }

    if(selectedParticipants.length === 0) {
        return alert("Pilih minimal satu peserta untuk di-generate/diemail.");
    }
    
    setIsDownloading(true);
    setProcessingEventId(manageEvent.id);

    try {
        const partsToProcess = eventParticipants.filter(p => selectedParticipants.includes(p.id));

        const hiddenContainer = document.createElement('div');
        hiddenContainer.style.position = 'absolute';
        hiddenContainer.style.top = '-9999px';
        hiddenContainer.style.left = '-9999px';
        document.body.appendChild(hiddenContainer);

        let successCount = 0;
        let failCount = 0;

        for (let i = 0; i < partsToProcess.length; i++) {
          setProgressText(`Memproses ${i + 1} dari ${partsToProcess.length}...`);
          const p = partsToProcess[i];
          const config = manageEvent.design;
          const isLandscape = config.orientation !== 'portrait';
          const canvasWidth = isLandscape ? 1123 : 794;
          const canvasHeight = isLandscape ? 794 : 1123;
          
          const namePos = config.positions.name;
          const certIdPos = config.positions.certId;
          const qrPos = config.positions.qr;

          const alignName = namePos.align || 'center';
          const alignCertId = certIdPos.align || 'center';

          const qrLink = `${process.env.NEXT_PUBLIC_BASE_URL || 'https://certificate.mahatma.id'}/verify/${p.certId}`;
          const qrSize = qrPos.w || 120;
          
          const qrSvg = renderToString(
             <QRCodeSVG
                 value={qrLink}
                 size={qrSize}
                 fgColor="#0f172a"
                 imageSettings={{
                     src: "https://i.ibb.co.com/21s67v2h/maseid.jpg",
                     height: qrSize * 0.25,
                     width: qrSize * 0.25,
                     excavate: true,
                 }}
             />
          );

          hiddenContainer.innerHTML = `
            <div id="cert-render-${i}" style="width: ${canvasWidth}px; height: ${canvasHeight}px; background-image: url('${config.bgUrl}'); background-size: 100% 100%; background-repeat: no-repeat; position: relative;">
              <div style="position: absolute; left: ${namePos.x}px; top: ${namePos.y}px; width: ${namePos.w || 400}px; height: ${namePos.h || 60}px; display: flex; align-items: center; justify-content: ${alignName};">
                <h2 style="font-size: ${(namePos.h || 60) * 0.8}px; margin: 0; padding: 0 8px; font-weight: bold; color: #0f172a; white-space: nowrap;">${p.name}</h2>
              </div>
              <div style="position: absolute; left: ${certIdPos.x}px; top: ${certIdPos.y}px; width: ${certIdPos.w || 200}px; height: ${certIdPos.h || 30}px; display: flex; align-items: center; justify-content: ${alignCertId};">
                <p style="font-size: ${(certIdPos.h || 30) * 0.8}px; margin: 0; padding: 0 8px; font-weight: bold; color: #1e293b; white-space: nowrap;">${p.certId}</p>
              </div>
              <div style="position: absolute; left: ${qrPos.x}px; top: ${qrPos.y}px; width: ${qrPos.w || 120}px; height: ${qrPos.h || 120}px; display: flex; align-items: center; justify-content: center; flex-direction: column;">
                 ${qrSvg}
              </div>
            </div>
          `;

          await new Promise(resolve => setTimeout(resolve, 50));

          const elementToRender = document.getElementById(`cert-render-${i}`);
          const dataUrl = await toJpeg(elementToRender, { quality: 0.5, pixelRatio: 1.0 }); 
          
          const pdfFormat = isLandscape ? 'landscape' : 'portrait';
          const pdfWidth = isLandscape ? 297 : 210;
          const pdfHeight = isLandscape ? 210 : 297;
          
          const pdf = new jsPDF({ orientation: pdfFormat, unit: 'mm', format: 'a4' });
          pdf.addImage(dataUrl, 'JPEG', 0, 0, pdfWidth, pdfHeight);

          if (p.email) {
              try {
                  const response = await fetch('/api/send-certificate', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                          email: p.email,
                          name: p.name,
                          certId: p.certId,
                          eventName: manageEvent.name
                      })
                  });

                  if (response.ok) {
                      successCount++;
                  } else {
                      pdf.save(`Sertifikat_${p.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.pdf`);
                      failCount++;
                  }
              } catch (e) {
                  pdf.save(`Sertifikat_${p.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.pdf`);
                  failCount++;
              }
              await new Promise(resolve => setTimeout(resolve, 4000)); 
          } else {
              pdf.save(`Sertifikat_${p.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.pdf`);
              failCount++; 
          }
        }

        document.body.removeChild(hiddenContainer);
        setProgressText('');
        alert(`Proses Selesai!\nBerhasil dikirim ke Email: ${successCount}\nDiunduh Manual (Gagal/Tidak ada Email): ${failCount}`);
        
    } catch (error) {
        console.error(error);
        alert("Terjadi kesalahan sistem saat memproses PDF.");
    }
    setIsDownloading(false);
    setProcessingEventId(null);
  };

  return (
    <div className="p-4 md:p-10 animate-in fade-in duration-300 relative">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-8 border-b border-slate-200 pb-4 gap-4">
            <div>
                <h2 className="text-2xl md:text-3xl font-black text-slate-900 font-serif">Sertifikat Acara</h2>
                <p className="text-xs md:text-sm text-slate-500 mt-1">Buat acara dan terbitkan sertifikat massal.</p>
            </div>
            <div className="flex bg-slate-100 rounded-md p-1 w-full md:w-auto border border-slate-200 shadow-inner">
                <button onClick={() => setActiveTab('list')} className={`flex-1 md:flex-none px-5 py-2.5 rounded-md text-xs font-bold transition ${activeTab === 'list' ? 'bg-white text-emerald-700 shadow-sm border border-slate-200/50' : 'text-slate-500 hover:text-slate-700'}`}>Daftar Acara</button>
                <button onClick={() => setActiveTab('create')} className={`flex-1 md:flex-none px-5 py-2.5 rounded-md text-xs font-bold transition ${activeTab === 'create' ? 'bg-white text-emerald-700 shadow-sm border border-slate-200/50' : 'text-slate-500 hover:text-slate-700'}`}>+ Buat Baru</button>
            </div>
        </div>

        {activeTab === 'list' && (
            <div className="bg-white rounded-md shadow-sm border border-slate-200 overflow-hidden">
                <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-col md:flex-row gap-4 items-center justify-between">
                    <input type="text" placeholder="Cari nama acara..." className="px-4 py-2.5 text-sm font-bold border-2 border-slate-200 rounded-md w-full md:w-64 outline-none focus:border-emerald-500 bg-white" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                    <select className="px-4 py-2.5 text-sm font-bold border-2 border-slate-200 rounded-md w-full md:w-auto outline-none focus:border-emerald-500 bg-white" value={filterService} onChange={e => setFilterService(e.target.value)}>
                        <option value="">-- Semua Layanan --</option>
                        {servicesList.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse min-w-[800px]">
                        <thead>
                            <tr className="bg-slate-100 text-[10px] uppercase tracking-widest text-slate-500 border-b border-slate-200">
                                <th className="p-5">Nama & Detail Acara</th>
                                <th className="p-5 text-center">Peserta</th>
                                <th className="p-5 text-right">Aksi Desain & PDF</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredEvents.map(ev => (
                                <tr key={ev.id} className="border-b border-slate-100 hover:bg-slate-50">
                                    <td className="p-5">
                                        <p className="font-bold text-sm text-slate-900 mb-1">{ev.name}</p>
                                        <p className="text-[11px] text-slate-500 font-medium">{ev.date} • {ev.location}</p>
                                    </td>
                                    <td className="p-5 text-center"><span className="px-3 py-1 bg-emerald-50 text-emerald-700 border border-emerald-100 rounded-md text-xs font-bold">{ev.participantCount || 0}</span></td>
                                    <td className="p-5 text-right space-x-2 whitespace-nowrap">
                                        <button 
                                            onClick={() => openManageParticipants(ev)} 
                                            title="Kelola Peserta"
                                            className="px-4 py-2 bg-emerald-50 text-emerald-600 rounded-md text-xs font-bold hover:bg-emerald-600 hover:text-white transition"
                                        >
                                            👥 Peserta & Generate
                                        </button>
                                        <Link href={`/admin/certificates/design?eventId=${ev.id}`} className="px-4 py-2 bg-slate-100 text-slate-700 rounded-md text-xs font-bold hover:bg-slate-200 transition">
                                            Kanvas Desain
                                        </Link>
                                        <button 
                                            onClick={() => handleDeleteEvent(ev.id)} 
                                            disabled={loading}
                                            title="Hapus Acara"
                                            className="px-3 py-2 bg-red-50 text-red-600 rounded-md text-sm font-bold hover:bg-red-600 hover:text-white transition disabled:opacity-50"
                                        >
                                            🗑️
                                        </button>
                                    </td>
                                </tr>
                            ))}
                            {filteredEvents.length === 0 && !loading && <tr><td colSpan="3" className="p-8 text-center text-slate-400 text-sm">Tidak ada acara yang cocok.</td></tr>}
                        </tbody>
                    </table>
                </div>
            </div>
        )}

        {activeTab === 'create' && (
            <form onSubmit={handleSaveEvent} className="bg-white p-6 md:p-8 rounded-md shadow-sm border border-slate-200">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-8">
                    <div className="md:col-span-2">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-widest block mb-2">Nama Kegiatan</label>
                        <input type="text" required value={form.name} onChange={e=>setForm({...form, name: e.target.value})} className="w-full border-2 border-slate-100 p-3.5 rounded-md focus:border-emerald-500 outline-none text-sm font-bold bg-slate-50 focus:bg-white" placeholder="Contoh: Seminar Nasional ISO..." />
                    </div>
                    <div>
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-widest block mb-2">Pilih Layanan</label>
                        <select required value={form.serviceId} onChange={e=>setForm({...form, serviceId: e.target.value})} className="w-full border-2 border-slate-100 p-3.5 rounded-md focus:border-emerald-500 outline-none text-sm font-bold bg-slate-50">
                            <option value="">-- Pilih Kategori --</option>
                            {servicesList.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-widest block mb-2">Tanggal Pelaksanaan</label>
                        <input type="text" required value={form.date} onChange={e=>setForm({...form, date: e.target.value})} className="w-full border-2 border-slate-100 p-3.5 rounded-md focus:border-emerald-500 outline-none text-sm bg-slate-50" placeholder="Cth: 12 - 14 Agustus 2026" />
                    </div>
                    <div className="md:col-span-2">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-widest block mb-2">Lokasi / Tempat</label>
                        <input type="text" required value={form.location} onChange={e=>setForm({...form, location: e.target.value})} className="w-full border-2 border-slate-100 p-3.5 rounded-md focus:border-emerald-500 outline-none text-sm bg-slate-50" placeholder="Zoom Meeting / Gedung Universitas..." />
                    </div>
                    
                    <div className="md:col-span-2 mt-4 pt-6 border-t border-slate-100">
                        <div className="flex justify-between items-center mb-4">
                            <h4 className="font-bold text-sm text-slate-900">Informasi Penandatanganan Elektronik</h4>
                            <button type="button" onClick={() => setSigners([...signers, {name:'', title:''}])} className="text-xs bg-emerald-100 text-emerald-700 px-3 py-1.5 rounded-md font-bold hover:bg-emerald-200 transition">+ Tambah Orang</button>
                        </div>
                        {signers.map((signer, index) => (
                            <div key={index} className="grid grid-cols-1 md:grid-cols-12 gap-3 mb-4 items-end bg-slate-50 p-4 rounded-md border border-slate-200">
                                <div className="md:col-span-5">
                                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-2">Nama Penandatangan {index + 1}</label>
                                    <input type="text" required value={signer.name} onChange={e => { const newS = [...signers]; newS[index].name = e.target.value; setSigners(newS); }} className="w-full border-2 border-slate-100 p-3 rounded-md focus:border-emerald-500 outline-none text-sm font-bold bg-white" placeholder="Cth: Dr. Ahmad Subarjo, M.Pd" />
                                </div>
                                <div className="md:col-span-6">
                                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-2">Jabatan</label>
                                    <input type="text" required value={signer.title} onChange={e => { const newS = [...signers]; newS[index].title = e.target.value; setSigners(newS); }} className="w-full border-2 border-slate-100 p-3 rounded-md focus:border-emerald-500 outline-none text-sm font-bold bg-white" placeholder="Cth: Direktur Utama" />
                                </div>
                                <div className="md:col-span-1 flex justify-end">
                                    {signers.length > 1 && (
                                        <button type="button" onClick={() => { const newS = [...signers]; newS.splice(index, 1); setSigners(newS); }} className="w-full md:w-auto p-3 bg-red-100 text-red-600 rounded-md hover:bg-red-200 flex justify-center font-black transition">X</button>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="bg-slate-50 p-6 rounded-md border border-slate-200 mb-8">
                    <div className="flex justify-between items-center mb-6">
                        <div><h4 className="font-bold text-sm text-slate-900">Data Peserta (Excel)</h4><p className="text-xs text-slate-500">Format kolom: Nama, NomorSertifikat, Email</p></div>
                        <label className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-md text-xs font-bold cursor-pointer shadow-md transition">
                            📤 Import File <input type="file" accept=".xlsx" onChange={handleImportExcel} className="hidden" />
                        </label>
                    </div>
                    {participants.length > 0 ? (
                        <div className="max-h-60 overflow-y-auto border border-slate-200 rounded-md bg-white shadow-inner">
                            <table className="w-full text-left text-xs">
                                <thead className="bg-slate-100 sticky top-0">
                                    <tr>
                                        <th className="p-3 border-b border-slate-200">Nama Lengkap</th>
                                        <th className="p-3 border-b border-slate-200">No. Sertifikat</th>
                                        <th className="p-3 border-b border-slate-200">Email</th>
                                        <th className="p-3 border-b border-slate-200 text-right">Aksi</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {participants.map((p, i) => (
                                        editingIndex === i ? (
                                            <tr key={i} className="border-b border-slate-50 bg-emerald-50/50">
                                                <td className="p-2"><input className="w-full p-2 border border-slate-200 rounded text-xs outline-none focus:border-emerald-500 bg-white" value={editForm.name} onChange={e => setEditForm({...editForm, name: e.target.value})} /></td>
                                                <td className="p-2"><input className="w-full p-2 border border-slate-200 rounded text-xs outline-none focus:border-emerald-500 bg-white" value={editForm.certId} onChange={e => setEditForm({...editForm, certId: e.target.value})} /></td>
                                                <td className="p-2"><input className="w-full p-2 border border-slate-200 rounded text-xs outline-none focus:border-emerald-500 bg-white" value={editForm.email} onChange={e => setEditForm({...editForm, email: e.target.value})} /></td>
                                                <td className="p-2 text-right whitespace-nowrap">
                                                    <button type="button" onClick={() => handleSaveEdit(i)} className="text-white bg-emerald-600 px-3 py-1.5 rounded-md font-bold text-[10px] hover:bg-emerald-500 mr-2 transition">Simpan</button>
                                                    <button type="button" onClick={() => setEditingIndex(-1)} className="text-slate-500 bg-slate-200 px-3 py-1.5 rounded-md font-bold text-[10px] hover:bg-slate-300 transition">Batal</button>
                                                </td>
                                            </tr>
                                        ) : (
                                            <tr key={i} className="border-b border-slate-50 hover:bg-slate-50 transition">
                                                <td className="p-3 font-bold text-slate-800">{p.name}</td>
                                                <td className="p-3 font-mono text-emerald-600">{p.certId}</td>
                                                <td className="p-3 text-slate-500">{p.email || '-'}</td>
                                                <td className="p-3 text-right whitespace-nowrap">
                                                    <button type="button" onClick={() => { setEditingIndex(i); setEditForm(p); }} className="text-blue-600 bg-blue-50 px-2 py-1.5 rounded-md font-bold hover:bg-blue-100 mr-2 transition" title="Edit Peserta">✏️</button>
                                                    <button type="button" onClick={() => { const newP = [...participants]; newP.splice(i, 1); setParticipants(newP); }} className="text-red-600 bg-red-50 px-2 py-1.5 rounded-md font-bold hover:bg-red-100 transition" title="Hapus Peserta">🗑️</button>
                                                </td>
                                            </tr>
                                        )
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : ( <div className="text-center py-10 border-2 border-dashed border-slate-200 rounded-md text-slate-400 text-sm font-medium">Belum ada data diimpor.</div> )}
                </div>
                
                <div className="flex justify-end">
                    <button type="submit" disabled={loading} className="bg-slate-900 hover:bg-slate-800 disabled:bg-slate-400 text-white font-bold px-10 py-4 rounded-md text-sm transition shadow-lg">
                        {loading ? 'Menyimpan...' : 'Simpan Acara & Peserta'}
                    </button>
                </div>
            </form>
        )}

        {/* MODAL KELOLA PESERTA DAN CHECKBOX GENERATE */}
        {manageEvent && (
            <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                <div className="bg-white rounded-xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
                    <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                        <div>
                            <h3 className="font-black text-lg text-slate-900">Kelola Peserta & Kirim Sertifikat</h3>
                            <p className="text-xs text-slate-500 mt-1">Acara: {manageEvent.name}</p>
                        </div>
                        <button onClick={() => setManageEvent(null)} className="text-slate-400 hover:text-red-500 font-bold text-xl">&times;</button>
                    </div>
                    
                    {/* Panel Aksi Generate Email, Tambah Peserta Manual, & Import Excel */}
                    <div className="px-6 py-4 bg-white border-b border-slate-100 flex flex-col md:flex-row justify-between items-center gap-4">
                        <div className="text-sm font-bold text-slate-600 flex items-center gap-2 w-full md:w-auto">
                           <input type="checkbox" id="selectAll" className="w-4 h-4 cursor-pointer" 
                               checked={selectedParticipants.length === eventParticipants.length && eventParticipants.length > 0} 
                               onChange={handleSelectAll} 
                           />
                           <label htmlFor="selectAll" className="cursor-pointer">Pilih Semua ({selectedParticipants.length} Terpilih)</label>
                        </div>
                        
                        <div className="flex flex-wrap justify-end gap-2 w-full md:w-auto">
                            <button 
                                onClick={() => setIsAddingParticipant(true)} 
                                disabled={isDownloading || isAddingParticipant || isImportingModal}
                                className="px-4 py-2.5 bg-slate-100 text-slate-700 rounded-md text-xs font-bold hover:bg-slate-200 transition disabled:opacity-50"
                            >
                                ➕ Tambah Manual
                            </button>
                            <label className={`px-4 py-2.5 bg-emerald-50 text-emerald-700 rounded-md text-xs font-bold transition flex items-center gap-1 cursor-pointer hover:bg-emerald-100 ${(isDownloading || isImportingModal) ? 'opacity-50 cursor-not-allowed pointer-events-none' : ''}`}>
                                📤 {isImportingModal ? 'Memproses...' : 'Import Excel'}
                                <input type="file" accept=".xlsx" onChange={handleImportExcelModal} className="hidden" disabled={isDownloading || isImportingModal} />
                            </label>
                            <button 
                                onClick={handleBatchGenerateAndSend} 
                                disabled={isDownloading || selectedParticipants.length === 0 || isImportingModal}
                                className="px-6 py-2.5 bg-indigo-50 text-indigo-700 rounded-md text-xs font-bold hover:bg-indigo-600 hover:text-white transition disabled:opacity-50 min-w-[150px]"
                            >
                                {isDownloading && processingEventId === manageEvent.id ? progressText : `🚀 Generate & Email`}
                            </button>
                        </div>
                    </div>

                    <div className="p-6 overflow-y-auto flex-1 bg-slate-50/50">
                        {isManagingLoading ? (
                            <p className="text-center text-slate-500 text-sm font-bold py-10">Memuat data peserta...</p>
                        ) : (
                            <div className="border border-slate-200 rounded-md bg-white overflow-hidden shadow-inner">
                                <table className="w-full text-left text-xs border-collapse">
                                    <thead className="bg-slate-100 sticky top-0 shadow-sm z-10">
                                        <tr>
                                            <th className="p-3 border-b border-slate-200 w-10 text-center">#</th>
                                            <th className="p-3 border-b border-slate-200">Nama Lengkap</th>
                                            <th className="p-3 border-b border-slate-200">No. Sertifikat</th>
                                            <th className="p-3 border-b border-slate-200">Email</th>
                                            <th className="p-3 border-b border-slate-200 text-right">Aksi</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {/* Baris Tambah Peserta Baru */}
                                        {isAddingParticipant && (
                                            <tr className="border-b border-emerald-100 bg-emerald-50/50">
                                                <td className="p-2 text-center text-emerald-600 font-bold">+</td>
                                                <td className="p-2"><input className="w-full p-2 border border-slate-200 rounded text-xs outline-none focus:border-emerald-500 bg-white" placeholder="Nama..." value={newParticipantForm.name} onChange={e => setNewParticipantForm({...newParticipantForm, name: e.target.value})} /></td>
                                                <td className="p-2"><input className="w-full p-2 border border-slate-200 rounded text-xs outline-none focus:border-emerald-500 bg-white" placeholder="MASE-..." value={newParticipantForm.certId} onChange={e => setNewParticipantForm({...newParticipantForm, certId: e.target.value})} /></td>
                                                <td className="p-2"><input className="w-full p-2 border border-slate-200 rounded text-xs outline-none focus:border-emerald-500 bg-white" placeholder="Email..." value={newParticipantForm.email} onChange={e => setNewParticipantForm({...newParticipantForm, email: e.target.value})} /></td>
                                                <td className="p-2 text-right whitespace-nowrap">
                                                    <button onClick={handleAddParticipantDb} className="text-white bg-emerald-600 px-3 py-1.5 rounded-md font-bold text-[10px] hover:bg-emerald-500 mr-2 transition">Simpan</button>
                                                    <button onClick={() => { setIsAddingParticipant(false); setNewParticipantForm({ name: '', certId: '', email: '' }); }} className="text-slate-500 bg-slate-200 px-3 py-1.5 rounded-md font-bold text-[10px] hover:bg-slate-300 transition">Batal</button>
                                                </td>
                                            </tr>
                                        )}

                                        {eventParticipants.map(p => (
                                            editingPartId === p.id ? (
                                                <tr key={p.id} className="border-b border-slate-50 bg-blue-50/50">
                                                    <td className="p-2 text-center">-</td>
                                                    <td className="p-2"><input className="w-full p-2 border border-slate-200 rounded text-xs outline-none focus:border-emerald-500 bg-white" value={partEditForm.name} onChange={e => setPartEditForm({...partEditForm, name: e.target.value})} /></td>
                                                    <td className="p-2"><input className="w-full p-2 border border-slate-200 rounded text-xs outline-none focus:border-emerald-500 bg-white" value={partEditForm.certId} onChange={e => setPartEditForm({...partEditForm, certId: e.target.value})} /></td>
                                                    <td className="p-2"><input className="w-full p-2 border border-slate-200 rounded text-xs outline-none focus:border-emerald-500 bg-white" value={partEditForm.email} onChange={e => setPartEditForm({...partEditForm, email: e.target.value})} /></td>
                                                    <td className="p-2 text-right whitespace-nowrap">
                                                        <button onClick={() => saveParticipantEdit(p.id)} className="text-white bg-blue-600 px-3 py-1.5 rounded-md font-bold text-[10px] hover:bg-blue-500 mr-2 transition">Update</button>
                                                        <button onClick={() => setEditingPartId(null)} className="text-slate-500 bg-slate-200 px-3 py-1.5 rounded-md font-bold text-[10px] hover:bg-slate-300 transition">Batal</button>
                                                    </td>
                                                </tr>
                                            ) : (
                                                <tr key={p.id} className="border-b border-slate-50 hover:bg-slate-50">
                                                    <td className="p-3 text-center">
                                                        <input type="checkbox" className="w-4 h-4 cursor-pointer" checked={selectedParticipants.includes(p.id)} onChange={() => handleSelectRow(p.id)} />
                                                    </td>
                                                    <td className="p-3 font-bold text-slate-800">{p.name}</td>
                                                    <td className="p-3 font-mono text-emerald-600">{p.certId}</td>
                                                    <td className="p-3 text-slate-500">{p.email || '-'}</td>
                                                    <td className="p-3 text-right whitespace-nowrap">
                                                        <button onClick={() => { setEditingPartId(p.id); setPartEditForm({ name: p.name, certId: p.certId, email: p.email }); }} className="text-blue-600 bg-blue-50 px-2 py-1.5 rounded-md font-bold hover:bg-blue-100 mr-2 transition" title="Edit Peserta Langsung (Database)">✏️</button>
                                                        <button onClick={() => deleteParticipantDb(p.id)} className="text-red-600 bg-red-50 px-2 py-1.5 rounded-md font-bold hover:bg-red-100 transition" title="Hapus Peserta Secara Permanen">🗑️</button>
                                                    </td>
                                                </tr>
                                            )
                                        ))}
                                        {eventParticipants.length === 0 && !isAddingParticipant && (
                                            <tr><td colSpan="5" className="text-center py-10 text-slate-400 font-medium">Tidak ada data peserta.</td></tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        )}
    </div>
  );
}