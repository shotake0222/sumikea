'use client';

import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import { useRouter } from 'next/navigation';

export default function ResidentSetupPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  
  const [inviteCode, setInviteCode] = useState('');
  const [propertyInfo, setPropertyInfo] = useState<{id: string, name: string, code_id?: string, is_fixed_code: boolean} | null>(null);
  
  const [householdSize, setHouseholdSize] = useState('1');
  const [lifestyle, setLifestyle] = useState<string[]>([]);
  const [hasPet, setHasPet] = useState(false);
  const [transportation, setTransportation] = useState('train');

  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

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

  // ステップ1: 招待コードの照合（物件共通コードと個別コードの両方に対応）
  const verifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');

    // 入力値をクリーンアップ（空白削除、全角英数→半角、大文字化）
    const cleanCode = inviteCode.trim().toUpperCase().replace(/[Ａ-Ｚａ-ｚ０-９]/g, (s) => {
      return String.fromCharCode(s.charCodeAt(0) - 0xFEE0);
    });

    try {
      // 1. まず物件共通コード（properties.join_code）をチェック
      const { data: propData, error: propError } = await supabase
        .from('properties')
        .select('id, name')
        .eq('join_code', cleanCode)
        .maybeSingle();

      if (propData) {
        setPropertyInfo({
          id: propData.id,
          name: propData.name,
          is_fixed_code: true // 物件共通コードなので使用済み処理は不要
        });
        setStep(2);
        setIsSubmitting(false);
        return;
      }

      // 2. 共通コードで見つからない場合、個別招待コード（invitation_codes）をチェック
      const { data: inviteData, error: inviteError } = await supabase
        .from('invitation_codes')
        .select(`
          id,
          property_id,
          is_used,
          properties ( id, name )
        `)
        .eq('code', cleanCode)
        .eq('is_used', false)
        .maybeSingle();

      if (inviteData && inviteData.properties) {
        const prop = Array.isArray(inviteData.properties) ? inviteData.properties[0] : inviteData.properties;
        setPropertyInfo({
          id: prop.id,
          name: prop.name,
          code_id: inviteData.id,
          is_fixed_code: false // 個別コードなので後で使用済み処理が必要
        });
        setStep(2);
      } else {
        setError('無効な招待コードか、既に使用されています。');
      }

    } catch (err: any) {
      console.error(err);
      setError('サーバーとの通信に失敗しました。');
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleLifestyle = (tag: string) => {
    setLifestyle(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]);
  };

  const handleFinalSubmit = async () => {
    if (!propertyInfo) return;
    setIsSubmitting(true);
    setError('');
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('セッションが切れました。');

      // 1. プロフィールの作成/更新
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

      // 2. 個別招待コードの場合のみ、使用済みにマーク
      if (!propertyInfo.is_fixed_code && propertyInfo.code_id) {
        await supabase
          .from('invitation_codes')
          .update({ is_used: true })
          .eq('id', propertyInfo.code_id);
      }

      // 完了後、ダッシュボードへ遷移
      router.push('/resident/dashboard');
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
        
        {/* PROGRESS */}
        <div className="flex gap-2 mb-10">
          <div className={`h-1 flex-1 rounded-full transition-all duration-500 ${step >= 1 ? 'bg-blue-500' : 'bg-slate-700'}`} />
          <div className={`h-1 flex-1 rounded-full transition-all duration-500 ${step >= 2 ? 'bg-blue-500' : 'bg-slate-700'}`} />
        </div>

        {step === 1 ? (
          <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="text-center">
              <div className="w-20 h-20 bg-blue-600 rounded-[2rem] mx-auto mb-6 flex items-center justify-center shadow-2xl shadow-blue-500/20">
                <span className="text-3xl">🔑</span>
              </div>
              <h1 className="text-3xl font-black tracking-tighter italic uppercase">Resident Setup</h1>
              <p className="text-slate-400 text-sm mt-3 font-medium leading-relaxed italic">
                招待コードを入力して<br/>物件と連携してください
              </p>
            </div>

            <form onSubmit={verifyCode} className="space-y-6">
              <div className="relative group">
                <input 
                  type="text"
                  value={inviteCode}
                  onChange={(e) => setInviteCode(e.target.value)}
                  placeholder="EX: POS-1234"
                  className="w-full bg-slate-800/50 border-2 border-slate-700 p-6 rounded-[2rem] text-center text-2xl font-black tracking-[0.2em] focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all uppercase placeholder:text-slate-700"
                  required
                />
              </div>
              {error && (
                <div className="bg-red-500/10 border border-red-500/20 py-4 rounded-[1.5rem]">
                  <p className="text-red-400 text-[10px] font-black text-center uppercase tracking-widest animate-pulse">{error}</p>
                </div>
              )}
              <button 
                type="submit"
                disabled={isSubmitting || !inviteCode}
                className="w-full bg-white text-slate-900 py-6 rounded-[2rem] font-black text-lg hover:bg-blue-600 hover:text-white transition-all active:scale-[0.97] shadow-xl shadow-white/5 disabled:opacity-50"
              >
                {isSubmitting ? 'Verifying...' : 'Next Step →'}
              </button>
            </form>
          </div>
        ) : (
          <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-700">
            <header className="text-center">
              <div className="inline-block bg-blue-500/20 text-blue-400 text-[10px] font-black px-4 py-1.5 rounded-full uppercase tracking-[0.2em] mb-4 border border-blue-500/30">
                Property: {propertyInfo?.name}
              </div>
              <h1 className="text-3xl font-black tracking-tighter italic uppercase leading-none">Your Lifestyle</h1>
              <p className="text-slate-500 text-[10px] font-bold mt-2 uppercase tracking-widest">最適な情報を届けるために教えてください</p>
            </header>

            <div className="space-y-8 bg-slate-800/30 p-8 rounded-[3rem] border border-slate-700/50">
              {/* 世帯人数 */}
              <div className="space-y-4">
                <label className="text-[9px] font-black text-slate-500 uppercase tracking-[0.3em] ml-2">Household Size</label>
                <div className="flex justify-between gap-3">
                  {['1', '2', '3', '4+'].map(num => (
                    <button key={num} type="button" onClick={() => setHouseholdSize(num)}
                      className={`flex-1 py-4 rounded-2xl font-black transition-all ${householdSize === num ? 'bg-blue-600 text-white shadow-lg' : 'bg-slate-700/50 text-slate-500'}`}>
                      {num}
                    </button>
                  ))}
                </div>
              </div>

              {/* 移動手段 */}
              <div className="space-y-4">
                <label className="text-[9px] font-black text-slate-500 uppercase tracking-[0.3em] ml-2">Main Transportation</label>
                <select 
                  value={transportation} onChange={(e) => setTransportation(e.target.value)}
                  className="w-full bg-slate-700/50 p-5 rounded-2xl font-bold outline-none border-2 border-transparent focus:border-blue-500/50 text-sm text-white appearance-none cursor-pointer"
                >
                  <option value="train">🚃 電車・バス</option>
                  <option value="car">🚗 自家用車</option>
                  <option value="bike">🚲 自転車・バイク</option>
                  <option value="walk">🏃 徒歩のみ</option>
                </select>
              </div>

              {/* ライフスタイル */}
              <div className="space-y-4">
                <label className="text-[9px] font-black text-slate-500 uppercase tracking-[0.3em] ml-2">Personal Tags</label>
                <div className="flex flex-wrap gap-2">
                  {[
                    {id: 'worker', label: '会社員'}, {id: 'remote', label: 'リモート'}, 
                    {id: 'student', label: '学生'}, {id: 'family', label: '子育て'},
                    {id: 'night', label: '夜型'}, {id: 'holiday_work', label: '平日休み'}
                  ].map(tag => (
                    <button key={tag.id} type="button" onClick={() => toggleLifestyle(tag.id)}
                      className={`px-5 py-3 rounded-xl text-[10px] font-black transition-all ${lifestyle.includes(tag.id) ? 'bg-indigo-600 text-white' : 'bg-slate-700/50 text-slate-500'}`}>
                      {tag.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* ペット */}
              <button 
                type="button"
                onClick={() => setHasPet(!hasPet)}
                className={`w-full p-5 rounded-2xl flex justify-between items-center transition-all border-2 ${hasPet ? 'bg-amber-500/10 border-amber-500/50 text-amber-200' : 'bg-slate-700/30 border-transparent text-slate-500'}`}
              >
                <span className="text-[10px] font-black uppercase tracking-widest">ペット同居</span>
                <span className="text-xl">{hasPet ? '🐕 Yes' : '🚫 No'}</span>
              </button>
            </div>

            {error && <p className="text-red-400 text-[10px] font-black text-center uppercase tracking-widest italic">{error}</p>}

            <button 
              onClick={handleFinalSubmit}
              disabled={isSubmitting}
              className="w-full bg-blue-600 text-white py-7 rounded-[2.5rem] font-black text-xl italic shadow-2xl shadow-blue-900/40 hover:bg-blue-500 transition-all active:scale-[0.98] disabled:opacity-50"
            >
              {isSubmitting ? 'Saving...' : 'Complete Setup →'}
            </button>
          </div>
        )}

        <footer className="mt-16 text-[9px] text-slate-800 text-center font-bold uppercase tracking-[0.4em]">
          Posutto Digital Protocol v2.4
        </footer>
      </div>
    </div>
  );
}