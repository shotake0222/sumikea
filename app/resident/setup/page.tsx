'use client';

import { useState } from 'react';
import { supabase } from '../../../lib/supabase';
import { useRouter } from 'next/navigation';

export default function ResidentSetupPage() {
  const router = useRouter();
  const [step, setStep] = useState(1); // 1: コード入力, 2: デモグラ取得
  
  // 物件紐付け用
  const [inviteCode, setInviteCode] = useState('');
  const [propertyInfo, setPropertyInfo] = useState<{id: string, name: string, code_id: string} | null>(null);
  
  // デモグラフィック情報
  const [householdSize, setHouseholdSize] = useState('1');
  const [lifestyle, setLifestyle] = useState<string[]>([]);
  const [hasPet, setHasPet] = useState(false);
  const [transportation, setTransportation] = useState('train');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  // ステップ1: 招待コードの照合 (invitation_codesテーブルを参照)
  const verifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');

    try {
      // invitation_codesテーブルから、入力されたコードかつ未使用のものを検索
      const { data: codeData, error: fetchError } = await supabase
        .from('invitation_codes')
        .select(`
          id,
          property_id,
          is_used,
          properties (
            id,
            name
          )
        `)
        .eq('code', inviteCode.trim().toUpperCase())
        .eq('is_used', false)
        .single();

      if (fetchError || !codeData || !codeData.properties) {
        setError('無効な招待コードか、既に使用されています。');
      } else {
        // 物件情報をセット（後の更新用にコードのIDも保持）
        setPropertyInfo({
          id: (codeData.properties as any).id,
          name: (codeData.properties as any).name,
          code_id: codeData.id
        });
        setStep(2); // 次のステップへ
      }
    } catch (err) {
      setError('通信エラーが発生しました。');
    } finally {
      setIsSubmitting(false);
    }
  };

  // ライフスタイルの選択制御
  const toggleLifestyle = (tag: string) => {
    setLifestyle(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]);
  };

  // ステップ2: 最終保存
  const handleFinalSubmit = async () => {
    if (!propertyInfo) return;
    setIsSubmitting(true);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('セッションエラー');

      // 1. プロフィールの更新
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ 
          property_id: propertyInfo.id,
          role: 'RESIDENT',
          household_size: parseInt(householdSize),
          lifestyle_tags: lifestyle,
          has_pet: hasPet,
          primary_transport: transportation,
          is_setup_completed: true, // セットアップ完了フラグ
          setup_completed_at: new Date().toISOString()
        })
        .eq('id', user.id);

      if (updateError) throw updateError;

      // 2. 招待コードを使用済みにマーク
      await supabase
        .from('invitation_codes')
        .update({ is_used: true })
        .eq('id', propertyInfo.code_id);

      // ダッシュボードへ（window.locationで確実にリロードを伴い遷移）
      window.location.href = '/resident/dashboard';
    } catch (err: any) {
      setError(err.message);
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0F172A] flex items-center justify-center p-6 text-white font-sans">
      <div className="max-w-md w-full">
        
        {/* プログレスバー */}
        <div className="flex gap-2 mb-10">
          <div className={`h-1 flex-1 rounded-full transition-all ${step >= 1 ? 'bg-blue-500' : 'bg-slate-700'}`} />
          <div className={`h-1 flex-1 rounded-full transition-all ${step >= 2 ? 'bg-blue-500' : 'bg-slate-700'}`} />
        </div>

        {step === 1 ? (
          <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4">
            <div className="text-center">
              <div className="w-20 h-20 bg-blue-600 rounded-3xl mx-auto mb-6 flex items-center justify-center shadow-2xl shadow-blue-500/20">
                <span className="text-3xl">🔑</span>
              </div>
              <h1 className="text-3xl font-black tracking-tighter italic">ENTER CODE</h1>
              <p className="text-slate-400 text-sm mt-3 font-medium tracking-tight">
                管理会社から配布された<br/>
                招待コードを入力してください
              </p>
            </div>

            <form onSubmit={verifyCode} className="space-y-6">
              <input 
                type="text"
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value)}
                placeholder="POS-XXXX-XXXX"
                className="w-full bg-slate-800/50 border-2 border-slate-700 p-6 rounded-[2rem] text-center text-2xl font-black tracking-[0.1em] focus:border-blue-500 outline-none transition-all uppercase placeholder:text-slate-600"
                required
              />
              {error && <p className="text-red-400 text-xs font-bold text-center animate-bounce">{error}</p>}
              <button 
                type="submit"
                disabled={isSubmitting || !inviteCode}
                className="w-full bg-white text-slate-900 py-6 rounded-[2rem] font-black text-lg hover:bg-blue-500 hover:text-white transition-all active:scale-[0.97] shadow-xl shadow-white/5"
              >
                {isSubmitting ? '認証中...' : '次へ進む'}
              </button>
            </form>
          </div>
        ) : (
          <div className="space-y-8 animate-in fade-in slide-in-from-right-4">
            <header className="text-center">
              <div className="inline-block bg-blue-500/20 text-blue-400 text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest mb-3 border border-blue-500/30">
                Success: {propertyInfo?.name}
              </div>
              <h1 className="text-2xl font-black tracking-tighter">暮らしの設定</h1>
              <p className="text-slate-400 text-xs mt-2">最適な情報を届けるために教えてください</p>
            </header>

            <div className="space-y-8 bg-slate-800/40 p-8 rounded-[2.5rem] border border-slate-700">
              {/* 世帯人数 */}
              <div className="space-y-3">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">世帯人数</label>
                <div className="flex justify-between gap-2">
                  {['1', '2', '3', '4+'].map(num => (
                    <button key={num} onClick={() => setHouseholdSize(num)}
                      className={`flex-1 py-3 rounded-xl font-black transition ${householdSize === num ? 'bg-blue-600 text-white' : 'bg-slate-700 text-slate-400'}`}>
                      {num}
                    </button>
                  ))}
                </div>
              </div>

              {/* 移動手段 */}
              <div className="space-y-3">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">主な移動手段</label>
                <select 
                  value={transportation} onChange={(e) => setTransportation(e.target.value)}
                  className="w-full bg-slate-700 p-4 rounded-xl font-bold outline-none border-none text-sm text-white appearance-none cursor-pointer"
                >
                  <option value="train">電車・バス</option>
                  <option value="car">自家用車</option>
                  <option value="bike">自転車・バイク</option>
                  <option value="walk">徒歩のみ</option>
                </select>
              </div>

              {/* ライフスタイル */}
              <div className="space-y-3">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">ライフスタイル（複数可）</label>
                <div className="flex flex-wrap gap-2">
                  {[
                    {id: 'worker', label: '会社員'}, {id: 'remote', label: '在宅ワーク'}, 
                    {id: 'student', label: '学生'}, {id: 'family', label: '子育て中'},
                    {id: 'night', label: '夜型生活'}, {id: 'holiday_work', label: '土日祝も仕事'}
                  ].map(tag => (
                    <button key={tag.id} onClick={() => toggleLifestyle(tag.id)}
                      className={`px-4 py-2 rounded-full text-[10px] font-black transition ${lifestyle.includes(tag.id) ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/20' : 'bg-slate-700 text-slate-400'}`}>
                      {tag.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* ペット */}
              <button 
                onClick={() => setHasPet(!hasPet)}
                className={`w-full p-4 rounded-xl flex justify-between items-center transition border-2 ${hasPet ? 'bg-amber-500/10 border-amber-500/50' : 'bg-slate-700 border-transparent'}`}
              >
                <span className="text-xs font-black">ペットを飼っていますか？</span>
                <span className="text-xl">{hasPet ? '🐕' : '🚫'}</span>
              </button>
            </div>

            {error && <p className="text-red-400 text-xs font-bold text-center">{error}</p>}

            <button 
              onClick={handleFinalSubmit}
              disabled={isSubmitting}
              className="w-full bg-blue-600 text-white py-6 rounded-[2rem] font-black text-lg shadow-xl shadow-blue-500/40 hover:bg-blue-500 transition-all active:scale-[0.97] disabled:opacity-50"
            >
              {isSubmitting ? '保存中...' : '設定を完了してはじめる'}
            </button>
          </div>
        )}

        <footer className="mt-10 text-[9px] text-slate-600 text-center font-bold uppercase tracking-[0.2em]">
          Posutto Digital Onboarding Protocol System
        </footer>
      </div>
    </div>
  );
}