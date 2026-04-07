import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
// ANON でも ANONYM でも、どちらかある方を採用する設定です
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANONYM_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('設定エラー: URLまたはKeyが読み込めません', { url: !!supabaseUrl, key: !!supabaseAnonKey })
}

export const supabase = createClient(
  supabaseUrl || '', 
  supabaseAnonKey || ''
)