import { createClient } from '@supabase/supabase-js'

// VercelのSettings > Environment Variables に登録する名前をこれに統一します
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  // ビルド時にエラーの理由を明確にするためのメッセージ
  console.error('Supabase環境変数が設定されていません。URL:', supabaseUrl)
}

export const supabase = createClient(
  supabaseUrl || '', 
  supabaseAnonKey || ''
)