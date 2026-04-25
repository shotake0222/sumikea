'use client';

import { useEffect, useState } from 'react';
import { supabase } from '../../../lib/supabase';
import { useRouter } from 'next/navigation';

export default function ResidentSetup() {
  const router = useRouter();
  const [properties, setProperties] = useState<any[]>([]);
  const [selectedProperty, setSelectedProperty] = useState('');
  const [roomNumber, setRoomNumber] = useState('');
  
  // 完全版デモグラフィック・ステート
  const [ageGroup, setAgeGroup] = useState('');
  const [gender, setGender] = useState('');
  const [occupation, setOccupation] = useState(''); // 職業
  const [hasPet, setHasPet] = useState<boolean | null>(null); // ペットの有無

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const initSetup = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          router.push('/login?type=user');
          return;
        }

        const { data: propData } = await supabase
          .from('properties')
          .select('id, name');
        
        setProperties(propData || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    initSetup();
  }, [router]);

  const handleSave = async () => {
    // 全項目入力チェック
    if (!selectedProperty || !roomNumber || !ageGroup || !gender || !occupation || hasPet === null) {
      alert('すべての項目を入力してください（ペットの有無も含む）');
      return;
    }

    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // profilesテーブルを更新（完全デモグラ情報）
      const { error } = await supabase
        .from('profiles')
        .update({
          property_id: selectedProperty,
          room_number: roomNumber,
          age_group: ageGroup,
          gender: gender,
          occupation: occupation,
          has_pet: hasPet
        })
        .eq('id', user.id);

      if (error) throw error;

      alert('セットアップが完了しました！');
      window.location.href = '/resident/dashboard'; 
    } catch (err) {
      console.error(err);
      alert('保存に失敗しました。DBのカラム名（occupation, has_pet 等）を確認してください。');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC]">
      <div className="w-10 h-10 border-4 border-slate-900 border-t-blue-500 rounded-full animate-spin"></div>
    </div>
  );

  return (
    <div className="max-w-md mx-auto bg-white min-h-screen p-8 pt-16 font-sans overflow-x-hidden pb-24">
      
      {/* ヘッダー */}
      <div className="mb-10 text-center">
        <h1 className="text-4xl font-black tracking-tighter italic text-slate-900 mb-2">Setup.</h1>
        <p className="text-[10px] font-black text-blue-600 uppercase tracking-[0.3em]">居住者情報の登録</p>
      </div>

      <div className="space-y-10">
        
        {/* 物件・部屋 */}
        <div className="space-y-6">
          <section className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Property</label>
            <select 
              value={selectedProperty}
              onChange={(e) => setSelectedProperty(e.target.value)}
              className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-4 font-bold text-slate-900 focus:border-slate-900 outline-none appearance-none"
            >
              <option value="">物件を選択</option>
              {properties.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </section>

          <section className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Room Number</label>
            <input 
              type="text" placeholder="部屋番号 (例: 101)" value={roomNumber}
              onChange={(e) => setRoomNumber(e.target.value)}
              className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-4 font-bold text-slate-900 focus:border-slate-900 outline-none"
            />
          </section>
        </div>

        <hr className="border-slate-100" />

        {/* 属性セクション */}
        <div className="space-y-8">
          {/* 年代・性別 */}
          <div className="grid grid-cols-2 gap-4">
            <section className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Age Group</label>
              <select value={ageGroup} onChange={(e) => setAgeGroup(e.target.value)} className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-4 font-bold text-xs">
                <option value="">年代</option>
                {['10代', '20代', '30代', '40代', '50代', '60代以上'].map(a => <option key={a} value={a}>{a}</option>)}
              </select>
            </section>
            <section className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Gender</label>
              <select value={gender} onChange={(e) => setGender(e.target.value)} className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-4 font-bold text-xs">
                <option value="">性別</option>
                {['男性', '女性', '回答なし'].map(g => <option key={g} value={g}>{g}</option>)}
              </select>
            </section>
          </div>

          {/* 職業 */}
          <section className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Occupation / 職業</label>
            <select 
              value={occupation} onChange={(e) => setOccupation(e.target.value)}
              className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-4 font-bold text-slate-900 focus:border-slate-900 outline-none"
            >
              <option value="">選択してください</option>
              {['会社員', '公務員', '自営業・自由業', '専業主婦・主夫', '学生', 'パート・アルバイト', 'その他'].map(o => <option key={o} value={o}>{o}</option>)}
            </select>
          </section>

          {/* ペットの有無（トグルボタン風） */}
          <section className="space-y-3">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Do you have a pet? / ペットの有無</label>
            <div className="flex gap-4">
              {[ {label: '飼っている', value: true, emoji: '🐶'}, {label: '飼っていない', value: false, emoji: '🏠'} ].map((item) => (
                <button
                  key={item.label}
                  onClick={() => setHasPet(item.value)}
                  className={`flex-1 p-4 rounded-2xl font-bold text-sm transition-all border-2 flex flex-col items-center gap-1
                    ${hasPet === item.value ? 'bg-slate-900 text-white border-slate-900 shadow-lg' : 'bg-slate-50 text-slate-400 border-slate-100'}`}
                >
                  <span className="text-xl">{item.emoji}</span>
                  {item.label}
                </button>
              ))}
            </div>
          </section>
        </div>

        {/* 保存 */}
        <div className="pt-6">
          <button 
            onClick={handleSave} disabled={saving}
            className={`w-full bg-slate-900 text-white font-black py-6 rounded-[2rem] shadow-2xl active:scale-95 transition-all 
              ${saving ? 'opacity-50' : 'hover:bg-blue-600'}`}
          >
            {saving ? 'SAVING...' : 'この内容で開始する'}
          </button>
        </div>
      </div>
    </div>
  );
}