'use client';

import { useState, useEffect } from 'react';
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

  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  // ログインチェック
  useEffect(() => {
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login?type=resident');
        return;
      }
      setLoading(false);
    };
    checkUser();
  }, [router]);

  // ステップ1: 招待コードの照合
  const verifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');

    try {
      // invitation_codesテーブルから、入力されたコードかつ未使用のものを検索
      // propertiesテーブルを結合して物件名を取得
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
        .maybeSingle(); // .single()だと0件の時PGRST116エラーになるためmaybeSingleを使用

      if (fetchError) throw fetchError;

      if (!codeData || !codeData.properties) {
        setError('無効な招待コードか、既に使用されています。');
      } else {
        const prop = Array.isArray(codeData.properties) ? codeData.properties[0] : codeData.properties;
        setPropertyInfo({
          id: prop.id,
          name: prop.name,
          code_id: codeData.id
        });
        setStep(2);
      }
    } catch (err: any) {
      console.error(err);
      setError('認証中にエラーが発生しました。');
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleLifestyle = (tag: string) => {
    setLifestyle(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]);
  };

  // ステップ2: 最終保存
  const handleFinalSubmit = async () => {
    if (!propertyInfo) return;
    setIsSubmitting(true);
    setError('');
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('セッションが切れました。再ログインしてください。');

      // 1. プロフィールの更新（upsertを使用することで行がない場合のエラーを回避）
      const { error: updateError } = await supabase
        .from('profiles')
        .upsert({ 
          id: user.id,
          property_id: propertyInfo.id,
          role: 'RESIDENT',
          household_size: parseInt(householdSize),
          lifestyle_tags: lifestyle,
          has_pet: hasPet,
          primary_transport: transportation,
          is_setup_completed: true,
          setup_completed_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });

      if (updateError) throw updateError;

      // 2. 招待コードを使用済みにマーク
      const { error: codeError } = await supabase
        .from('invitation_codes')
        .update({ is_used: true })
        .eq('id', propertyInfo.code_id);
      
      if (codeError) console.error('招待コードの更新に失敗しましたが、プロフ作成は完了しました');

      // ダッシュボードへ
      window.location.href = '/resident/dashboard';
    } catch (err: any) {
      console.error(err);
      setError(err.message || '保存に失敗しました。');
      setIsSubmitting(false);
    }
  };

  if (loading) return (
    <div className="min-h-screen bg-[#0F172A] flex items-center justify-center">
      <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full"></div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#0F172A] flex items-center justify-center p-6 text-white font-sans">
      <div className="max-w-md w-full">
        
        {/* プログレスバー */}
        <div className="flex gap-2 mb-10">
          <div className={`h-1 flex-1 rounded-full transition-all duration-500 ${step >= 1 ? 'bg-blue-500' : 'bg-slate-700'}`} />
          <div className={`h-1 flex-1 rounded-full transition-all duration-500 ${step >= 2 ? 'bg-blue-500' : 'bg-slate-700'}`} />
        </div>

        {step === 1 ? (
          <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="text-center">
              <div className="w-20 h-20 bg-blue-600 rounded-3xl mx-auto mb-6 flex items-center justify-center shadow-2xl shadow-blue-500/20">
                <span className="text-3xl text-white">🔑</span>
              </div>
              <h1 className="text-3xl font-black tracking-tighter italic">ENTER CODE</h1>
              <p className="text-slate-400 text-sm mt-3 font-medium tracking-tight leading-relaxed">
                管理会社から配布された<br/>
                招待コードを入力してください
              </p>
            </div>

            <form onSubmit={verifyCode} className="space-y-6">
              <input 
                type="text"
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                placeholder="POS-XXXX"
                className="w-full bg-slate-800/50 border-2 border-slate-700 p-6 rounded-[2rem] text-center text-2xl font-black tracking-[0.1em] focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all uppercase placeholder:text-slate-600"
                required
              />
              {error && (
                <div className="bg-red-500/10 border border-red-500/20 py-3 rounded-xl">
                  <p className="text-red-400 text-xs font-bold text-center animate-pulse">{error}</p>
                </div>
              )}
              <button 
                type="submit"
                disabled={isSubmitting || !inviteCode}
                className="w-full bg-white text-slate-900 py-6 rounded-[2rem] font-black text-lg hover:bg-blue-500 hover:text-white transition-all active:scale-[0.97] shadow-xl shadow-white/5 disabled:opacity-50"
              >
                {isSubmitting ? '認証中...' : '次へ進む'}
              </button>
            </form>
          </div>
        ) : (
          <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-700">
            <header className="text-center">
              <div className="inline-block bg-blue-500/20 text-blue-400 text-[10px] font-black px-4 py-1 rounded-full uppercase tracking-widest mb-3 border border-blue-500/30">
                Success: {propertyInfo?.name}
              </div>
              <h1 className="text-3xl font-black tracking-tighter">暮らしの設定</h1>
              <p className="text-slate-400 text-xs mt-2">最適な情報を届けるために教えてください</p>
            </header>

            <div className="space-y-8 bg-slate-800/40 p-8 rounded-[2.5rem] border border-slate-700 shadow-inner">
              {/* 世帯人数 */}
              <div className="space-y-3">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">世帯人数</label>
                <div className="flex justify-between gap-2">
                  {['1', '2', '3', '4+'].map(num => (
                    <button key={num} type="button" onClick={() => setHouseholdSize(num)}
                      className={`flex-1 py-4 rounded-2xl font-black transition-all ${householdSize === num ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' : 'bg-slate-700/50 text-slate-500 hover:bg-slate-700'}`}>
                      {num}
                    </button>
                  ))}
                </div>
              </div>

              {/* 移動手段 */}
              <div className="space-y-3">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">主な移動手段</label>
                <div className="relative">
                  <select 
                    value={transportation} onChange={(e) => setTransportation(e.target.value)}
                    className="w-full bg-slate-700/50 p-5 rounded-2xl font-bold outline-none border-2 border-transparent focus:border-blue-500/50 text-sm text-white appearance-none cursor-pointer"
                  >
                    <option value="train">電車・バス</option>
                    <option value="car">自家用車</option>
                    <option value="bike">自転車・バイク</option>
                    <option value="walk">徒歩のみ</option>
                  </select>
                  <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500">▼</div>
                </div>
              </div>

              {/* ライフスタイル */}
              <div className="space-y-3">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">ライフスタイル</label>
                <div className="flex flex-wrap gap-2">
                  {[
                    {id: 'worker', label: '会社員'}, {id: 'remote', label: '在宅ワーク'}, 
                    {id: 'student', label: '学生'}, {id: 'family', label: '子育て中'},
                    {id: 'night', label: '夜型生活'}, {id: 'holiday_work', label: '土日祝も仕事'}
                  ].map(tag => (
                    <button key={tag.id} type="button" onClick={() => toggleLifestyle(tag.id)}
                      className={`px-5 py-3 rounded-xl text-[10px] font-black transition-all ${lifestyle.includes(tag.id) ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20' : 'bg-slate-700/50 text-slate-500'}`}>
                      {tag.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* ペット */}
              <button 
                type="button"
                onClick={() => setHasPet(!hasPet)}
                className={`w-full p-5 rounded-2xl flex justify-between items-center transition-all border-2 ${hasPet ? 'bg-amber-500/10 border-amber-500/50 text-amber-200' : 'bg-slate-700/50 border-transparent text-slate-500'}`}
              >
                <span className="text-xs font-black uppercase tracking-wider">ペットを飼っていますか？</span>
                <span className="text-2xl">{hasPet ? '🐕' : '🚫'}</span>
              </button>
            </div>

            {error && <p className="text-red-400 text-xs font-bold text-center">{error}</p>}

            <button 
              onClick={handleFinalSubmit}
              disabled={isSubmitting}
              className="w-full bg-blue-600 text-white py-6 rounded-[2rem] font-black text-lg shadow-xl shadow-blue-600/30 hover:bg-blue-500 transition-all active:scale-[0.97] disabled:opacity-50"
            >
              {isSubmitting ? '保存中...' : '設定を完了してはじめる'}
            </button>
          </div>
        )}

        <footer className="mt-12 text-[9px] text-slate-700 text-center font-bold uppercase tracking-[0.3em]">
          Posutto Digital Onboarding Protocol
        </footer>
      </div>
    </div>
  );
}