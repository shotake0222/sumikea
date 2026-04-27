import { Resend } from 'resend';
import { NextResponse } from 'next/server';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(req: Request) {
  try {
    const { title, content, emails } = await req.json();

    const { data, error } = await resend.emails.send({
      from: 'ぽすっと運営局 <noreply@yourdomain.com>', // 認証したドメイン
      to: emails, // 配列で渡せます
      subject: title,
      html: `<strong>${content}</strong>`, // HTMLでリッチに装飾可能
    });

    if (error) return NextResponse.json({ error }, { status: 400 });
    return NextResponse.json({ data });
  } catch (err) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}