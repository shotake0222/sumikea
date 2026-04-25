import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

serve(async (req) => {
  const { record } = await req.json()

  // send_push が false なら何もしない
  if (!record.send_push) {
    return new Response(JSON.stringify({ message: "No push required" }), { status: 200 })
  }

  // 1. その物件(property_id)に属する住民のデバイストークンをDBから取得
  // 2. Firebase Admin SDK (または REST API) を叩いて通知を送信
  // 3. 送信結果をログに残す

  return new Response(JSON.stringify({ message: "Notification sent!" }), { status: 200 })
})