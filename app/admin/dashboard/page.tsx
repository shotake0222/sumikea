'use client';
import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import AdminLayout from '../../../components/AdminLayout';

export default function SuperAdminDashboard() {
  const [stats, setStats] = useState({ totalAds: 0, totalViews: 0, totalProperties: 0 });
  const [propertyList, setPropertyList] = useState<any[]>([]);
  const [managementUsers, setManagementUsers] = useState<any[]>([]); // 管理会社ユーザーリスト
  const [loading, setLoading] = useState(false);

  const [noticeTarget, setNoticeTarget] = useState<string | null>(null);
  const [noticeTitle, setNoticeTitle] = useState('');
  const [noticeContent, setNoticeContent] = useState('');

  useEffect(() => {
    fetchStats();
    fetchManagementUsers();
  }, []);

  const fetchStats = async () => {
    const { count: pCount } = await supabase.from('properties').select('*', { count: 'exact', head: true });
    const { count: aCount } = await supabase.from('local_ads').select('*', { count: 'exact', head: true });
    const { data: ads } = await supabase.from('local_ads').select('view_count');
    const totalViews = ads?.reduce((sum, ad) => sum + (ad.view_count || 0), 0) || 0;

    setStats({ totalAds: aCount || 0, totalViews, totalProperties: pCount || 0 });

    const { data: props } = await supabase
      .from('properties')
      .select(`uuid, name, management_id, ad_view_logs(count)`);
    
    if (props) setPropertyList(props);
  };

  // 管理会社ロールを持つユーザーを取得
  const fetchManagementUsers = async () => {
    const { data } = await supabase
      .from('profiles')
      .select('id, name')
      .eq('role', 'MANAGEMENT');
    if (data) setManagementUsers(data);
  };

  // 物件に管理会社を紐付ける処理
  const handleAssignManagement = async (propertyId: string, managementId: string) => {
    const { error } = await supabase
      .from('properties')
      .update({ management_id: managementId || null })
      .eq('uuid', propertyId);

    if (error) {
      alert('更新エラー: ' + error.message);
    } else {
      fetchStats(); // リストを更新
    }
  };

  const handlePostNotice = async (propertyId: string) => {
    if (!noticeTitle || !noticeContent) return alert('入力してください');
    setLoading(true);
    const { error } = await supabase.from('property_notices').insert([
      { property_id: propertyId, title: noticeTitle, content: noticeContent, priority: 'NORMAL' }
    ]);
    if (!error) {
      alert('投稿しました');
      setNoticeTarget(null);
      setNoticeTitle('');
      setNoticeContent('');
    }
    setLoading(false);
  };

  return (
    <AdminLayout userType="ADMIN">
      <div className="space-y-8">
        <h1 className="text-3xl font-black text-slate-800 tracking-tighter">System Overview</h1>

        {/* サマリーカード（中身は維持） */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Total Ad Views</p>
            <p className="text-4xl font-black text-blue-600 tracking-tighter">{stats.totalViews.toLocaleString()}</p>
          </div>
          <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Active Ads</p>
            <p className="text-4xl font-black text-slate-800 tracking-tighter">{stats.totalAds}</p>
          </div>
          <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Properties</p>
            <p className="text-4xl font-black text-slate-800 tracking-tighter">{stats.totalProperties}</p>
          </div>
        </div>

        <div className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-slate-100">
          <h2 className="text-xl font-black text-slate-800 mb-6 flex items-center gap-2">
            <span>🏢</span> 物件管理 ＆ 権限アサイン
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-slate-50">
                  <th className="pb-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Property Name</th>
                  <th className="pb-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Management Company</th>
                  <th className="pb-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Views</th>
                  <th className="pb-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {propertyList.map((p) => (
                  <tr key={p.uuid} className="group">
                    <td className="py-6">
                      <p className="text-sm font-bold text-slate-700">{p.name}</p>
                    </td>
                    <td className="py-6">
                      <select 
                        className="bg-slate-50 border-none text-[11px] font-bold rounded-lg px-2 py-1 focus:ring-2 focus:ring-blue-600 outline-none"
                        value={p.management_id || ''}
                        onChange={(e) => handleAssignManagement(p.uuid, e.target.value)}
                      >
                        <option value="">未割当（運営直轄）</option>
                        {managementUsers.map(user => (
                          <option key={user.id} value={user.id}>{user.name}</option>
                        ))}
                      </select>
                    </td>
                    <td className="py-6 text-center">
                      <span className="text-sm font-black text-blue-500 bg-blue-50 px-3 py-1 rounded-full">
                        {p.ad_view_logs?.[0]?.count || 0}
                      </span>
                    </td>
                    <td className="py-6 text-right">
                      <button 
                        onClick={() => setNoticeTarget(noticeTarget === p.uuid ? null : p.uuid)}
                        className={`text-[10px] font-bold px-4 py-2 rounded-xl transition ${noticeTarget === p.uuid ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                      >
                        📢 掲示板
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* お知らせ投稿フォーム（中身は維持） */}
        {noticeTarget && (
          <div className="fixed bottom-8 right-8 w-96 bg-white rounded-[2.5rem] p-8 shadow-2xl border border-slate-100">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-black text-slate-800 text-sm">【運営】物件掲示板に投稿</h3>
              <button onClick={() => setNoticeTarget(null)} className="text-slate-400 hover:text-slate-600">×</button>
            </div>
            <div className="space-y-4">
              <input className="w-full bg-slate-50 border-none p-3 rounded-xl text-sm" placeholder="タイトル" value={noticeTitle} onChange={(e) => setNoticeTitle(e.target.value)} />
              <textarea className="w-full bg-slate-50 border-none p-3 rounded-xl text-sm h-24" placeholder="内容..." value={noticeContent} onChange={(e) => setNoticeContent(e.target.value)} />
              <button onClick={() => handlePostNotice(noticeTarget)} disabled={loading} className="w-full bg-blue-600 text-white py-3 rounded-2xl font-black text-sm">
                {loading ? '投稿中...' : '配信実行'}
              </button>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}