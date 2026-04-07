'use client'
import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation' // 追加
import { supabase } from '@/lib/supabase'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [loading, setLoading] = useState(false)
  const searchParams = useSearchParams() // 追加：URLのパラメータを取得
  
  // URLから物件IDを取得（例: /login?id=xxxx）
  const propertyId = searchParams.get('id')

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    // 認証後の戻り先URLを作成。物件IDをくっつけて callback ページへ飛ばす
    const redirectTo = `${window.location.origin}/auth/callback${
      propertyId ? `?property_id=${propertyId}` : ''
    }`

    const { error } = await supabase.auth.signInWithOtp({
      email: email,
      options: {
        emailRedirectTo: redirectTo, // ここで戻り先を指定！
      },
    })

    if (error) {
      alert('エラーが発生しました: ' + error.message)
    } else {
      alert('認証メールを送信しました。メール内のリンクをクリックして完了してください。')
    }
    setLoading(false)
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 p-4">
      <div className="w-full max-w-sm bg-white p-8 rounded-2xl shadow-lg text-center">
        <h1 className="text-2xl font-bold mb-6 text-blue-600">sumikeaへようこそ</h1>
        
        {/* 物件IDがある場合の表示（安心感のため） */}
        {propertyId && (
          <div className="mb-4 p-2 bg-blue-50 text-blue-700 text-xs rounded-lg">
            物件ID: {propertyId} の登録を開始します
          </div>
        )}

        <p className="text-sm text-gray-500 mb-8">
          物件情報の確認には、初回のみ登録が必要です。
        </p>

        <form onSubmit={handleLogin} className="space-y-4 text-left">
          <div>
            <label className="text-xs font-bold text-gray-400 uppercase">メールアドレス</label>
            <input
              type="email"
              className="w-full p-3 mt-1 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-black"
              placeholder="example@mail.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="text-xs font-bold text-gray-400 uppercase">電話番号（任意）</label>
            <input
              type="tel"
              className="w-full p-3 mt-1 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-black"
              placeholder="09012345678"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white p-4 rounded-xl font-bold hover:bg-blue-700 transition shadow-md disabled:bg-blue-300"
          >
            {loading ? '送信中...' : '認証メールを受け取る'}
          </button>
        </form>
      </div>
    </div>
  )
}