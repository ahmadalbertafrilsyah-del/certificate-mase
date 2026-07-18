"use client";
import { useEffect, useState, useRef, use } from 'react';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import Link from 'next/link';
import jsPDF from 'jspdf';
import { toJpeg } from 'html-to-image'; 
import { QRCodeSVG } from 'qrcode.react';

export default function VerifyPage({ params }) {
  const resolvedParams = use(params);
  const certId = resolvedParams.id;
  
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [liveTime, setLiveTime] = useState('');
  const [isDownloading, setIsDownloading] = useState(false);
  
  const containerRef = useRef(null);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const timer = setInterval(() => setLiveTime(new Date().toLocaleString('id-ID')), 1000);
    
    const fetchCertificate = async () => {
      try {
        const q = query(collection(db, "participants"), where("certId", "==", certId));
        const querySnapshot = await getDocs(q);
        
        if (!querySnapshot.empty) {
          const participantData = querySnapshot.docs[0].data();
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

  useEffect(() => {
    if (data && data.event?.design) {
      const handleResize = () => {
        if (containerRef.current) {
          const availableWidth = containerRef.current.clientWidth;
          const isLandscape = data.event.design.orientation !== 'portrait';
          const canvasWidth = isLandscape ? 1123 : 794;
          
          const safeWidth = availableWidth - 4; 
          const newScale = safeWidth / canvasWidth;
          
          setScale(newScale < 1 ? newScale : 1);
        }
      };

      handleResize();
      window.addEventListener('resize', handleResize);
      setTimeout(handleResize, 100);
      setTimeout(handleResize, 500);

      return () => window.removeEventListener('resize', handleResize);
    }
  }, [data]);

  const handleDownloadPDF = async () => {
    if (!data.event?.design) return alert("Desain sertifikat belum tersedia.");
    setIsDownloading(true);

    const config = data.event.design;
    const isLandscape = config.orientation !== 'portrait';
    const canvasWidth = isLandscape ? 1123 : 794;
    const canvasHeight = isLandscape ? 794 : 1123;
    const qrLink = `${process.env.NEXT_PUBLIC_BASE_URL || 'https://certificate.mahatma.id'}/verify/${certId}`;

    const hiddenContainer = document.createElement('div');
    hiddenContainer.style.position = 'absolute';
    hiddenContainer.style.top = '-9999px';
    hiddenContainer.style.left = '-9999px';
    document.body.appendChild(hiddenContainer);
    
    const alignName = config.positions?.name?.align || 'center';
    const alignCertId = config.positions?.certId?.align || 'center';

    hiddenContainer.innerHTML = `
      <div id="cert-render-pdf" style="width: ${canvasWidth}px; height: ${canvasHeight}px; background-image: url('${config.bgUrl}'); background-size: cover; background-repeat: no-repeat; position: relative;">
        <div style="position: absolute; left: ${config.positions.name.x}px; top: ${config.positions.name.y}px; width: ${config.positions.name.w}px; height: ${config.positions.name.h}px; display: flex; align-items: center; justify-content: ${alignName};">
          <h2 style="font-size: ${(config.positions.name.h || 60) * 0.8}px; margin: 0; padding: 0 8px; font-weight: bold; color: #0f172a; white-space: nowrap;">${data.name}</h2>
        </div>
        <div style="position: absolute; left: ${config.positions.certId.x}px; top: ${config.positions.certId.y}px; width: ${config.positions.certId.w}px; height: ${config.positions.certId.h}px; display: flex; align-items: center; justify-content: ${alignCertId};">
          <p style="font-size: ${(config.positions.certId.h || 30) * 0.8}px; margin: 0; padding: 0 8px; font-weight: bold; color: #1e293b; white-space: nowrap;">${certId}</p>
        </div>
        <div style="position: absolute; left: ${config.positions.qr.x}px; top: ${config.positions.qr.y}px; width: ${config.positions.qr.w}px; height: ${config.positions.qr.h}px; display: flex; align-items: center; justify-content: center; flex-direction: column;">
           <img src="https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(qrLink)}" style="width: 100%; height: 100%; object-fit: contain;" alt="QR" />
        </div>
      </div>
    `;

    try {
      const elementToRender = document.getElementById('cert-render-pdf');
      const dataUrl = await toJpeg(elementToRender, { quality: 1.0, pixelRatio: 2 });
      
      const pdfFormat = isLandscape ? 'landscape' : 'portrait';
      const pdfWidth = isLandscape ? 297 : 210;
      const pdfHeight = isLandscape ? 210 : 297;
      
      const pdf = new jsPDF({ orientation: pdfFormat, unit: 'mm', format: 'a4' });
      pdf.addImage(dataUrl, 'JPEG', 0, 0, pdfWidth, pdfHeight);
      
      const safeName = data.name.replace(/[^a-z0-9]/gi, '_').toLowerCase();
      pdf.save(`Sertifikat_${safeName}.pdf`);
    } catch (err) {
      console.error("Gagal mendownload PDF", err);
      alert("Terjadi kesalahan saat mengunduh sertifikat.");
    } finally {
      document.body.removeChild(hiddenContainer);
      setIsDownloading(false);
    }
  };

  if (loading) return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center">
        <div className="w-10 h-10 border-4 border-emerald-600 border-t-transparent rounded-md animate-spin mb-4"></div>
        <p className="text-slate-500 font-bold tracking-widest text-sm uppercase">Memvalidasi Data...</p>
    </div>
  );

  if (!data) return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
      <div className="max-w-md w-full bg-white p-8 rounded-md shadow-xl border-t-4 border-red-500 text-center">
        <div className="w-16 h-16 bg-red-100 text-red-500 rounded-md flex items-center justify-center mx-auto mb-4 text-3xl">❌</div>
        <h1 className="text-2xl font-black text-slate-900 mb-2">Dokumen Tidak Valid</h1>
        <p className="text-slate-500 text-sm mb-8 leading-relaxed">Nomor registrasi <b>{certId}</b> tidak ditemukan dalam basis data resmi Mahatma Academy. Mohon periksa kembali nomor yang Anda masukkan.</p>
        <Link href="/" className="inline-block bg-slate-900 text-white px-8 py-3 rounded-md font-bold text-sm hover:bg-slate-800 transition">
            Kembali ke Pencarian
        </Link>
      </div>
    </div>
  );

  const isLandscape = data.event?.design?.orientation !== 'portrait';
  const canvasWidth = isLandscape ? 1123 : 794;
  const canvasHeight = isLandscape ? 794 : 1123;
  const design = data.event?.design;
  
  const signersList = data.event?.signers || (data.event?.signerName ? [{ name: data.event.signerName, title: data.event.signerTitle }] : []);

  const alignName = design?.positions?.name?.align || 'center';
  const alignCertId = design?.positions?.certId?.align || 'center';

  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4 flex flex-col items-center">
      <div className="max-w-4xl w-full bg-white rounded-md shadow-xl border border-slate-100 overflow-hidden">
        
        <div className="bg-emerald-600 p-8 text-center text-white relative overflow-hidden">
           <div className="absolute inset-0 bg-white/20 w-16 skew-x-[45deg] animate-[slide_3s_infinite]"></div>
           <div className="w-16 h-16 bg-white text-emerald-600 rounded-md flex items-center justify-center mx-auto mb-4 text-3xl shadow-lg">✓</div>
           <h1 className="text-2xl font-black uppercase tracking-widest mb-1">Sertifikat Valid</h1>
           <p className="text-xs text-emerald-100 opacity-90 tracking-wider">Diperiksa: {liveTime}</p>
        </div>
        
        <div className="p-6 md:p-10">
          
          <div className="mb-10">
             <h3 className="text-lg font-black text-slate-900 mb-4 border-b border-slate-200 pb-2">Informasi Dokumen</h3>
             <div className="border border-slate-200 rounded-md overflow-hidden">
                <table className="w-full text-left text-sm">
                   <tbody>
                      <tr className="border-b border-slate-100 bg-slate-50">
                         <th className="py-3 px-4 font-bold text-slate-600 w-1/3">Nama Peserta</th>
                         <td className="py-3 px-4 font-black text-slate-900">{data.name}</td>
                      </tr>
                      <tr className="border-b border-slate-100">
                         <th className="py-3 px-4 font-bold text-slate-600 w-1/3">Nomor Sertifikat</th>
                         <td className="py-3 px-4 font-bold text-emerald-700 font-mono">{certId}</td>
                      </tr>
                      <tr className="border-b border-slate-100 bg-slate-50">
                         <th className="py-3 px-4 font-bold text-slate-600 w-1/3">Nama Kegiatan</th>
                         <td className="py-3 px-4 font-medium text-slate-800">{data.event?.name}</td>
                      </tr>
                      <tr className="border-b border-slate-100">
                         <th className="py-3 px-4 font-bold text-slate-600 w-1/3">Tanggal Pelaksanaan</th>
                         <td className="py-3 px-4 font-medium text-slate-800">{data.event?.date}</td>
                      </tr>
                      <tr>
                         <th className="py-3 px-4 font-bold text-slate-600 w-1/3">Tempat Pelaksanaan</th>
                         <td className="py-3 px-4 font-medium text-slate-800">{data.event?.location}</td>
                      </tr>
                   </tbody>
                </table>
             </div>
          </div>

          <div className="mb-10">
            {signersList.map((signer, idx) => (
                <div key={idx} className="mb-4 bg-blue-50 border border-blue-100 rounded-md p-6 flex flex-col md:flex-row items-center gap-6">
                    <div className="w-16 h-16 bg-blue-600 text-white rounded-full flex items-center justify-center text-3xl shrink-0 shadow-md">
                       ✒️
                    </div>
                    <div className="text-center md:text-left">
                        <h4 className="text-sm font-bold text-blue-900 uppercase tracking-widest mb-1">Tanda Tangan Elektronik {signersList.length > 1 ? idx + 1 : ''}</h4>
                        <p className="text-xs text-blue-700 mb-2">Dokumen ini telah disahkan secara digital (terenkripsi) oleh:</p>
                        <p className="text-lg font-black text-slate-900">{signer.name || "Nama Tidak Tersedia"}</p>
                        <p className="text-sm font-bold text-slate-600">{signer.title || "Jabatan Tidak Tersedia"}</p>
                    </div>
                </div>
            ))}
          </div>

          {design && design.bgUrl ? (
             <div className="mb-8 border border-slate-200 rounded-md overflow-hidden bg-white">
               <div className="bg-slate-50 px-4 py-3 border-b border-slate-200 text-xs font-bold text-slate-500 uppercase tracking-widest text-center">
                 Preview Dokumen Asli
               </div>
               
               <div className="p-4 md:p-8 flex justify-center items-center bg-slate-100/50 w-full overflow-hidden">
                 <div ref={containerRef} className="w-full flex justify-center">
                   <div 
                     className="relative transition-all duration-300"
                     style={{ width: `${canvasWidth * scale}px`, height: `${canvasHeight * scale}px` }}
                   >
                     <div 
                       className="absolute top-0 left-0 bg-white shadow-lg border border-slate-200 overflow-hidden origin-top-left"
                       style={{ 
                         width: `${canvasWidth}px`, height: `${canvasHeight}px`, 
                         backgroundImage: `url(${design.bgUrl})`, backgroundSize: '100% 100%',
                         transform: `scale(${scale})` 
                       }}
                     >
                        <div style={{ position: 'absolute', left: `${design.positions.name.x}px`, top: `${design.positions.name.y}px`, width: `${design.positions.name.w}px`, height: `${design.positions.name.h}px`, display: 'flex', alignItems: 'center', justifyContent: alignName }}>
                            <h2 style={{ fontSize: `${design.positions.name.h * 0.8}px`, margin: 0, padding: '0 8px', fontWeight: 'bold', color: '#0f172a', whiteSpace: 'nowrap' }}>{data.name}</h2>
                        </div>
                        <div style={{ position: 'absolute', left: `${design.positions.certId.x}px`, top: `${design.positions.certId.y}px`, width: `${design.positions.certId.w}px`, height: `${design.positions.certId.h}px`, display: 'flex', alignItems: 'center', justifyContent: alignCertId }}>
                            <p style={{ fontSize: `${design.positions.certId.h * 0.8}px`, margin: 0, padding: '0 8px', fontWeight: 'bold', color: '#1e293b', whiteSpace: 'nowrap' }}>{certId}</p>
                        </div>
                        <div style={{ position: 'absolute', left: `${design.positions.qr.x}px`, top: `${design.positions.qr.y}px`, width: `${design.positions.qr.w}px`, height: `${design.positions.qr.h}px`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column' }}>
                            <QRCodeSVG 
                                value={`${process.env.NEXT_PUBLIC_BASE_URL || 'https://certificate.mahatma.id'}/verify/${certId}`} 
                                size={design.positions.qr.w}
                                fgColor="#0f172a"
                                imageSettings={{
                                    src: "https://i.ibb.co.com/21s67v2h/maseid.png",
                                    height: (design.positions.qr.w) * 0.25,
                                    width: (design.positions.qr.w) * 0.25,
                                    excavate: true,
                                }}
                            />
                        </div>
                     </div>
                   </div>
                 </div>
               </div>
             </div>
          ) : (
             <div className="mb-8 p-6 text-center border-2 border-dashed border-slate-200 rounded-md text-slate-400 text-sm">
                Desain sertifikat belum tersedia.
             </div>
          )}

          <div className="flex flex-col sm:flex-row gap-3 justify-center mt-4">
             <button 
                onClick={handleDownloadPDF} 
                disabled={isDownloading || !design?.bgUrl}
                className="inline-block bg-emerald-600 text-white px-8 py-3.5 rounded-md font-bold text-xs uppercase tracking-widest hover:bg-emerald-500 transition shadow-md disabled:bg-emerald-300"
             >
                {isDownloading ? 'Menyiapkan Dokumen...' : '📥 Download PDF'}
             </button>
             <Link href="/" className="inline-block bg-slate-100 text-slate-700 px-8 py-3.5 rounded-md font-bold text-xs uppercase tracking-widest hover:bg-slate-200 transition text-center">
                Cek Dokumen Lainnya
             </Link>
          </div>
        </div>
      </div>
    </div>
  );
}