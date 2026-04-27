import { NextResponse } from 'next/server';
// import { Resend } from 'resend'; // 一旦コメントアウト

// const resend = new Resend(process.env.RESEND_API_KEY); // これがビルドエラーの原因

export async function POST(req: Request) {
  // 準備ができるまで、ロジック全体を一旦ダミーレスポンスにする
  return NextResponse.json({ 
    message: "Notification API is currently disabled for build." 
  });

  /* 後で使う時のためのコード
  const resend = new Resend(process.env.RESEND_API_KEY);
  try {
    const { data, error } = await resend.emails.send({ ... });
    return NextResponse.json({ data });
  } catch (error) {
    return NextResponse.json({ error });
  }
  */
}