import nodemailer from 'nodemailer';
import { NextResponse } from 'next/server';

// Hindari timeout saat mengirim file besar
export const maxDuration = 60;

export async function POST(request) {
  try {
    const { email, name, certId, pdfBase64, eventName } = await request.json();

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

    // Validasi pembentukan buffer dari Base64
    const cleanBase64 = pdfBase64.includes("base64,") ? pdfBase64.split("base64,")[1] : pdfBase64;
    const pdfBuffer = Buffer.from(cleanBase64, "base64");

    const mailOptions = {
      from: `"Mahatma Academy" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: `E-Certificate: ${eventName} - ${name}`,
      html: `
        <div style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 10px; overflow: hidden;">
          <div style="background-color: #059669; padding: 20px; text-align: center;">
             <h2 style="color: white; margin: 0;">Sertifikat Elektronik</h2>
          </div>
          <div style="padding: 20px;">
             <p>Halo <strong>${name}</strong>,</p>
             <p>Terima kasih telah berpartisipasi dalam kegiatan <strong>${eventName}</strong>.</p>
             <p>Bersama email ini, kami melampirkan E-Certificate Anda dengan Nomor Registrasi: <strong>${certId}</strong>.</p>
             <p>Keaslian sertifikat ini dapat diverifikasi secara digital melalui portal resmi kami:</p>
             <div style="text-align: center; margin: 30px 0;">
                <a href="${process.env.NEXT_PUBLIC_BASE_URL}/verify/${certId}" style="background-color: #0f172a; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">Verifikasi Sertifikat</a>
             </div>
             <p style="font-size: 12px; color: #64748b;">Jika tombol di atas tidak berfungsi, salin link berikut: <br/>${process.env.NEXT_PUBLIC_BASE_URL}/verify/${certId}</p>
          </div>
          <div style="background-color: #f8fafc; padding: 15px; text-align: center; font-size: 12px; color: #94a3b8;">
             &copy; ${new Date().getFullYear()} Mahatma Academy.
          </div>
        </div>
      `,
      attachments: [
        {
          filename: `Sertifikat_${name.replace(/\s+/g, '_')}.pdf`,
          content: pdfBuffer,
          contentType: 'application/pdf'
        }
      ]
    };

    await transporter.sendMail(mailOptions);
    
    return NextResponse.json({ success: true, message: 'Email berhasil terkirim' });
  } catch (error) {
    console.error("Gagal mengirim email:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}