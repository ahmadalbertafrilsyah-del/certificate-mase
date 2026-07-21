"use client";
import { useState, useEffect, Suspense, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import Draggable from 'react-draggable';
import { Resizable } from 'react-resizable';
import 'react-resizable/css/styles.css';
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
  const [orientation, setOrientation] = useState('landscape');
  
  // Menambahkan properti align (center, left, right)
  const [items, setItems] = useState({
      name: { x: 300, y: 350, w: 400, h: 60, align: 'center' },
      certId: { x: 80, y: 700, w: 200, h: 30, align: 'center' },
      qr: { x: 950, y: 620, w: 120, h: 120 }
  });

  const nodeRefName = useRef(null);
  const nodeRefCertId = useRef(null);
  const nodeRefQr = useRef(null);
  
  const containerRef = useRef(null);
  const [scale, setScale] = useState(1);

  const canvasWidth = orientation === 'landscape' ? 1123 : 794;
  const canvasHeight = orientation === 'landscape' ? 794 : 1123;

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const updateScale = () => {
        if (!containerRef.current) return;
        const padding = window.innerWidth < 768 ? 32 : 64;
        const availableWidth = containerRef.current.clientWidth - padding;
        const newScale = availableWidth / canvasWidth;
        setScale(newScale < 1 ? newScale : 1);
    };

    const resizeObserver = new ResizeObserver(() => {
        window.requestAnimationFrame(updateScale);
    });

    resizeObserver.observe(container);
    updateScale(); 

    return () => {
        resizeObserver.disconnect();
    };
  }, [canvasWidth]);

  useEffect(() => {
    if(!eventId) return;
    const fetchEventDesign = async () => {
        const docRef = doc(db, "events", eventId);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            setEventData(docSnap.data());
            if(docSnap.data().design) {
                const savedPositions = docSnap.data().design.positions;
                if (savedPositions) {
                    setItems(prev => ({
                        name: { ...prev.name, ...savedPositions.name, align: savedPositions.name?.align || 'center' },
                        certId: { ...prev.certId, ...savedPositions.certId, align: savedPositions.certId?.align || 'center' },
                        qr: { ...prev.qr, ...savedPositions.qr }
                    }));
                }
                setBgImage(docSnap.data().design.bgUrl || '');
                if(docSnap.data().design.orientation) {
                    setOrientation(docSnap.data().design.orientation);
                }
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

  const handleDrag = (key) => (e, data) => setItems(prev => ({ ...prev, [key]: { ...prev[key], x: data.x, y: data.y } }));
  
  const onResize = (key) => (e, { size }) => {
    if (key === 'qr') {
        setItems(prev => ({ ...prev, [key]: { ...prev[key], w: size.width, h: size.width } }));
    } else {
        setItems(prev => ({ ...prev, [key]: { ...prev[key], w: size.width, h: size.height } }));
    }
  };

  const changeAlign = (key, alignment) => {
      setItems(prev => ({ ...prev, [key]: { ...prev[key], align: alignment } }));
  };

  const handleSaveDesign = async () => {
    setSaving(true);
    try {
        await updateDoc(doc(db, "events", eventId), {
            design: { positions: items, bgUrl: bgImage, orientation: orientation } 
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
        <div className="bg-white p-5 md:p-8 border-b border-slate-200 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shrink-0 shadow-sm z-10">
            <div>
                <h2 className="text-2xl font-black text-slate-900">Kanvas Desain</h2>
                <p className="text-sm text-slate-500 mt-1">Acara: <span className="font-bold text-emerald-600">{eventData?.name}</span></p>
            </div>
            <div className="flex flex-wrap gap-3 w-full md:w-auto">
                <select 
                    value={orientation} 
                    onChange={e => setOrientation(e.target.value)}
                    className="px-4 py-3 bg-slate-50 border border-slate-200 text-slate-700 rounded-md text-xs font-bold outline-none hover:bg-slate-100 transition shadow-sm"
                >
                    <option value="landscape">A4 Landscape</option>
                    <option value="portrait">A4 Portrait</option>
                </select>

                <label className="flex-1 text-center px-6 py-3 bg-slate-50 border border-slate-200 text-slate-700 rounded-md text-xs font-bold cursor-pointer hover:bg-slate-100 transition shadow-sm">
                    🖼️ Ganti Background
                    <input type="file" accept="image/*" onChange={handleBgUpload} className="hidden" />
                </label>
                <button onClick={handleSaveDesign} disabled={saving} className="flex-1 px-8 py-3 bg-emerald-600 text-white rounded-md text-xs font-bold hover:bg-emerald-500 transition shadow-md disabled:bg-slate-400">
                    {saving ? 'Menyimpan...' : '💾 Simpan Posisi'}
                </button>
            </div>
        </div>

        <div className="p-4 bg-white border-b border-slate-200 flex gap-6 text-xs shadow-sm z-10 overflow-x-auto justify-center">
             <div className="flex items-center gap-2 border-r border-slate-200 pr-6">
                 <span className="font-bold text-slate-600">Posisi Nama:</span>
                 <div className="flex bg-slate-100 rounded-md p-1">
                     <button onClick={() => changeAlign('name', 'flex-start')} className={`px-3 py-1 rounded ${items.name.align === 'flex-start' ? 'bg-white shadow text-emerald-600' : 'text-slate-500'}`}>Kiri</button>
                     <button onClick={() => changeAlign('name', 'center')} className={`px-3 py-1 rounded ${items.name.align === 'center' ? 'bg-white shadow text-emerald-600' : 'text-slate-500'}`}>Tengah</button>
                     <button onClick={() => changeAlign('name', 'flex-end')} className={`px-3 py-1 rounded ${items.name.align === 'flex-end' ? 'bg-white shadow text-emerald-600' : 'text-slate-500'}`}>Kanan</button>
                 </div>
             </div>
             <div className="flex items-center gap-2">
                 <span className="font-bold text-slate-600">Posisi Nomor:</span>
                 <div className="flex bg-slate-100 rounded-md p-1">
                     <button onClick={() => changeAlign('certId', 'flex-start')} className={`px-3 py-1 rounded ${items.certId.align === 'flex-start' ? 'bg-white shadow text-emerald-600' : 'text-slate-500'}`}>Kiri</button>
                     <button onClick={() => changeAlign('certId', 'center')} className={`px-3 py-1 rounded ${items.certId.align === 'center' ? 'bg-white shadow text-emerald-600' : 'text-slate-500'}`}>Tengah</button>
                     <button onClick={() => changeAlign('certId', 'flex-end')} className={`px-3 py-1 rounded ${items.certId.align === 'flex-end' ? 'bg-white shadow text-emerald-600' : 'text-slate-500'}`}>Kanan</button>
                 </div>
             </div>
        </div>

        <div ref={containerRef} className="flex-1 overflow-auto p-4 md:p-8 bg-slate-200/50">
            <div 
                style={{ width: `${canvasWidth * scale}px`, height: `${canvasHeight * scale}px`, position: 'relative', margin: '0 auto' }}
                className="shrink-0" 
            >
                <div 
                    className="border border-slate-300 bg-white shadow-2xl overflow-hidden rounded-md shrink-0" 
                    style={{ width: `${canvasWidth}px`, height: `${canvasHeight}px`, backgroundImage: bgImage ? `url(${bgImage})` : 'none', backgroundSize: '100% 100%', backgroundPosition: 'center', transform: `scale(${scale})`, transformOrigin: 'top left', position: 'absolute', top: 0, left: 0 }}
                >
                    {!bgImage && <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-400"><p className="text-2xl font-bold">Ukuran A4 {orientation === 'landscape' ? 'Landscape' : 'Portrait'}</p><p className="text-sm mt-2">Upload desain dari panel atas</p></div>}
                    
                    <Draggable scale={scale} nodeRef={nodeRefName} position={{x: items.name.x, y: items.name.y}} onStop={handleDrag('name')} bounds="parent" cancel=".react-resizable-handle">
                        <div ref={nodeRefName} className="absolute">
                            <Resizable width={items.name.w} height={items.name.h} onResize={onResize('name')}>
                                <div className="cursor-move border border-dashed border-blue-500 bg-blue-500/10 relative flex" style={{width: items.name.w, height: items.name.h, alignItems: 'center', justifyContent: items.name.align}}>
                                    <h2 style={{fontSize: items.name.h * 0.8}} className="font-bold text-slate-900 whitespace-nowrap px-2">Nama Peserta</h2>
                                </div>
                            </Resizable>
                        </div>
                    </Draggable>

                    <Draggable scale={scale} nodeRef={nodeRefCertId} position={{x: items.certId.x, y: items.certId.y}} onStop={handleDrag('certId')} bounds="parent" cancel=".react-resizable-handle">
                        <div ref={nodeRefCertId} className="absolute">
                            <Resizable width={items.certId.w} height={items.certId.h} onResize={onResize('certId')}>
                                <div className="cursor-move border border-dashed border-blue-500 bg-blue-500/10 relative flex" style={{width: items.certId.w, height: items.certId.h, alignItems: 'center', justifyContent: items.certId.align}}>
                                    <h2 style={{fontSize: items.certId.h * 0.8}} className="font-bold text-slate-900 whitespace-nowrap px-2">Kode ID Peserta</h2>
                                </div>
                            </Resizable>
                        </div>
                    </Draggable>

                    <Draggable scale={scale} nodeRef={nodeRefQr} position={{x: items.qr.x, y: items.qr.y}} onStop={handleDrag('qr')} bounds="parent" cancel=".react-resizable-handle">
                        <div ref={nodeRefQr} className="absolute">
                            <Resizable width={items.qr.w} height={items.qr.h} onResize={onResize('qr')} lockAspectRatio={true}>
                                <div className="cursor-move border border-dashed border-blue-500 bg-blue-500/10 flex flex-col items-center justify-center relative" style={{width: items.qr.w, height: items.qr.h}}>
                                    <div className="pointer-events-none flex flex-col items-center justify-center h-full w-full">
                                        <QRCodeSVG value="https://mahatma.id/verify" size={items.qr.w} fgColor="#000000" imageSettings={{ src: "https://i.ibb.co.com/21s67v2h/maseid.jpg", height: items.qr.w * 0.25, width: items.qr.w * 0.25, excavate: true }} />
                                    </div>
                                </div>
                            </Resizable>
                        </div>
                    </Draggable>
                </div>
            </div>
        </div>
    </div>
  );
}

export default function CertificateDesignerPage() {
    return <Suspense fallback={<div className="p-10 text-center font-bold">Memuat...</div>}><DesignEditor /></Suspense>
}