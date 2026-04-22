'use client';
import { useState } from 'react';
import { supabase } from '../lib/supabase';

export default function OnboardingModal({ userId, propertyId, onComplete }: any) {
  const [displayName, setDisplayName] = useState('');
  const [ageGroup, setAgeGroup] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    setLoading(true);
    const { error } = await supabase
      .from('profiles')
      .upsert({
        id: userId,
        display_name: displayName,
        age_group: ageGroup,
        property_id: propertyId,
        is_onboarded: true,
        updated_at: new Date()
      });

    if (error) {
      alert('エラーが発生しました');
    } else {
      onComplete();
    }
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
      <div className="bg-white rounded-[3rem] p-8 w-full max-w-md shadow-2xl">
        <h2 className="text-2xl font-black text-slate-800 mb-2">Welcome!</h2>
        <p className="text-sm text-slate-500 mb-6">より便利なサービス提供のため、あなたのことを少しだけ教えてください。</p>
        
        <div className="space-y-4">
          <div>
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">お名前（ニックネーム）</label>
            <input 
              className="w-full bg-slate-50 border-none p-4 rounded-2xl text-sm" 
              value={displayName} 
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="例：すみけあ太郎"
            />
          </div>

          <div>
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">年代</label>
            <select 
              className="w-full bg-slate-50 border-none p-4 rounded-2xl text-sm"
              value={ageGroup}
              onChange={(e) => setAgeGroup(e.target.value)}
            >
              <option value="">選択してください</option>
              <option value="20s">20代</option>
              <option value="30s">30代</option>
              <option value="40s">40代</option>
              <option value="50s+">50代以上</option>
            </select>
          </div>

          <button 
            onClick={handleSave}
            disabled={loading || !displayName}
            className="w-full bg-blue-600 text-white py-5 rounded-3xl font-black shadow-xl shadow-blue-200 transition active:scale-95"
          >
            {loading ? '登録中...' : '登録してはじめる'}
          </button>
        </div>
      </div>
    </div>
  );
}