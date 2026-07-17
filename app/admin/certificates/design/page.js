"use client";
import { useState, useEffect, Suspense, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import Draggable from 'react-draggable';
import { QRCodeSVG } from 'qrcode.react';
import { db } from '@/lib/firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';

function DesignEditor() {
  const searchParams = useSearchParams();
  const eventId = searchParams.get('eventId');
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [eventData, setEventData] = useState(null);
  const [bgImage, setBgImage] = useState('');
  
  const [positions, setPositions] = useState({ 
      name: { x: 300, y: 350 }, 
      certId: { x: 80, y: 700 }, 
      qr: { x: 950, y: 620 } 
  });

  // REFERENSI (nodeRef) UNTUK MENGATASI ERROR DRAGGABLE NOT MOUNTED
  const nodeRefName = useRef(null);
  const nodeRefCertId = useRef(null);
  const nodeRefQr = useRef(null);
  
  // REFERENSI & STATE UNTUK AUTO-SCALE KANVAS
  const containerRef = useRef(null);
  const [scale, setScale] = useState(1);

  // Menyesuaikan ukuran Kanvas otomatis dengan lebar layar
  useEffect(() => {
    const handleResize = () => {
        if (containerRef.current) {
            const availableWidth = containerRef.current.clientWidth - 40; // 40px untuk padding
            const standardWidth = 1123; // Lebar standar A4 Landscape
            
            if (availableWidth < standardWidth) {
                setScale(availableWidth / standardWidth);
            } else {
                setScale(1);
            }
        }
    };

    handleResize(); // Cek ukuran awal
    window.addEventListener('resize', handleResize);
    
    // Beri jeda sedikit saat komponen baru dimuat agar hitungan akurat
    setTimeout(handleResize, 100); 

    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if(!eventId) return;
    const fetchEventDesign = async () => {
        const docRef = doc(db, "events", eventId);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            setEventData(docSnap.data());
            if(docSnap.data().design) {
                setPositions(docSnap.data().design.positions);
                setBgImage(docSnap.data().design.bgUrl || '');
            }
        }
        setLoading(false);
    };
    fetchEventDesign();
  }, [eventId]);

  const handleBgUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setSaving(true);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET); 
    const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME; 

    try {
      const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, { method: 'POST', body: formData });
      if (!res.ok) throw new Error("Gagal mengunggah");
      const data = await res.json();
      setBgImage(data.secure_url); 
      alert("Background berhasil diunggah!");
    } catch (error) {
      console.error(error);
      alert("Gagal mengunggah gambar. Cek kembali .env.local Anda.");
    }
    setSaving(false);
  };

  const handleDrag = (element) => (e, data) => setPositions(prev => ({ ...prev, [element]: { x: data.x, y: data.y } }));

  const handleSaveDesign = async () => {
    setSaving(true);
    try {
        await updateDoc(doc(db, "events", eventId), {
            design: { positions: positions, bgUrl: bgImage } 
        });
        alert("Desain Kanvas berhasil disimpan permanen!");
    } catch (error) {
        alert("Gagal menyimpan desain.");
    }
    setSaving(false);
  };

  if(loading) return <div className="p-10 text-center text-emerald-600 font-bold">Memuat Kanvas...</div>;

  return (
    <div className="flex flex-col h-full bg-[#f8fafc] overflow-hidden">
        {/* HEADER PANEL */}
        <div className="bg-white p-5 md:p-8 border-b border-slate-200 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shrink-0 shadow-sm z-10">
            <div>
                <h2 className="text-2xl font-black text-slate-900">Kanvas Desain</h2>
                <p className="text-sm text-slate-500 mt-1">Acara: <span className="font-bold text-emerald-600">{eventData?.name}</span></p>
            </div>
            <div className="flex gap-3 w-full md:w-auto">
                <label className="flex-1 text-center px-6 py-3 bg-slate-50 border border-slate-200 text-slate-700 rounded-xl text-xs font-bold cursor-pointer hover:bg-slate-100 transition shadow-sm">
                    🖼️ Ganti Background
                    <input type="file" accept="image/*" onChange={handleBgUpload} className="hidden" />
                </label>
                <button onClick={handleSaveDesign} disabled={saving} className="flex-1 px-8 py-3 bg-emerald-600 text-white rounded-xl text-xs font-bold hover:bg-emerald-500 transition shadow-md disabled:bg-slate-400">
                    {saving ? 'Menyimpan...' : '💾 Simpan Posisi'}
                </button>
            </div>
        </div>

        {/* WORKSPACE AREA DENGAN AUTO-SCALE */}
        <div ref={containerRef} className="flex-1 overflow-auto p-4 md:p-8 bg-slate-200/50 flex justify-center items-start">
            <div 
                className="border border-slate-300 bg-white shadow-2xl relative overflow-hidden rounded-md transition-transform duration-200" 
                style={{ 
                    width: '1123px', 
                    height: '794px', 
                    backgroundImage: bgImage ? `url(${bgImage})` : 'none', 
                    backgroundSize: 'cover',
                    transform: `scale(${scale})`, 
                    transformOrigin: 'top center',
                    marginBottom: `${-(794 - (794 * scale))}px` // Mencegah ruang kosong berlebih di bawah saat kanvas mengecil
                }}
            >
                {!bgImage && <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-400"><p className="text-2xl font-bold">Ukuran A4 Landscape</p><p className="text-sm mt-2">Upload desain dari panel atas</p></div>}
                
                <Draggable nodeRef={nodeRefName} position={positions.name} onStop={handleDrag('name')} bounds="parent">
                    <div ref={nodeRefName} className="absolute cursor-move border-2 border-transparent hover:border-blue-500 border-dashed p-1 group">
                        <h2 className="text-[54px] leading-none font-bold text-slate-900 whitespace-nowrap drop-shadow-sm">Nama Peserta Disini</h2>
                        <span className="absolute -top-6 left-0 bg-blue-500 text-white text-[10px] font-bold px-2 py-0.5 rounded opacity-0 group-hover:opacity-100 transition">NAMA</span>
                    </div>
                </Draggable>

                <Draggable nodeRef={nodeRefCertId} position={positions.certId} onStop={handleDrag('certId')} bounds="parent">
                    <div ref={nodeRefCertId} className="absolute cursor-move border-2 border-transparent hover:border-orange-500 border-dashed p-1 group">
                        <p className="text-[20px] font-bold text-slate-800 whitespace-nowrap">No: MASE-2026-0001</p>
                        <span className="absolute -top-6 left-0 bg-orange-500 text-white text-[10px] font-bold px-2 py-0.5 rounded opacity-0 group-hover:opacity-100 transition">NOMOR</span>
                    </div>
                </Draggable>

                <Draggable nodeRef={nodeRefQr} position={positions.qr} onStop={handleDrag('qr')} bounds="parent">
                    <div ref={nodeRefQr} className="absolute cursor-move border-2 border-transparent hover:border-emerald-500 border-dashed p-1 bg-white/50 backdrop-blur-sm rounded-lg group flex flex-col items-center justify-center w-[120px] h-[120px]">
                        <QRCodeSVG value={`${process.env.NEXT_PUBLIC_BASE_URL || 'https://certificate.mahatma.id'}/verify/MASE-2026-0001`} size={100} />
                        <span className="text-[8px] font-bold mt-1 text-slate-900">SCAN ME</span>
                        <span className="absolute -top-6 left-0 bg-emerald-500 text-white text-[10px] font-bold px-2 py-0.5 rounded opacity-0 group-hover:opacity-100 transition">QR CODE</span>
                    </div>
                </Draggable>
            </div>
        </div>
    </div>
  );
}

export default function CertificateDesignerPage() {
    return <Suspense fallback={<div className="p-10 text-center font-bold">Memuat...</div>}><DesignEditor /></Suspense>
}