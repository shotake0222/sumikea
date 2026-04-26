'use client';

import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import AdminLayout from '../../components/AdminLayout';
import { useRouter } from 'next/navigation';

type ViewTab = 'posting' | 'manager' | 'shop';

export default function AdminPropertiesPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<string>('');
  const [activeTab, setActiveTab] = useState<ViewTab>('posting');
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isManageModalOpen, setIsManageModalOpen] = useState(false);
  
  const [newItem, setNewItem] = useState({ name: '', email: '', address: '' });
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [registeredInfo, setRegisteredInfo] = useState<{url: string, email: string, pw: string} | null>(null);

  const [allProperties, setAllProperties] = useState<any[]>([]);
  const [selectedProps, setSelectedProps] = useState<{id: string, code: string}[]>([]);
  const [dataList, setDataList] = useState<any[]>([]);
  const [stats, setStats] = useState({
    totalResidents: 0,
    activeNotices: 0,
    totalAds: 0,
    totalShops: 0
  });

  const loadInitialData = async () => {
    const [resRes, noticeRes, storeRes, adRes, propRes] = await Promise.all([
      supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'USER'),
      supabase.from('property_notifications').select('*', { count: 'exact', head: true }),
      supabase.from('stores').select('*', { count: 'exact', head: true }),
      supabase.from('local_ad_stats').select('*', { count: 'exact', head: true }),
      supabase.from('properties').select('id, name').is('management_company_id', null)
    ]);
    setStats({
      totalResidents: resRes.count || 0,
      activeNotices: noticeRes.count || 0,
      totalShops: storeRes.count || 0,
      totalAds: adRes.count || 0
    });
    setAllProperties(propRes.data || []);
  };

  const fetchTabData = async (tab: ViewTab) => {
    let table = tab === 'posting' ? 'posting_companies' : tab === 'manager' ? 'management_companies' : 'stores';
    const { data, error } = await supabase
      .from(table)
      .select(tab === 'manager' ? '*, properties(id)' : '*')
      .order('created_at', { ascending: false });

    if (error) return console.error(error);
    setDataList((data || []).map((d: any) => ({
      ...d,
      id: d.id,
      name: d.name,
      email: d.email || '未設定',
      status: d.status || 'invited',
      propCount: d.properties?.length || 0
    })));
  };

  useEffect(() => {
    const checkAuthAndFetch = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          router.push('/login?type=admin');
          return;
        }
        const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle();
        const role = profile?.role || 'USER';
        setUserRole(role);
        if (role !== 'ADMIN' && role !== 'MANAGER') {
          router.push('/login?type=admin');
          return;
        }
        await Promise.all([
          fetchTabData('posting'),
          loadInitialData()
        ]);
      } catch (err) {
        console.error('取得エラー:', err);
      } finally {
        setLoading(false);
      }
    };
    checkAuthAndFetch();
  }, [router]);

  const handleTabChange = (tab: ViewTab) => {
    setActiveTab(tab);
    fetchTabData(tab);
  };

  const getCoordinates = async (address: string) => {
    try {
      const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}`);
      const data = await response.json();
      if (data && data.length > 0) {
        return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
      }
      return { lat: null, lng: null };
    } catch (err) {
      console.error("ジオコーディングエラー:", err);
      return { lat: null, lng: null };
    }
  };

  const addPropField = () => {
    setSelectedProps([...selectedProps, { id: '', code: Math.random().toString(36).substring(2, 7).toUpperCase() }]);
  };

  // ==========================================
  // 新規登録ロジック (修正版)
  // ==========================================
  const handleRegister = async () => {
    if (!newItem.name || !newItem.email || !newItem.address) return alert('名称、メール、住所を入力してください');
    setLoading(true);
    try {
      const coords = await getCoordinates(newItem.address);
      const initialPassword = Math.random().toString(36).slice(-8);
      const assignRole = activeTab === 'manager' ? 'MANAGER' : 'USER';
      
      // 1. Supabase Auth にアカウント作成
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: newItem.email,
        password: initialPassword,
        options: {
          data: {
            full_name: newItem.name,
            role: assignRole
          }
        }
      });

      if (authError) throw new Error('認証作成失敗: ' + authError.message);
      if (!authData.user) throw new Error('ユーザーデータが生成されませんでした。');

      // 2. 独自テーブルへの挿入 (AuthのIDを主キーとして使用)
      let table = activeTab === 'posting' ? 'posting_companies' : activeTab === 'manager' ? 'management_companies' : 'stores';
      
      const { data: created, error: insertError } = await supabase.from(table).insert([{
        id: authData.user.id, // AuthのIDを強制指定
        name: newItem.name,
        email: newItem.email,
        address: newItem.address,
        lat: coords.lat,
        lng: coords.lng,
        initial_password: initialPassword,
        status: 'invited'
      }]).select().single();

      if (insertError) {
        console.error("DB Insert Error:", insertError);
        throw new Error('テーブル登録に失敗しました。Authのみ作成されました。');
      }

      // 3. 管理物件の紐付け (管理会社の場合)
      if (activeTab === 'manager' && selectedProps.length > 0) {
        for (const prop of selectedProps) {
          if (!prop.id) continue;
          await supabase.from('properties').update({ management_company_id: created.id, join_code: prop.code }).eq('id', prop.id);
        }
      }

      setRegisteredInfo({ url: `${window.location.origin}/login`, email: newItem.email, pw: initialPassword });
      setNewItem({ name: '', email: '', address: '' });
      setSelectedProps([]);
      fetchTabData(activeTab);
    } catch (err: any) {
      alert('エラー: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateItem = async () => {
    if (!selectedItem.name || !selectedItem.email) return;
    setLoading(true);
    try {
      let table = activeTab === 'posting' ? 'posting_companies' : activeTab === 'manager' ? 'management_companies' : 'stores';
      const { error } = await supabase.from(table).update({
        name: selectedItem.name,
        email: selectedItem.email,
        address: selectedItem.address
      }).eq('id', selectedItem.id);
      if (error) throw error;
      alert('更新しました');
      setIsManageModalOpen(false);
      fetchTabData(activeTab);
    } catch (err: any) {
      alert('更新エラー: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (!confirm('パスワードを再発行しますか？\n※注意: 管理パネル上の表示のみ更新されます。ログインできない場合はSQLでの修復が必要です。')) return;
    const newPassword = Math.random().toString(36).slice(-8);
    try {
      let table = activeTab === 'posting' ? 'posting_companies' : activeTab === 'manager' ? 'management_companies' : 'stores';
      const { error } = await supabase.from(table).update({
        initial_password: newPassword,
        status: 'invited' 
      }).eq('id', selectedItem.id);
      if (error) throw error;
      
      setIsManageModalOpen(false);
      setRegisteredInfo({ url: `${window.location.origin}/login`, email: selectedItem.email, pw: newPassword });
    } catch (err: any) {
      alert('再発行エラー: ' + err.message);
    }
  };

  const handleDeleteItem = async () => {
    if (!confirm('本当に削除しますか？ (※Authアカウントは手動削除が必要です)')) return;
    setLoading(true);
    try {
      let table = activeTab === 'posting' ? 'posting_companies' : activeTab === 'manager' ? 'management_companies' : 'stores';
      const { error } = await supabase.from(table).delete().eq('id', selectedItem.id);
      if (error) throw error;
      alert('削除しました');
      setIsManageModalOpen(false);
      await fetchTabData(activeTab);
      await loadInitialData();
    } catch (err: any) {
      alert('削除エラー: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading && dataList.length === 0) return (
    <div className="flex items-center justify-center min-h-screen bg-slate-50">
      <div className="w-10 h-10 border-4 border-slate-900 border-t-blue-500 rounded-full animate-spin" />
    </div>
  );

  return (
    <AdminLayout userType={userRole === 'ADMIN' ? 'ADMIN' : 'MANAGER'}>
      <div className="p-6 md:p-10 bg-[#F8FAFC] min-h-screen font-sans text-slate-900">
        <header className="mb-10 flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-2 h-8 bg-slate-900 rounded-full" />
              <h1 className="text-4xl font-black italic uppercase">ぽすっと <span className="text-blue-600">管理パネル</span></h1>
            </div>
            <p className="text-slate-400 text-[10px] font-bold tracking-widest ml-5 uppercase">Operator Management System</p>
          </div>
        </header>

        {/* 統計カード */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-12">
          {[{ label: '登録住民総数', value: stats.totalResidents, unit: '名', color: 'text-blue-600' },
            { label: '登録店舗・業者', value: stats.totalShops, unit: '件', color: 'text-orange-500' },
            { label: '分析対象広告', value: stats.totalAds, unit: '本', color: 'text-purple-600' },
            { label: '掲示板通知数', value: stats.activeNotices, unit: '件', color: 'text-emerald-600' }
          ].map((item, i) => (
            <div key={i} className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">{item.label}</p>
              <div className="flex items-baseline gap-1">
                <span className={`text-4xl font-black tracking-tighter ${item.color}`}>{item.value.toLocaleString()}</span>
                <span className="text-xs font-bold text-slate-300">{item.unit}</span>
              </div>
            </div>
          ))}
        </div>

        {/* タブ切り替えと新規ボタン */}
        <div className="mb-8 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex bg-slate-100 p-1.5 rounded-3xl gap-1">
            {(['posting', 'manager', 'shop'] as ViewTab[]).map((t) => (
              <button key={t} onClick={() => handleTabChange(t)} className={`px-8 py-3 rounded-2xl text-[11px] font-black transition-all ${activeTab === t ? 'bg-white shadow-sm text-slate-900' : 'text-slate-400'}`}>
                {t === 'posting' ? 'ポスティング業者' : t === 'manager' ? '管理会社' : '提携店舗'}
              </button>
            ))}
          </div>
          <button onClick={() => setIsModalOpen(true)} className="bg-blue-600 text-white px-8 py-4 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-900 transition shadow-lg w-full md:w-auto">
            + {activeTab === 'posting' ? '業者' : activeTab === 'manager' ? '管理会社' : '店舗'}を新規登録
          </button>
        </div>

        {/* リスト表示 */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {dataList.map(item => (
            <div key={item.id} className="bg-white rounded-[3rem] shadow-sm border border-slate-100 p-8 flex flex-col relative overflow-hidden">
              <div className="flex justify-between items-start mb-2">
                <span className={`text-[9px] font-black px-3 py-1 rounded-full uppercase tracking-widest ${item.status === 'active' ? 'bg-emerald-50 text-emerald-600' : 'bg-orange-50 text-orange-600'}`}>
                  {item.status === 'active' ? '利用中' : 'PW発行済'}
                </span>
              </div>
              <h3 className="text-2xl font-black text-slate-900 italic mb-1 tracking-tighter">{item.name}</h3>
              <p className="text-[11px] text-blue-600 font-bold mb-1">📧 {item.email}</p>
              <p className="text-[10px] text-slate-400 font-medium mb-6 truncate">📍 {item.address || '住所未登録'}</p>
              <div className="flex gap-2 mt-auto">
                <button onClick={() => { setSelectedItem(item); setIsManageModalOpen(true); }} className="flex-1 bg-slate-900 text-white py-3 rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-blue-600 transition shadow-md">管理</button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 新規登録・完了モーダル */}
      {(isModalOpen || registeredInfo) && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-[3rem] w-full max-w-xl p-10 shadow-2xl relative">
            {!registeredInfo ? (
              <>
                <h2 className="text-2xl font-black italic mb-6 uppercase">パートナーを <span className="text-blue-600">登録</span></h2>
                <div className="space-y-5">
                  <div>
                    <label className="text-[10px] font-black text-slate-400 ml-2 uppercase">Company Name</label>
                    <input className="w-full p-4 bg-slate-50 rounded-2xl font-bold" placeholder="会社・店舗名" value={newItem.name} onChange={(e) => setNewItem({...newItem, name: e.target.value})} />
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-slate-400 ml-2 uppercase">Email Address</label>
                    <input type="email" className="w-full p-4 bg-slate-50 rounded-2xl font-bold text-blue-600" placeholder="ログインID" value={newItem.email} onChange={(e) => setNewItem({...newItem, email: e.target.value})} />
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-slate-400 ml-2 uppercase">Office/Store Address</label>
                    <input className="w-full p-4 bg-slate-50 rounded-2xl font-bold" placeholder="東京都立川市..." value={newItem.address} onChange={(e) => setNewItem({...newItem, address: e.target.value})} />
                  </div>
                  {activeTab === 'manager' && (
                    <div className="pt-4 border-t border-slate-100">
                      <button onClick={addPropField} className="text-[10px] font-black text-blue-600">+ 管理物件を割り当て</button>
                      <div className="mt-4 space-y-2">
                        {selectedProps.map((item, index) => (
                          <div key={index} className="flex gap-2 bg-slate-50 p-2 rounded-xl">
                            <select className="flex-1 bg-transparent p-2 font-bold text-xs" value={item.id} onChange={(e) => { const n = [...selectedProps]; n[index].id = e.target.value; setSelectedProps(n); }}>
                              <option value="">物件選択</option>
                              {allProperties.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                            </select>
                            <div className="w-20 flex items-center justify-center font-black text-blue-600 text-xs bg-white rounded-lg">{item.code}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                <div className="flex gap-3 mt-10">
                  <button onClick={() => setIsModalOpen(false)} className="flex-1 py-4 font-black text-slate-400 text-[10px]">キャンセル</button>
                  <button onClick={handleRegister} className="flex-1 bg-blue-600 text-white py-4 rounded-2xl font-black text-[10px] uppercase shadow-lg">登録して座標計算 & PW発行</button>
                </div>
              </>
            ) : (
              <div className="text-center animate-in fade-in zoom-in duration-300">
                <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6 text-3xl">✓</div>
                <h2 className="text-2xl font-black mb-2 italic uppercase">Credentials <span className="text-emerald-600">Issued</span></h2>
                <div className="bg-slate-50 p-6 rounded-[2.5rem] text-left space-y-4 mb-8">
                  <div><label className="text-[9px] font-black text-slate-400 uppercase">Login URL</label><p className="text-xs font-bold text-blue-600 break-all">{registeredInfo.url}</p></div>
                  <div><label className="text-[9px] font-black text-slate-400 uppercase">ID</label><p className="text-sm font-black text-slate-900">{registeredInfo.email}</p></div>
                  <div><label className="text-[9px] font-black text-slate-400 uppercase">Password</label><p className="text-2xl font-black text-orange-600 tracking-wider">{registeredInfo.pw}</p></div>
                </div>
                <button onClick={() => { navigator.clipboard.writeText(`ID: ${registeredInfo.email}\nPW: ${registeredInfo.pw}`); setRegisteredInfo(null); setIsModalOpen(false); }} className="w-full bg-slate-900 text-white py-5 rounded-2xl font-black text-[10px] uppercase shadow-xl">コピーして閉じる</button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 管理モーダル */}
      {isManageModalOpen && selectedItem && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-[3rem] w-full max-w-xl p-10 shadow-2xl relative">
            <h2 className="text-2xl font-black italic mb-6 uppercase">アカウント <span className="text-blue-600">管理</span></h2>
            <div className="space-y-6">
              <div>
                <label className="text-[10px] font-black text-slate-400 ml-2 uppercase">Company Name</label>
                <input className="w-full p-4 bg-slate-50 rounded-2xl font-bold" value={selectedItem.name} onChange={(e) => setSelectedItem({...selectedItem, name: e.target.value})} />
              </div>
              <div>
                <label className="text-[10px] font-black text-slate-400 ml-2 uppercase">Address</label>
                <input className="w-full p-4 bg-slate-50 rounded-2xl font-bold" value={selectedItem.address || ''} onChange={(e) => setSelectedItem({...selectedItem, address: e.target.value})} />
              </div>
              <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-100">
                <button onClick={handleResetPassword} className="bg-orange-50 text-orange-600 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest">🔑 PW再発行</button>
                <button onClick={handleDeleteItem} className="bg-red-50 text-red-600 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest">🗑️ 削除</button>
              </div>
            </div>
            <div className="flex gap-3 mt-10">
              <button onClick={() => setIsManageModalOpen(false)} className="flex-1 py-4 font-black text-slate-400 text-[10px]">キャンセル</button>
              <button onClick={handleUpdateItem} className="flex-1 bg-slate-900 text-white py-4 rounded-2xl font-black text-[10px] uppercase shadow-lg">変更を保存</button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}