'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../lib/supabase';
import { adSchema } from '../lib/validations';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

export default function ManagementNoticePage() {
  const router = useRouter();
  const [managedProperties, setManagedProperties] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { register, handleSubmit, setValue, formState: { errors }, reset } = useForm({
    resolver: zodResolver(adSchema),
    defaultValues: {
      category: 'urgent',
      title: '',
      content: '',
      property_id: ''
    }
  });

  useEffect(() => {
    const fetchAuthAndData = async () => {
      // 1. セッションチェック
      const { data: { session } } = await supabase.auth.getSession();
      const user = session?.user;
      
      if (!user) {
        router.push('/login?type=manager');
        return;
      }

      const role = user.user_metadata?.role;
      
      // ADMINまたはMANAGER以外を弾く
      if (role !== 'MANAGER' && role !== 'ADMIN') {
        router.push('/login?type=manager');
        return;
      }
      
      // 2. 物件データの取得
      const { data, error } = await supabase
        .from('property_managers')
        .select('property_id, properties(name)')
        .eq('user_id', user.id);
      
      if (data && data.length > 0) {
        setManagedProperties(data);
        setValue('property_id', data[0].property_id);
      } else {
        // デバッグ用：物件に紐付いていないADMINの場合、全物件から1つ仮に持ってくる
        if (role === 'ADMIN') {
          const { data: allProps } = await supabase.from('properties').select('id, name').limit(1);
          if (allProps && allProps.length > 0) {
            const mockData = [{ property_id: allProps[0].id, properties: { name: allProps[0].name } }];
            setManagedProperties(mockData);
            setValue('property_id', allProps[0].id);
          }
        }
      }
      setLoading(false);
    };
    fetchAuthAndData();
  }, [router, setValue]);

  const onSubmit = async (values: any) => {
    setIsSubmitting(true);
    const { error } = await supabase.from('property_notifications').insert({
      property_id: values.property_id,
      title: values.title,
      content: values.content,
      category: values.category,
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
    });

    if (error) {
      alert('エラーが発生しました: ' + error.message);
    } else {
      alert('住民への公式告知をデジタル投函しました。');
      reset({ ...values, title: '', content: '' });
    }
    setIsSubmitting(false);
  };

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen bg-slate-50">
      <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8" style={{ lineHeight: '1.25' }}>
      <div className="max-w-2xl mx-auto">
        <header className="mb-8">
          <span className="text-[10px] font-black bg-blue-600 text-white px-3 py-1 rounded-full uppercase tracking-widest">
            Official Management
          </span>
          <h1 className="text-3xl font-black text-slate-800 mt-2 tracking-tighter">物件掲示板の管理</h1>
          <p className="text-slate-500 text-sm mt-1">
            マンション住民へ重要な告知や点検のお知らせをデジタル配信します。
          </p>
        </header>

        <form onSubmit={handleSubmit(onSubmit)} className="bg-white rounded-[2.5rem] p-6 md:p-10 shadow-xl border border-slate-200 space-y-6">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase ml-1 tracking-widest">対象の物件</label>
            <select 
              {...register('property_id')}
              className="w-full bg-slate-100 border-none p-4 rounded-2xl font-bold text-slate-700 focus:ring-2 focus:ring-blue-600 outline-none appearance-none"
            >
              {managedProperties.length > 0 ? (
                managedProperties.map((p: any) => (
                  <option key={p.property_id} value={p.property_id}>{p.properties?.name || '名称不明物件'}</option>
                ))
              ) : (
                <option value="">担当物件がありません</option>
              )}
            </select>
            {errors.property_id && <p className="text-red-500 text-[10px] font-bold ml-1">{errors.property_id.message as string}</p>}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase ml-1 tracking-widest">告知の優先度</label>
              <select 
                {...register('category')}
                className="w-full bg-slate-100 border-none p-4 rounded-2xl font-bold text-slate-700 outline-none"
              >
                <option value="urgent">🚨 重要（断水・点検等）</option>
                <option value="info">📅 お知らせ（清掃・総会等）</option>
                <option value="event">🎉 イベント・自治会</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase ml-1 tracking-widest">タイトル</label>
              <input 
                {...register('title')}
                className="w-full bg-slate-100 border-none p-4 rounded-2xl font-bold text-slate-700 outline-none placeholder:text-slate-300"
                placeholder="例：受水槽清掃のお知らせ"
              />
              {errors.title && <p className="text-red-500 text-[10px] font-bold ml-1">{errors.title.message as string}</p>}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase ml-1 tracking-widest">詳細内容</label>
            <textarea 
              {...register('content')}
              className="w-full bg-slate-100 border-none p-4 rounded-2xl h-44 text-slate-700 outline-none placeholder:text-slate-300 resize-none"
              placeholder="作業時間や断水範囲、注意事項を具体的に入力してください..."
            />
            {errors.content && <p className="text-red-500 text-[10px] font-bold ml-1">{errors.content.message as string}</p>}
          </div>

          <button 
            disabled={isSubmitting || managedProperties.length === 0}
            className="w-full bg-slate-900 hover:bg-black text-white py-5 rounded-3xl font-black shadow-xl transition active:scale-95 disabled:opacity-50"
          >
            {isSubmitting ? 'デジタル投函中...' : 'デジタル掲示板に公開する'}
          </button>
        </form>
      </div>
    </div>
  );
}