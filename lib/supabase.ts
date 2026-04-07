import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

// 変数が空の場合にエラーを出すようにして、原因を特定しやすくする
if (!supabaseUrl || !supabaseAnonKey) {
  console.error("Supabaseの環境変数が読み込めていません。")
}

export const supabase = createClient(
  supabaseUrl || '',
  supabaseAnonKey || ''
)