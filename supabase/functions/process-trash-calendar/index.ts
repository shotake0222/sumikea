import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

serve(async (req) => {
  const { imageUrl, propertyId, userId } = await req.json()

  // 1. OpenAI APIで画像解析 (Vision API)
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${Deno.env.get("OPENAI_API_KEY")}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: "このゴミ出しカレンダー画像から、曜日とゴミの種類のペアをすべて抽出して以下のJSON形式で返して。形式: [{\"day\": \"月\", \"type\": \"可燃\"}]。余計な説明は不要。" },
            { type: "image_url", image_url: { url: imageUrl } }
          ],
        },
      ],
    }),
  })

  const result = await response.json()
  const schedules = JSON.parse(result.choices[0].message.content)

  // 2. Supabase DBへ保存
  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!)
  
  const { error: dbError } = await supabase
    .from('trash_schedules')
    .insert(schedules.map((s: any) => ({
      property_id: propertyId,
      day_of_week: s.day,
      trash_type: s.type,
      created_by: userId
    })))

  // 3. インセンティブ（ポイント付与）のトリガー
  if (!dbError) {
    await supabase.from('user_points').insert({
      user_id: userId,
      points: 100, // 初回登録ボーナス
      reason: "trash_schedule_registration"
    })
  }

  return new Response(JSON.stringify({ success: true, data: schedules }), { headers: { "Content-Type": "application/json" } })
})