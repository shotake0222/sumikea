'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import AdminLayout from '@/components/AdminLayout';
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
    totalShops: 0,
    totalAds: 0
  });

  const loadInitialData = async () => {
    const [resRes, noticeRes, storeRes, adRes, propRes] = await Promise.all([
      supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'USER'),
      supabase.from('property_notifications').select('*', { count: 'exact', head: true }),
      supabase.from('stores').select('*', { count: 'exact', head: true }),
      supabase.from('local_ads').select('*', { count: 'exact', head: true }),
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
          fetchTabData(activeTab),
          loadInitialData()
        ]);
      } catch (err) {
        console.error('取得エラー:', err);
      } finally {
        setLoading(false);
      }
    };
    checkAuthAndFetch();
  }, [router, activeTab]);

  const handleTabChange = (tab: ViewTab) => {
    setActiveTab(tab);
    fetchTabData(tab);
  };

  const getCoordinates = async (rawAddress: string) => {
    const normalized = rawAddress
      .replace(/[０-９]/g, (s) => String.fromCharCode(s.charCodeAt(0) - 0xFEE0))
      .replace(/[－ー－―ー−-]/g, '-')
      .replace(/[　]/g, ' ')
      .trim();

    const base = normalized.split(' ')[0];
    const searchPatterns = [
      normalized, base, base.replace(/-\d+$/, ''),
      base.replace(/-\d+$/, '').replace(/-\d+$/, ''),
      base.replace(/\d+.*$/, '')
    ];

    const uniquePatterns = Array.from(new Set(searchPatterns)).filter(p => p.length > 3);

    for (const query of uniquePatterns) {
      try {
        const response = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1`,
          { headers: { 'User-Agent': 'PosuttoAdmin/1.3' } }
        );
        const data = await response.json();
        if (data && data.length > 0) {
          return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
        }
        await new Promise(r => setTimeout(r, 200));
      } catch (err) { console.error('Geocoder Error:', err); }
    }
    return { lat: null, lng: null };
  };

  const addPropField = () => {
    setSelectedProps([...selectedProps, { id: '', code: Math.random().toString(36).substring(2, 7).toUpperCase() }]);
  };

  const handleRegister = async () => {
    if (!newItem.name || !newItem.email || !newItem.address) return alert('必須項目を入力してください');
    
    setLoading(true);
    try {
      const coords = await getCoordinates(newItem.address);
      if (!coords.lat || !coords.lng) {
        const proceed = confirm(`位置情報の特定に失敗しました。このまま登録しますか？`);
        if (!proceed) { setLoading(false); return; }
      }

      const initialPassword = Math.random().toString(36).slice(-8);
      const assignRole = activeTab === 'manager' ? 'MANAGER' : activeTab === 'shop' ? 'SHOP' : 'POSTING';
      const roleName = activeTab === 'manager' ? '管理会社' : activeTab === 'shop' ? '提携店舗' : 'ポスティング業者';

      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: newItem.email,
        password: initialPassword,
        options: { data: { role: assignRole } },
      });

      if (authError) throw authError;
      if (!authData.user) throw new Error('Auth作成失敗');

      await supabase.from('profiles').upsert({
        id: authData.user.id,
        role: assignRole,
        name: newItem.name,
        email: newItem.email
      });

      let table = activeTab === 'posting' ? 'posting_companies' : activeTab === 'manager' ? 'management_companies' : 'stores';
      const { error: insError } = await supabase.from(table).insert([{
        id: authData.user.id,
        name: newItem.name,
        email: newItem.email,
        address: newItem.address,
        lat: coords.lat,
        lng: coords.lng,
        initial_password: initialPassword,
        status: 'invited'
      }]);
      if (insError) throw insError;

      if (activeTab === 'manager' && selectedProps.length > 0) {
        for (const prop of selectedProps) {
          if (prop.id) {
            await supabase.from('properties').update({ 
              management_company_id: authData.user.id, 
              join_code: prop.code 
            }).eq('id', prop.id);
          }
        }
      }

      const loginUrl = `${window.location.origin}/login?type=${activeTab}`;

      // 🎯 Resendによる招待メール送信
      await fetch('/api/send-welcome', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: newItem.email,
          name: newItem.name,
          password: initialPassword,
          loginUrl: loginUrl,
          roleName: roleName
        }),
      });

      setRegisteredInfo({ url: loginUrl, email: newItem.email, pw: initialPassword });
      setNewItem({ name: '', email: '', address: '' });
      setSelectedProps([]);
      fetchTabData(activeTab);

    } catch (err: any) {
      alert(`登録エラー: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateItem = async () => {
    if (!selectedItem.name || !selectedItem.email) return;
    setLoading(true);
    try {
      const coords = await getCoordinates(selectedItem.address);
      let table = activeTab === 'posting' ? 'posting_companies' : activeTab === 'manager' ? 'management_companies' : 'stores';
      const { error } = await supabase.from(table).update({
        name: selectedItem.name,
        email: selectedItem.email,
        address: selectedItem.address,
        lat: coords.lat || selectedItem.lat,
        lng: coords.lng || selectedItem.lng
      }).eq('id', selectedItem.id);

      if (error) throw error;
      alert('更新しました');
      setIsManageModalOpen(false);
      fetchTabData(activeTab);
    } catch (err: any) { alert('更新エラー: ' + err.message); } finally { setLoading(false); }
  };

  const handleResetPassword = async () => {
    if (!confirm('パスワードを再発行し、メールで通知しますか？')) return;
    const newPassword = Math.random().toString(36).slice(-8);
    const roleName = activeTab === 'manager' ? '管理会社' : activeTab === 'shop' ? '提携店舗' : 'ポスティング業者';
    
    try {
      let table = activeTab === 'posting' ? 'posting_companies' : activeTab === 'manager' ? 'management_companies' : 'stores';
      const { error: upError } = await supabase.from(table).update({ 
        initial_password: newPassword, 
        status: 'invited' 
      }).eq('id', selectedItem.id);

      if (upError) throw upError;

      // 🎯 再発行メール送信API
      await fetch('/api/send-welcome', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: selectedItem.email,
          name: selectedItem.name,
          password: newPassword,
          loginUrl: `${window.location.origin}/login?type=${activeTab}`,
          roleName: `${roleName}（パスワード再発行）`
        }),
      });

      setIsManageModalOpen(false);
      setRegisteredInfo({ url: `${window.location.origin}/login`, email: selectedItem.email, pw: newPassword });
    } catch (err: any) { alert('エラー: ' + err.message); }
  };

  const handleDeleteItem = async () => {
    if (!confirm('本当に削除しますか？')) return;
    setLoading(true);
    try {
      let table = activeTab === 'posting' ? 'posting_companies' : activeTab === 'manager' ? 'management_companies' : 'stores';
      await supabase.from('profiles').delete().eq('id', selectedItem.id);
      await supabase.from(table).delete().eq('id', selectedItem.id);
      setIsManageModalOpen(false);
      fetchTabData(activeTab);
      loadInitialData();
    } catch (err: any) { alert('削除失敗: ' + err.message); } finally { setLoading(false); }
  };

  if (loading && dataList.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50">
        <div className="w-10 h-10 border-4 border-slate-900 border-t-blue-500 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <AdminLayout userType={userRole === 'ADMIN' ? 'ADMIN' : 'MANAGER'}>
      <div className="p-6 md:p-10 bg-[#F8FAFC] min-h-screen font-sans text-slate-900">
        <header className="mb-10">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-2 h-8 bg-slate-900 rounded-full" />
            <h1 className="text-4xl font-black italic uppercase tracking-tighter">ぽすっと <span className="text-blue-600 font-black">管理パネル</span></h1>
          </div>
        </header>

        {/* 統計セクション */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-12">
          {[{ label: '登録住民総数', value: stats.totalResidents, color: 'text-blue-600' },
            { label: '登録店舗・業者', value: stats.totalShops, color: 'text-orange-500' },
            { label: '分析対象広告', value: stats.totalAds, color: 'text-purple-600' },
            { label: '掲示板通知数', value: stats.activeNotices, color: 'text-emerald-600' }
          ].map((item, i) => (
            <div key={i} className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">{item.label}</p>
              <span className={`text-4xl font-black tracking-tighter ${item.color}`}>{item.value.toLocaleString()}</span>
            </div>
          ))}
        </div>

        <div className="mb-8 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex bg-slate-100 p-1.5 rounded-3xl gap-1">
            {(['posting', 'manager', 'shop'] as ViewTab[]).map((t) => (
              <button key={t} onClick={() => handleTabChange(t)} className={`px-8 py-3 rounded-2xl text-[11px] font-black transition-all ${activeTab === t ? 'bg-white shadow-sm text-slate-900' : 'text-slate-400'}`}>
                {t === 'posting' ? 'ポスティング業者' : t === 'manager' ? '管理会社' : '提携店舗'}
              </button>
            ))}
          </div>
          <button onClick={() => setIsModalOpen(true)} className="bg-blue-600 text-white px-8 py-4 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-900 transition shadow-lg w-full md:w-auto">
            + パートナー新規登録
          </button>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {dataList.map(item => (
            <div key={item.id} className="bg-white rounded-[3rem] shadow-sm border border-slate-100 p-8 flex flex-col group hover:border-blue-200 transition-all">
              <div className="flex justify-between items-start mb-2">
                <span className={`text-[9px] font-black px-3 py-1 rounded-full uppercase tracking-widest ${item.status === 'active' ? 'bg-emerald-50 text-emerald-600' : 'bg-orange-50 text-orange-600'}`}>
                  {item.status === 'active' ? '利用中' : '招待中（メール送信済）'}
                </span>
                {item.lat ? (
                  <span className="text-[9px] text-emerald-500 font-mono">📍 {item.lat.toFixed(3)}, {item.lng.toFixed(3)}</span>
                ) : (
                  <span className="text-[9px] text-red-400 font-black italic">📍 GPS ERROR</span>
                )}
              </div>
              <h3 className="text-2xl font-black text-slate-900 italic mb-1 tracking-tighter">{item.name}</h3>
              <p className="text-[11px] text-blue-600 font-bold mb-1 truncate">{item.email}</p>
              <p className="text-[10px] text-slate-400 font-medium mb-6 truncate">{item.address}</p>
              <div className="flex gap-2 mt-auto">
                <button onClick={() => { setSelectedItem(item); setIsManageModalOpen(true); }} className="flex-1 bg-slate-900 text-white py-3 rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-blue-600 transition shadow-md">管理・編集</button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 登録モーダル */}
      {(isModalOpen || registeredInfo) && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-[3rem] w-full max-w-xl p-10 shadow-2xl relative">
            {!registeredInfo ? (
              <>
                <h2 className="text-2xl font-black italic mb-6 uppercase">新規パートナー <span className="text-blue-600">登録</span></h2>
                <div className="space-y-5">
                  <input className="w-full p-4 bg-slate-50 rounded-2xl font-bold outline-none border-2 border-transparent focus:border-blue-500 transition-all" placeholder="名前" value={newItem.name} onChange={(e) => setNewItem({...newItem, name: e.target.value})} />
                  <input className="w-full p-4 bg-slate-50 rounded-2xl font-bold outline-none border-2 border-transparent focus:border-blue-500 transition-all" placeholder="メールアドレス" value={newItem.email} onChange={(e) => setNewItem({...newItem, email: e.target.value})} />
                  <input className="w-full p-4 bg-slate-50 rounded-2xl font-bold outline-none border-2 border-transparent focus:border-blue-500 transition-all" placeholder="住所" value={newItem.address} onChange={(e) => setNewItem({...newItem, address: e.target.value})} />
                  
                  {activeTab === 'manager' && (
                    <div className="pt-4 space-y-3">
                      <button onClick={addPropField} className="text-[10px] font-black text-blue-600">+ 管理物件を紐付け</button>
                      {selectedProps.map((item, index) => (
                        <select key={index} className="w-full p-3 bg-slate-50 rounded-xl font-bold text-xs outline-none" value={item.id} onChange={(e) => { const n = [...selectedProps]; n[index].id = e.target.value; setSelectedProps(n); }}>
                          <option value="">対象物件を選択</option>
                          {allProperties.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                        </select>
                      ))}
                    </div>
                  )}
                </div>
                <div className="flex gap-3 mt-8">
                  <button onClick={() => setIsModalOpen(false)} className="flex-1 py-4 font-black text-slate-400 text-[10px] uppercase">Cancel</button>
                  <button onClick={handleRegister} className="flex-1 bg-blue-600 text-white py-4 rounded-2xl font-black text-[10px] uppercase shadow-lg hover:bg-slate-900 transition-all">登録と招待メール送信</button>
                </div>
              </>
            ) : (
              <div className="text-center py-4">
                <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6 text-3xl animate-bounce">✓</div>
                <h2 className="text-2xl font-black mb-2 italic uppercase">Registration Success</h2>
                <p className="text-[10px] font-black text-emerald-600 mb-6 uppercase tracking-widest italic">ログイン情報をメールで送信しました</p>
                <div className="bg-slate-50 p-6 rounded-[2.5rem] text-left space-y-4 mb-8 border border-emerald-100">
                  <div><label className="text-[9px] font-black text-slate-400 uppercase">Login ID</label><p className="text-sm font-black">{registeredInfo.email}</p></div>
                  <div><label className="text-[9px] font-black text-slate-400 uppercase">Initial Password</label><p className="text-2xl font-black text-orange-600 tracking-wider">{registeredInfo.pw}</p></div>
                </div>
                <button onClick={() => { setRegisteredInfo(null); setIsModalOpen(false); }} className="w-full bg-slate-900 text-white py-5 rounded-2xl font-black text-[10px] uppercase shadow-xl">Done</button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 管理モーダル */}
      {isManageModalOpen && selectedItem && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-[3rem] w-full max-w-xl p-10 shadow-2xl relative">
            <h2 className="text-2xl font-black italic mb-8 uppercase">パートナー <span className="text-blue-600">管理</span></h2>
            <div className="space-y-6">
              <input className="w-full p-4 bg-slate-50 rounded-2xl font-bold outline-none" value={selectedItem.name} onChange={(e) => setSelectedItem({...selectedItem, name: e.target.value})} />
              <input className="w-full p-4 bg-slate-50 rounded-2xl font-bold outline-none" value={selectedItem.address} onChange={(e) => setSelectedItem({...selectedItem, address: e.target.value})} />
              <div className="grid grid-cols-2 gap-4">
                <button onClick={handleResetPassword} className="bg-orange-50 text-orange-600 py-4 rounded-2xl font-black text-[10px] uppercase hover:bg-orange-600 hover:text-white transition-all">🔑 パスワード再発行通知</button>
                <button onClick={handleDeleteItem} className="bg-red-50 text-red-600 py-4 rounded-2xl font-black text-[10px] uppercase hover:bg-red-600 hover:text-white transition-all">🗑️ アカウント削除</button>
              </div>
              <button onClick={handleUpdateItem} className="w-full bg-blue-600 text-white py-4 rounded-2xl font-black text-[10px] uppercase shadow-lg">情報を更新</button>
            </div>
            <button onClick={() => setIsManageModalOpen(false)} className="w-full mt-4 py-4 font-black text-slate-400 text-[10px] uppercase">閉じる</button>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}