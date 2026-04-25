'use client';

import { useEffect, useState } from 'react';
import { supabase } from '../../../lib/supabase';
import { useRouter } from 'next/navigation';

export default function ResidentSetup() {
  const router = useRouter();
  const [properties, setProperties] = useState<any[]>([]);
  const [selectedProperty, setSelectedProperty] = useState('');
  const [roomNumber, setRoomNumber] = useState('');
  
  // デモグラフィック・フルセット
  const [ageGroup, setAgeGroup] = useState('');
  const [gender, setGender] = useState('');
  const [occupation, setOccupation] = useState('');
  const [familySize, setFamilySize] = useState(''); // 世帯人数
  const [hasPet, setHasPet] = useState<boolean | null>(null);

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
    // 全項目バリデーション
    if (!selectedProperty || !roomNumber || !ageGroup || !gender || !occupation || !familySize || hasPet === null) {
      alert('未入力の項目があります。すべての情報を入力してください。');
      return;
    }

    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // profilesテーブルを更新
      const { error } = await supabase
        .from('profiles')
        .update({
          property_id: selectedProperty,
          room_number: roomNumber,
          age_group: ageGroup,
          gender: gender,
          occupation: occupation,
          family_size: familySize, // 世帯人数保存
          has_pet: hasPet
        })
        .eq('id', user.id);

      if (error) throw error;

      alert('登録が完了しました！');
      window.location.href = '/resident/dashboard'; 
    } catch (err) {
      console.error(err);
      alert('保存に失敗しました。DBのカラム名を確認してください。');
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
      
      <div className="mb-10 text-center">
        <h1 className="text-4xl font-black tracking-tighter italic text-slate-900 mb-2">Final Step.</h1>
        <p className="text-[10px] font-black text-blue-600 uppercase tracking-[0.3em]">入居情報の最終確認</p>
      </div>

      <div className="space-y-10">
        
        {/* 基本情報 */}
        <section className="space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-4 h-1 bg-slate-900 rounded-full"></div>
            <h2 className="text-[11px] font-black uppercase tracking-widest text-slate-900">Address Info</h2>
          </div>
          <div className="grid grid-cols-1 gap-4">
            <select 
              value={selectedProperty}
              onChange={(e) => setSelectedProperty(e.target.value)}
              className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-4 font-bold text-slate-900 focus:border-slate-900 outline-none"
            >
              <option value="">物件を選択</option>
              {properties.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
            <input 
              type="text" placeholder="部屋番号 (例: 101)" value={roomNumber}
              onChange={(e) => setRoomNumber(e.target.value)}
              className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-4 font-bold text-slate-900 focus:border-slate-900 outline-none"
            />
          </div>
        </section>

        {/* 属性情報 */}
        <section className="space-y-6">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-4 h-1 bg-slate-900 rounded-full"></div>
            <h2 className="text-[11px] font-black uppercase tracking-widest text-slate-900">Demographics</h2>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <select value={ageGroup} onChange={(e) => setAgeGroup(e.target.value)} className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-4 font-bold text-xs">
              <option value="">年代</option>
              {['10代', '20代', '30代', '40代', '50代', '60代以上'].map(a => <option key={a} value={a}>{a}</option>)}
            </select>
            <select value={gender} onChange={(e) => setGender(e.target.value)} className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-4 font-bold text-xs">
              <option value="">性別</option>
              {['男性', '女性', '回答なし'].map(g => <option key={g} value={g}>{g}</option>)}
            </select>
          </div>

          {/* 職業選択 */}
          <select value={occupation} onChange={(e) => setOccupation(e.target.value)} className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-4 font-bold text-sm">
            <option value="">職業を選択</option>
            {['会社員', '公務員', '自営業', '専業主婦・主夫', '学生', 'パート・アルバイト', 'その他'].map(o => <option key={o} value={o}>{o}</option>)}
          </select>

          {/* 世帯人数選択 */}
          <section className="space-y-3">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Household Size / 世帯人数</label>
            <div className="grid grid-cols-4 gap-2">
              {['1人', '2人', '3人', '4人以上'].map((s) => (
                <button
                  key={s} onClick={() => setFamilySize(s)}
                  className={`py-3 rounded-xl font-bold text-[11px] transition-all border-2 
                    ${familySize === s ? 'bg-slate-900 text-white border-slate-900 shadow-md' : 'bg-slate-50 text-slate-400 border-slate-50'}`}
                >
                  {s}
                </button>
              ))}
            </div>
          </section>

          {/* ペットの有無 */}
          <section className="space-y-3">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Pet / ペット</label>
            <div className="flex gap-4">
              {[ {label: 'あり', value: true, emoji: '🐶'}, {label: 'なし', value: false, emoji: '🏠'} ].map((item) => (
                <button
                  key={item.label} onClick={() => setHasPet(item.value)}
                  className={`flex-1 p-4 rounded-2xl font-bold text-xs transition-all border-2 flex items-center justify-center gap-2
                    ${hasPet === item.value ? 'bg-slate-900 text-white border-slate-900' : 'bg-slate-50 text-slate-400 border-slate-100'}`}
                >
                  <span>{item.emoji}</span> {item.label}
                </button>
              ))}
            </div>
          </section>
        </section>

        {/* 保存ボタン */}
        <div className="pt-6">
          <button 
            onClick={handleSave} disabled={saving}
            className={`w-full bg-slate-900 text-white font-black py-6 rounded-[2rem] shadow-2xl active:scale-95 transition-all 
              ${saving ? 'opacity-50' : 'hover:bg-blue-600'}`}
          >
            {saving ? 'SAVING...' : 'Posuttoをはじめる'}
          </button>
        </div>
      </div>
    </div>
  );
}