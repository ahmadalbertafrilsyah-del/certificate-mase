import { Merriweather } from 'next/font/google';
import './globals.css';

// Konfigurasi Font Merriweather
const merriweather = Merriweather({ 
  subsets: ['latin'],
  weight: ['300', '400', '700', '900'], 
  style: ['normal', 'italic'],          
  display: 'swap',
});

export const metadata = {
  title: 'Portal Sertifikat Resmi | Mahatma Academy',
  description: 'Sistem verifikasi keaslian sertifikat E-Certificate Mahatma Academy.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="id" className="scroll-smooth">
      <body className={`${merriweather.className} antialiased text-slate-800 bg-slate-50 selection:bg-emerald-500 selection:text-white`}>
        {children}
      </body>
    </html>
  );
}