// app/api/send-notification/route.ts
import { Resend } from 'resend';
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const resend = new Resend(process.env.RESEND_API_KEY);
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  try {
    const { propertyId, uploadedFiles, target } = await req.json();

    // 1. 送信先メールアドレスの取得
    let emails: string[] = [];
    if (target === 'property') {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('email')
        .eq('property_id', propertyId)
        .eq('role', 'USER');
      emails = profiles?.map(p => p.email).filter(Boolean) as string[] || [];
    } else {
      const { data: allUsers } = await supabase
        .from('profiles')
        .select('email')
        .eq('role', 'USER');
      emails = allUsers?.map(u => u.email).filter(Boolean) as string[] || [];
    }

    if (emails.length === 0) return NextResponse.json({ message: '送信先がいません' });

    // 2. 添付ファイルの準備 (URLからバイナリを取得)
    const attachments = await Promise.all(
      uploadedFiles.map(async (file: { name: string; url: string }) => {
        const response = await fetch(file.url);
        const arrayBuffer = await response.arrayBuffer();
        return {
          filename: file.name,
          content: Buffer.from(arrayBuffer),
        };
      })
    );

    // 3. メールの送信
    const { data, error } = await resend.emails.send({
      from: 'ぽすっと運営局 <noreply@yourdomain.com>', // 認証済みドメイン
      to: emails,
      subject: '【ぽすっと】新しいお知らせが届きました',
      attachments: attachments,
      html: `
        <div style="font-family: sans-serif; color: #333; line-height: 1.6;">
          <h2 style="color: #2563eb;">新しいぽすっとが届きました！！</h2>
          <p>以下のURLからぽすっとを確認してください！</p>
          <div style="margin: 20px 0;">
            <a href="https://posutto.vercel.app/login?type=user" 
               style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">
               ログインして確認する
            </a>
          </div>
          <p style="font-size: 14px; color: #64748b;">URL: https://posutto.vercel.app/login?type=user</p>
          ${attachments.length > 0 ? `<p style="font-size: 14px; color: #64748b;">※ファイルが ${attachments.length} 件添付されています。</p>` : ''}
          <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
          <p style="font-size: 12px; color: #94a3b8;">© 2026 ぽすっと | Straid LLC</p>
        </div>
      `,
    });

    if (error) return NextResponse.json({ error }, { status: 400 });
    return NextResponse.json({ data });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}