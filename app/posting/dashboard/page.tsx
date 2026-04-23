'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../../lib/supabase';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { adSchema } from '../../../lib/validations';

export default function PostingDigitalDashboard() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [targetProperties, setTargetProperties] = useState<any[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 配信フォーム用の設定（Zod連携）
  const { register, handleSubmit, formState: { errors }, reset } = useForm({
    resolver: zodResolver(adSchema)
  });

  useEffect(() => {
    const initialize = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      
      // ✅ 修正：roleの大文字変換で判定ミスを防止
      const role = user?.user_metadata?.role?.toUpperCase();
      
      // ✅ 修正：ADMIN または POSTING ロール以外はログインへ
      const isAuthorized = role === 'ADMIN' || role === 'POSTING';

      if (!user || !isAuthorized) {
        router.push('/login?type=posting');
        return;
      }

      let props = [];

      if (role === 'ADMIN') {
        // ✅ 修正：管理者の場合は全物件を取得し、データ構造をPOSTING用(propertiesネスト)に合わせる
        const { data: allProps } = await supabase
          .from('properties')
          .select('id, name, address');
        
        if (allProps) {
          props = allProps.map(p => ({
            property_id: p.id,
            properties: { name: p.name, address: p.address }
          }));
        }
      } else {
        // ポスティング会社（POSTING）の場合は担当物件のみ取得
        const { data: managerProps } = await supabase
          .from('property_managers')
          .select('property_id, properties(name, address)')
          .eq('user_id', user.id);
        
        if (managerProps) props = managerProps;
      }
      
      setTargetProperties(props || []);
      setLoading(false);
    };
    initialize();
  }, [router]);

  const onSendAd = async (data: any) => {
    setIsSubmitting(true);
    const { error } = await supabase.from('digital_flyers').insert({
      property_id: data.property_id,
      title: data.title,
      content: data.content,
      status: 'published' // 即時配信
    });

    if (error) {
      alert('送信エラー: ' + error.message);
    } else {
      alert('デジタル投函が完了しました！住民の端末に反映されます。');
      reset();
    }
    setIsSubmitting(false);
  };

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen bg-slate-50">
      <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8" style={{ lineHeight: '1.25' }}>
      <div className="max-w-6xl mx-auto">
        <header className="mb-10 flex justify-between items-end">
          <div>
            <span className="text-[10px] font-black bg-indigo-600 text-white px-3 py-1 rounded-full uppercase tracking-widest">
              Digital Dispatcher
            </span>
            <h1 className="text-3xl font-black text-slate-800 mt-2 tracking-tighter">デジタル投函コンソール</h1>
            <p className="text-slate-500 text-sm mt-1">
              物理的な配布なしで、担当物件の全住民へダイレクトに情報を送信します。
            </p>
          </div>
          <div className="hidden md:block bg-white px-8 py-4 rounded-[2rem] shadow-sm border border-slate-200 text-right">
            <p className="text-[10px] font-black text-slate-400 uppercase">配信可能ポータル</p>
            <p className="text-3xl font-black text-indigo-600">{targetProperties.length} <span className="text-sm">物件</span></p>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <form onSubmit={handleSubmit(onSendAd)} className="bg-white rounded-[3rem] p-8 md:p-12 shadow-xl border border-slate-200 space-y-6">
              <h2 className="text-xl font-black text-slate-800 mb-6 flex items-center gap-2">
                <span className="text-2xl">⚡️</span> 即時投函エディタ
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase ml-1">宛先物件</label>
                  <select 
                    {...register('property_id')}
                    className="w-full bg-slate-50 border-none p-4 rounded-2xl font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500"
                    defaultValue=""
                  >
                    <option value="" disabled>物件を選択してください</option>
                    {targetProperties.map((p: any, index: number) => (
                      <option key={p.property_id || index} value={p.property_id}>{p.properties?.name}</option>
                    ))}
                  </select>
                  {errors.property_id && <p className="text-red-500 text-[10px] font-bold mt-1">物件を選択してください</p>}
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase ml-1">広告・案内タイトル</label>
                  <input 
                    {...register('title')}
                    placeholder="例：駅前カフェ 住民限定クーポン"
                    className="w-full bg-slate-50 border-none p-4 rounded-2xl font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  {errors.title && <p className="text-red-500 text-[10px] font-bold mt-1">{errors.title.message as string}</p>}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase ml-1">配信内容</label>
                <textarea 
                  {...register('content')}
                  placeholder="住民がメリットを感じる内容を入力してください..."
                  className="w-full bg-slate-50 border-none p-4 rounded-3xl h-40 font-medium text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                />
                {errors.content && <p className="text-red-500 text-[10px] font-bold mt-1">{errors.content.message as string}</p>}
              </div>

              <button 
                disabled={isSubmitting}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-5 rounded-3xl font-black shadow-lg shadow-indigo-200 transition active:scale-[0.98] disabled:opacity-50"
              >
                {isSubmitting ? 'データを送信中...' : 'デジタル投函を実行する'}
              </button>
            </form>
          </div>

          <div className="space-y-6">
            <div className="bg-slate-900 rounded-[3rem] p-8 text-white shadow-2xl relative overflow-hidden">
              <h3 className="text-[10px] font-black opacity-40 uppercase tracking-[0.2em] mb-8">Digital Reach Insight</h3>
              <div className="space-y-6 relative z-10">
                <div>
                  <p className="text-xs font-bold opacity-60">本日の総投函数</p>
                  <p className="text-4xl font-black">2,840 <span className="text-xs font-normal">端末</span></p>
                </div>
                <div>
                  <p className="text-xs font-bold opacity-60">開封率 (平均)</p>
                  <p className="text-4xl font-black text-indigo-400">42.8 <span className="text-xs font-normal">%</span></p>
                </div>
              </div>
              <div className="absolute -right-6 -bottom-6 text-9xl font-black opacity-5 italic">DATA</div>
            </div>

            <div className="bg-white rounded-[2.5rem] p-6 border border-slate-200 shadow-sm">
              <h4 className="text-[10px] font-black text-slate-400 uppercase mb-4 tracking-widest">Digital Posting Flow</h4>
              <ul className="space-y-4">
                {[
                  { n: '01', t: '店舗から依頼を受理', c: 'デジタルデータの入稿を確認' },
                  { n: '02', t: '物件セグメント', c: '属性に合ったマンションを選択' },
                  { n: '03', t: '一斉配信', c: '「送信」ボタンで投函完了' },
                ].map((item) => (
                  <li key={item.n} className="flex gap-4">
                    <span className="text-indigo-600 font-black text-sm">{item.n}</span>
                    <div>
                      <p className="text-[11px] font-black text-slate-800 leading-tight">{item.t}</p>
                      <p className="text-[10px] text-slate-400 font-bold">{item.c}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}