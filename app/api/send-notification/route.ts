import { Resend } from 'resend';
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// ビルドライタイムのエラーを防ぐため、動的レンダリングを強制
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    // 関数内で環境変数をチェックし、初期化する
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Supabase environment variables are missing.');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const resend = new Resend(process.env.RESEND_API_KEY);

    const { propertyId, uploadedFiles, target } = await req.json();

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

    const { data, error } = await resend.emails.send({
      from: 'ぽすっと運営局 <noreply@yourdomain.com>',
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
          <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
          <p style="font-size: 12px; color: #94a3b8;">© 2026 ぽすっと | Straid LLC</p>
        </div>
      `,
    });

    if (error) return NextResponse.json({ error }, { status: 400 });
    return NextResponse.json({ data });
  } catch (err: any) {
    console.error('API Error:', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}