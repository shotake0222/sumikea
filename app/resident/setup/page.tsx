'use client';

import { useEffect, useState } from 'react';
import { supabase } from '../../../lib/supabase';
import { useRouter } from 'next/navigation';

export default function ResidentSetup() {
  const router = useRouter();
  const [properties, setProperties] = useState<any[]>([]);
  const [selectedProperty, setSelectedProperty] = useState('');
  const [roomNumber, setRoomNumber] = useState('');
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

        // 物件リストを取得（デモグラ取得用）
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
    if (!selectedProperty || !roomNumber) {
      alert('物件と部屋番号を入力してください');
      return;
    }

    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // profilesテーブルを更新（デモグラ保存）
      const { error } = await supabase
        .from('profiles')
        .update({
          property_id: selectedProperty,
          room_number: roomNumber
        })
        .eq('id', user.id);

      if (error) throw error;

      alert('登録が完了しました！');
      router.push('/resident/dashboard'); // 保存完了後にマイページへ
    } catch (err) {
      console.error(err);
      alert('保存に失敗しました');
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
    <div className="max-w-md mx-auto bg-white min-h-screen p-8 pt-24 font-sans overflow-x-hidden">
      
      {/* ヘッダー */}
      <div className="mb-12">
        <div className="flex items-center gap-2 mb-2">
          <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
          <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Initial Setup</span>
        </div>
        <h1 className="text-4xl font-black tracking-tighter italic text-slate-900">
           Welcome.
        </h1>
        <p className="mt-2 text-sm font-bold text-slate-500 leading-relaxed">
          居住を開始するために、<br />マンションと部屋番号を教えてください。
        </p>
      </div>

      <div className="space-y-8">
        
        {/* 物件選択 */}
        <section className="space-y-3">
          <label className="text-[10px] font-black text-blue-600 uppercase tracking-widest ml-1">
            Property / 物件
          </label>
          <div className="relative">
            <select 
              value={selectedProperty}
              onChange={(e) => setSelectedProperty(e.target.value)}
              className="w-full bg-slate-50 border-2 border-slate-100 rounded-[1.5rem] p-5 font-bold text-slate-900 focus:border-blue-500 outline-none transition-all appearance-none"
            >
              <option value="">物件を選択してください</option>
              {properties.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
            <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 font-bold">
              ▼
            </div>
          </div>
        </section>

        {/* 部屋番号入力 */}
        <section className="space-y-3">
          <label className="text-[10px] font-black text-blue-600 uppercase tracking-widest ml-1">
            Room Number / 部屋番号
          </label>
          <input 
            type="text" 
            placeholder="例: 101"
            value={roomNumber}
            onChange={(e) => setRoomNumber(e.target.value)}
            className="w-full bg-slate-50 border-2 border-slate-100 rounded-[1.5rem] p-5 font-bold text-slate-900 focus:border-blue-500 outline-none transition-all"
          />
        </section>

        {/* 保存ボタン */}
        <div className="pt-4">
          <button 
            onClick={handleSave}
            disabled={saving}
            className={`w-full bg-slate-900 text-white font-black py-6 rounded-[2.5rem] shadow-2xl shadow-slate-200 active:scale-95 transition-all 
              ${saving ? 'opacity-50 cursor-not-allowed' : 'hover:bg-slate-800'}`}
          >
            {saving ? 'SAVING...' : '利用を開始する'}
          </button>
        </div>

      </div>

      <footer className="mt-20 text-[9px] text-slate-300 text-center font-bold uppercase tracking-[0.4em]">
        Posutto Onboarding v1.5
      </footer>
    </div>
  );
}