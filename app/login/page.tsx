'use client'
import { useState, Suspense } from 'react' // Suspenseを追加
import { useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'

function LoginForm() { // フォーム部分を切り分け
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [loading, setLoading] = useState(false)
  const searchParams = useSearchParams()
  const propertyId = searchParams.get('id')

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    const redirectTo = `${window.location.origin}/auth/callback${
      propertyId ? `?property_id=${propertyId}` : ''
    }`
    const { error } = await supabase.auth.signInWithOtp({
      email: email,
      options: { emailRedirectTo: redirectTo },
    })
    if (error) {
      alert('エラー: ' + error.message)
    } else {
      alert('認証メールを送信しました！')
    }
    setLoading(false)
  }

  return (
    <div className="w-full max-w-sm bg-white p-8 rounded-2xl shadow-lg text-center">
      <h1 className="text-2xl font-bold mb-6 text-blue-600">sumikeaへようこそ</h1>
      {propertyId && (
        <div className="mb-4 p-2 bg-blue-50 text-blue-700 text-xs rounded-lg">
          物件ID: {propertyId} の登録を開始します
        </div>
      )}
      <form onSubmit={handleLogin} className="space-y-4 text-left">
        <input
          type="email"
          className="w-full p-3 bg-gray-50 border rounded-lg text-black"
          placeholder="メールアドレス"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-600 text-white p-4 rounded-xl font-bold"
        >
          {loading ? '送信中...' : '認証メールを受け取る'}
        </button>
      </form>
    </div>
  )
}

export default function LoginPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 p-4">
      <Suspense fallback={<p>読み込み中...</p>}>
        <LoginForm />
      </Suspense>
    </div>
  )
}