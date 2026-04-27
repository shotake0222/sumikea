// app/api/send-welcome/route.ts
import { Resend } from 'resend';
import { NextResponse } from 'next/server';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(req: Request) {
  try {
    const { email, name, password, loginUrl, roleName } = await req.json();

    const { data, error } = await resend.emails.send({
      from: 'ぽすっと運営局 <noreply@yourdomain.com>',
      to: [email],
      subject: `【ぽすっと】${roleName}アカウント作成のお知らせ`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #eee; padding: 20px;">
          <h2 style="color: #2563eb;">ぽすっとへようこそ！</h2>
          <p>${name} 様</p>
          <p>管理画面のアカウント作成が完了しました。以下の情報でログインしてご利用を開始してください。</p>
          <div style="background: #f8fafc; padding: 20px; border-radius: 10px; margin: 20px 0;">
            <p style="margin: 5px 0;"><strong>ログインURL:</strong> <a href="${loginUrl}">${loginUrl}</a></p>
            <p style="margin: 5px 0;"><strong>ログインID:</strong> ${email}</p>
            <p style="margin: 5px 0;"><strong>初期パスワード:</strong> <span style="color: #f97316; font-size: 1.2em; font-weight: bold;">${password}</span></p>
          </div>
          <p style="font-size: 12px; color: #64748b;">※ログイン後、セキュリティのため速やかにパスワードを変更してください。</p>
        </div>
      `,
    });

    if (error) return NextResponse.json({ error }, { status: 400 });
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}