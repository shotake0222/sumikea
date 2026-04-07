import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

// 環境変数が無い場合にビルドログで気づけるようにする
if (!supabaseUrl || !supabaseAnonKey) {
  console.warn("⚠️ Supabaseの環境変数が読み込めていません。Vercelの設定を確認してください。")
}

// 唯一の定義（サーバー・クライアント両対応の設定）
export const supabase = createClient(
  supabaseUrl || '',
  supabaseAnonKey || '',
  {
    auth: {
      persistSession: false
    }
  }
)