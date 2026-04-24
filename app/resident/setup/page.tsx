'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '../../../lib/supabase'; // パスは環境に合わせて調整してください

export default function ResidentSettingsPage() {
  const router = useRouter();
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  // カレンダーのアップロード処理
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    try {
      const file = e.target.files?.[0];
      if (!file) return;

      // 5MB以上のファイルは弾く（任意）
      if (file.size > 5 * 1024 * 1024) {
        throw new Error('ファイルサイズは5MB以下にしてください。');
      }

      setUploading(true);
      setError('');
      setMessage('');

      // 現在のユーザーを取得
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('セッションが切れました。再度ログインしてください。');

      // ファイル名を一意にする（例: user_id-123456.jpg）
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}-${Date.now()}.${fileExt}`;
      const filePath = `garbage_calendars/${fileName}`;

      // 1. Supabase Storage ('user_documents' バケット) へアップロード
      const { error: uploadError } = await supabase.storage
        .from('user_documents')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      // 2. アップロードしたファイルの公開URLを取得
      const { data: { publicUrl } } = supabase.storage
        .from('user_documents')
        .getPublicUrl(filePath);

      // 3. プロフィールにURLを保存
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ garbage_calendar_url: publicUrl })
        .eq('id', user.id);

      if (updateError) throw updateError;

      setMessage('カレンダーの登録が完了しました！');
      
      // 完了後、少し待ってからダッシュボードへ戻る
      setTimeout(() => {
        router.push('/resident/dashboard');
      }, 2000);

    } catch (err: any) {
      console.error('Upload Error:', err);
      setError(err.message || 'アップロードに失敗しました。');
    } finally {
      setUploading(false);
      // inputの値をリセット
      e.target.value = '';
    }
  };

  return (
    <div className="min-h-screen bg-[#0F172A] flex flex-col items-center p-6 text-white font-sans">
      <div className="max-w-md w-full space-y-8 mt-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
        
        {/* ヘッダー */}
        <header className="text-center space-y-2">
          <div className="w-16 h-16 bg-slate-800 rounded-2xl mx-auto flex items-center justify-center text-3xl shadow-lg border border-slate-700 mb-4">
            ⚙️
          </div>
          <h1 className="text-3xl font-black tracking-tighter italic uppercase">Settings</h1>
          <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">各種設定・アップロード</p>
        </header>

        {/* メイン機能：ゴミカレンダーアップロード */}
        <section className="bg-slate-800/50 p-6 rounded-[2rem] border border-slate-700 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 to-indigo-500"></div>
          
          <h2 className="text-lg font-black mb-2 flex items-center gap-2">
            <span>🗑️</span> マイ・ゴミカレンダー
          </h2>
          <p className="text-slate-400 text-[10px] mb-6 leading-relaxed">
            お住まいの地域のゴミ収集カレンダー（写真またはPDF）を登録すると、いつでもダッシュボードから確認できるようになります。
          </p>

          <div className="relative">
            <input 
              type="file" 
              accept="image/*,.pdf"
              onChange={handleFileUpload}
              disabled={uploading}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10 disabled:cursor-not-allowed"
            />
            <div className={`w-full border-2 border-dashed rounded-2xl p-8 flex flex-col items-center justify-center transition-all ${uploading ? 'border-blue-500/50 bg-blue-500/10' : 'border-slate-600 bg-slate-800 hover:border-blue-500 hover:bg-slate-700'}`}>
              <span className="text-3xl mb-3">{uploading ? '⏳' : '📤'}</span>
              <span className="text-sm font-bold text-slate-300">
                {uploading ? 'アップロード中...' : 'タップしてファイルを選択'}
              </span>
              <span className="text-[9px] text-slate-500 mt-2 font-black uppercase tracking-widest">
                JPG, PNG, PDF (Max 5MB)
              </span>
            </div>
          </div>

          {/* メッセージ表示エリア */}
          {message && (
            <p className="text-green-400 text-xs font-bold mt-4 text-center bg-green-500/10 py-2 rounded-xl border border-green-500/20 animate-pulse">
              {message}
            </p>
          )}
          {error && (
            <p className="text-red-400 text-xs font-bold mt-4 text-center bg-red-500/10 py-2 rounded-xl border border-red-500/20">
              {error}
            </p>
          )}
        </section>

        {/* 開発中の機能（元コードの要素） */}
        <section className="text-center py-8">
          <div className="w-12 h-12 bg-slate-800/50 rounded-full mx-auto flex items-center justify-center text-xl mb-4 opacity-50">
            🛠️
          </div>
          <p className="text-slate-500 text-xs leading-relaxed font-bold">
            その他の設定機能やご近所特典は<br />
            現在エンジニアが鋭意開発中です。<br />
            リリースまで今しばらくお待ちください。
          </p>
        </section>

        {/* ナビゲーション */}
        <div className="pt-4">
          <button 
            onClick={() => router.back()}
            disabled={uploading}
            className="w-full bg-slate-800 text-white py-5 rounded-[2rem] font-black text-lg shadow-xl hover:bg-slate-700 transition-all active:scale-[0.97] disabled:opacity-50"
          >
            ← 戻る
          </button>
          
          <Link href="/resident/dashboard" className="block mt-6 text-center text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] hover:text-white transition-colors">
            ダッシュボードへ移動
          </Link>
        </div>

        <footer className="pt-10 pb-8 text-[9px] text-slate-800 text-center font-bold uppercase tracking-[0.4em]">
          Posutto Digital Protocol v2.5
        </footer>
      </div>
    </div>
  );
}