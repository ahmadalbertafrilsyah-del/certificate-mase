import nodemailer from 'nodemailer';
import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const { email, name, certId, eventName } = await request.json();

    if (!email) {
      return NextResponse.json({ success: false, error: 'Email tidak ditemukan' }, { status: 400 });
    }

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    const verifyLink = `${process.env.NEXT_PUBLIC_BASE_URL || 'https://certificate.mahatma.id'}/verify/${certId}`;

    const mailOptions = {
      from: `"Mahatma Academy" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: `E-Certificate: ${eventName} - ${name}`,
      html: `
        <div style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 10px; overflow: hidden;">
          <div style="background-color: #059669; padding: 20px; text-align: center;">
             <h2 style="color: white; margin: 0;">Sertifikat Elektronik Diterbitkan</h2>
          </div>
          <div style="padding: 20px;">
             <p>Halo <strong>${name}</strong>,</p>
             <p>Terima kasih telah berpartisipasi dalam kegiatan <strong>${eventName}</strong>.</p>
             <p>Sertifikat elektronik Anda telah terbit dengan Nomor Registrasi Resmi: <strong>${certId}</strong>.</p>
             <p>Anda dapat melihat, memverifikasi keaslian, dan mengunduh (Download PDF) sertifikat Anda melalui portal resmi kami:</p>
             <div style="text-align: center; margin: 35px 0;">
                <a href="${verifyLink}" style="background-color: #0f172a; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: bold;">Lihat & Unduh Sertifikat</a>
             </div>
             <p style="font-size: 12px; color: #64748b;">Jika tombol di atas tidak berfungsi, salin link berikut ke browser Anda: <br/>${verifyLink}</p>
          </div>
          <div style="background-color: #f8fafc; padding: 15px; text-align: center; font-size: 12px; color: #94a3b8;">
             &copy; ${new Date().getFullYear()} Mahatma Academy.
          </div>
        </div>
      `
    };

    await transporter.sendMail(mailOptions);
    
    return NextResponse.json({ success: true, message: 'Email notifikasi berhasil terkirim' });
  } catch (error) {
    console.error("Gagal mengirim email:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}