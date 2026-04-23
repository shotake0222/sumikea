'use client';
import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import { useRouter } from 'next/navigation';

export default function ManagementNoticePage() {
  const router = useRouter();
  const [managedProperties, setManagedProperties] = useState<any[]>([]);
  const [selectedProperty, setSelectedProperty] = useState('');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [category, setCategory] = useState('urgent');
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const fetchAuthAndData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      
      // ✅ 修正1: roleの取得と大文字変換（揺れ防止）
      const role = user?.user_metadata?.role?.toUpperCase();
      const isAuthorized = role === 'ADMIN' || role === 'MANAGER';
      
      if (!user || !isAuthorized) {
        // パラメータが原因でループしないよう慎重にリダイレクト
        router.push('/login?type=manager');
        return;
      }
      
      let propertyList = [];

      if (role === 'ADMIN') {
        // ✅ 修正2: ADMINの場合のデータ構造を MANAGER 取得時（property_id, properties: {name}）に完全に合わせる
        const { data: allProps } = await supabase
          .from('properties')
          .select('id, name');
        
        if (allProps) {
          propertyList = allProps.map(p => ({ 
            property_id: p.id, 
            properties: { name: p.name } 
          }));
        }
      } else {
        const { data: managerProps } = await supabase
          .from('property_managers')
          .select('property_id, properties(name)')
          .eq('user_id', user.id);
        
        if (managerProps) propertyList = managerProps;
      }
      
      if (propertyList && propertyList.length > 0) {
        setManagedProperties(propertyList);
        // 初期値をセット
        setSelectedProperty(propertyList[0].property_id);
      }
      
      setLoading(false);
    };
    fetchAuthAndData();
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProperty) return alert('物件を選択してください');
    
    setIsSubmitting(true);
    const { error } = await supabase.from('property_notifications').insert({
      property_id: selectedProperty,
      title,
      content,
      category,
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
    });

    if (error) {
      alert('エラーが発生しました: ' + error.message);
    } else {
      alert('住民への告知を公開しました。');
      setTitle(''); 
      setContent('');
    }
    setIsSubmitting(false);
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="flex flex-col items-center gap-4">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-xs font-black text-slate-400 uppercase tracking-widest">権限確認中...</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8">
      <div className="max-w-2xl mx-auto">
        <header className="mb-8">
          <span className="text-[10px] font-black bg-blue-600 text-white px-3 py-1 rounded-full uppercase tracking-widest">Official Management</span>
          <h1 className="text-3xl font-black text-slate-800 mt-2 tracking-tighter">物件掲示板の管理</h1>
          <p className="text-slate-500 text-sm mt-1">住民へ重要な告知や点検のお知らせを配信します。</p>
        </header>

        <form onSubmit={handleSubmit} className="bg-white rounded-[2.5rem] p-6 md:p-10 shadow-xl border border-slate-200 space-y-6">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase ml-1 tracking-widest">対象の物件</label>
            <select 
              className="w-full bg-slate-100 border-none p-4 rounded-2xl font-bold text-slate-700 focus:ring-2 focus:ring-blue-600 outline-none"
              value={selectedProperty}
              onChange={(e) => setSelectedProperty(e.target.value)}
              required
            >
              <option value="" disabled>物件を選択してください</option>
              {managedProperties.map((p: any, index: number) => (
                <option key={p.property_id || index} value={p.property_id}>
                  {p.properties?.name || '不明な物件'}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase ml-1 tracking-widest">告知の優先度</label>
              <select 
                className="w-full bg-slate-100 border-none p-4 rounded-2xl font-bold text-slate-700 outline-none"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              >
                <option value="urgent">🚨 重要（断水・点検等）</option>
                <option value="info">📅 お知らせ（清掃・総会等）</option>
                <option value="event">🎉 イベント・自治会</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase ml-1 tracking-widest">タイトル</label>
              <input 
                className="w-full bg-slate-100 border-none p-4 rounded-2xl font-bold text-slate-700 outline-none placeholder:text-slate-300"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="例：4/25 受水槽清掃のお知らせ"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase ml-1 tracking-widest">詳細内容</label>
            <textarea 
              className="w-full bg-slate-100 border-none p-4 rounded-2xl h-44 text-slate-700 outline-none placeholder:text-slate-300"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="作業時間や注意事項を具体的に入力してください..."
              required
            />
          </div>

          <button 
            disabled={isSubmitting}
            className="w-full bg-slate-900 hover:bg-black text-white py-5 rounded-3xl font-black shadow-xl transition active:scale-95 disabled:opacity-50"
          >
            {isSubmitting ? '掲示板を更新中...' : 'デジタル掲示板に投稿する'}
          </button>
        </form>
      </div>
    </div>
  );
}