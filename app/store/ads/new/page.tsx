'use client';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import AdminLayout from '@/components/AdminLayout';

export default function StoreAdCreatePage() {
  const [radius, setRadius] = useState(1000); // デフォルト1km
  const [targetProperties, setTargetProperties] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // --- 追加された状態管理 ---
  const [scheduleType, setScheduleType] = useState<'SPECIFIC_DATE' | 'GARBAGE_DAY'>('SPECIFIC_DATE');
  const [selectedGarbageTypes, setSelectedGarbageTypes] = useState<string[]>([]);
  const [scheduledDate, setScheduledDate] = useState('');

  // 半径が変わるたびに、対象となる物件と世帯数をプレビュー計算
  useEffect(() => {
    fetchTargetPreview();
  }, [radius]);

  const fetchTargetPreview = async () => {
    setLoading(true);
    const { data } = await supabase.rpc('get_properties_in_radius', {
      store_id: 'CURRENT_STORE_ID', 
      radius_meters: radius
    });
    
    setTargetProperties(data || []);
    setLoading(false);
  };

  // ゴミ出しタイプ選択のトグル処理
  const toggleGarbageType = (type: string) => {
    setSelectedGarbageTypes(prev => 
      prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]
    );
  };

  return (
    <AdminLayout userType="STORE">
      <div className="max-w-4xl mx-auto space-y-8">
        <header>
          <h1 className="text-3xl font-black text-slate-800 tracking-tighter">新規広告配信設定</h1>
          <p className="text-slate-500 text-sm">店舗周辺の住民にダイレクトにアプローチします。</p>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* 左側：設定フォーム */}
          <div className="space-y-6">
            {/* 既存の半径設定カード */}
            <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-4">配信エリア（半径）</label>
              <input 
                type="range" min="100" max="3000" step="100"
                value={radius}
                onChange={(e) => setRadius(Number(e.target.value))}
                className="w-full h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-blue-600"
              />
              <div className="flex justify-between mt-2 font-mono text-xs font-bold text-blue-600">
                <span>100m</span>
                <span className="text-lg">{(radius / 1000).toFixed(1)} km</span>
                <span>3.0km</span>
              </div>
            </div>

            {/* 追加：スケジュール設定カード */}
            <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100 space-y-6">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">配信スケジュール</label>
              
              <div className="flex gap-2 p-1 bg-slate-50 rounded-2xl">
                <button 
                  onClick={() => setScheduleType('SPECIFIC_DATE')}
                  className={`flex-1 py-3 rounded-xl text-[10px] font-bold transition ${scheduleType === 'SPECIFIC_DATE' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-400'}`}
                >
                  日付指定
                </button>
                <button 
                  onClick={() => setScheduleType('GARBAGE_DAY')}
                  className={`flex-1 py-3 rounded-xl text-[10px] font-bold transition ${scheduleType === 'GARBAGE_DAY' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-400'}`}
                >
                  ゴミ出し日に連動
                </button>
              </div>

              {scheduleType === 'GARBAGE_DAY' ? (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-2">
                    {['可燃ゴミ', '不燃ゴミ', '資源ゴミ', 'ペットボトル'].map((type) => (
                      <button
                        key={type}
                        onClick={() => toggleGarbageType(type)}
                        className={`flex items-center gap-3 p-4 border rounded-2xl transition text-left ${selectedGarbageTypes.includes(type) ? 'border-blue-600 bg-blue-50/50' : 'border-slate-100 hover:bg-slate-50'}`}
                      >
                        <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${selectedGarbageTypes.includes(type) ? 'bg-blue-600 border-blue-600' : 'bg-white border-slate-300'}`}>
                          {selectedGarbageTypes.includes(type) && <div className="w-1.5 h-1.5 bg-white rounded-full" />}
                        </div>
                        <span className="text-xs font-bold text-slate-700">{type}</span>
                      </button>
                    ))}
                  </div>
                  <p className="text-[9px] text-blue-500 bg-blue-50 p-4 rounded-2xl leading-relaxed font-bold">
                    💡 住民が朝のゴミ出し報告を行うタイミングで、アプリのトップにあなたの広告が優先表示されます。
                  </p>
                </div>
              ) : (
                <input 
                  type="date" 
                  value={scheduledDate}
                  onChange={(e) => setScheduledDate(e.target.value)}
                  className="w-full bg-slate-50 border-none p-4 rounded-2xl text-sm font-bold text-slate-700 focus:ring-2 focus:ring-blue-600 outline-none"
                />
              )}
            </div>

            <div className="pt-2">
              <button className="w-full bg-blue-600 text-white py-5 rounded-[2rem] font-black shadow-xl shadow-blue-100 hover:bg-blue-700 transition active:scale-[0.98]">
                この内容で配信予約を確定
              </button>
            </div>
          </div>

          {/* 右側：配信対象プレビュー（既存のまま） */}
          <div className="bg-slate-900 rounded-[2.5rem] p-8 text-white space-y-6 relative overflow-hidden h-fit sticky top-8">
            <div className="relative z-10">
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Target Insights</p>
              <h3 className="text-xl font-bold mb-6">配信対象の推計</h3>
              
              <div className="space-y-4">
                <div className="flex justify-between items-end border-b border-slate-800 pb-4">
                  <span className="text-slate-400 text-sm">対象物件数</span>
                  <span className="text-3xl font-black">{loading ? '...' : targetProperties.length} <small className="text-xs font-normal">棟</small></span>
                </div>
                <div className="flex justify-between items-end border-b border-slate-800 pb-4">
                  <span className="text-slate-400 text-sm">推定リーチ世帯数</span>
                  <span className="text-3xl font-black text-blue-400">
                    {loading ? '...' : (targetProperties.length * 40).toLocaleString()} <small className="text-xs font-normal text-white">世帯</small>
                  </span>
                </div>
              </div>

              <div className="mt-8 p-4 bg-slate-800 rounded-2xl">
                <p className="text-[10px] font-bold text-slate-500 mb-2 italic">Target Property List</p>
                <ul className="text-[10px] space-y-1 text-slate-300">
                  {targetProperties.slice(0, 5).map(p => (
                    <li key={p.uuid}>• {p.name}</li>
                  ))}
                  {targetProperties.length > 5 && <li>ほか {targetProperties.length - 5} 件の物件</li>}
                </ul>
              </div>
            </div>
            <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-blue-600/20 rounded-full blur-3xl"></div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}