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
  
  // モーダル制御
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newItem, setNewItem] = useState({ name: '', email: '' });
  
  // 登録完了後の情報表示用
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
        fetchTabData('posting');
        loadInitialData();
      } catch (err) {
        console.error('取得エラー:', err);
      } finally {
        setLoading(false);
      }
    };
    checkAuthAndFetch();
  }, [router]);

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
    const { data, error } = await supabase.from(table).select(tab === 'manager' ? '*, properties(id)' : '*').order('created_at', { ascending: false });
    if (error) return console.error(error);
    setDataList((data || []).map((d: any) => ({
      id: d.id,
      name: d.name,
      email: d.email || '未設定',
      status: d.status || 'invited',
      propCount: d.properties?.length || 0
    })));
  };

  const handleTabChange = (tab: ViewTab) => {
    setActiveTab(tab);
    fetchTabData(tab);
  };

  const addPropField = () => {
    setSelectedProps([...selectedProps, { id: '', code: Math.random().toString(36).substring(2, 7).toUpperCase() }]);
  };

  // ✅ 修正：初期PW発行フロー
  const handleRegister = async () => {
    if (!newItem.name || !newItem.email) return alert('名称とメールアドレスを入力してください');
    
    setLoading(true);
    try {
      // 1. 初期パスワードを生成 (8文字)
      const initialPassword = Math.random().toString(36).slice(-8);
      let table = activeTab === 'posting' ? 'posting_companies' : activeTab === 'manager' ? 'management_companies' : 'stores';
      
      // 2. DBに業者情報を登録（emailと初期パスワードを保存）
      // ※DB側に initial_password カラムがある前提です。
      const { data: created, error } = await supabase.from(table).insert([{
        name: newItem.name,
        email: newItem.email,
        initial_password: initialPassword, // 運営が確認するための保存
        status: 'invited'
      }]).select().single();

      if (error) throw error;

      // 3. 物件紐付け（管理会社のみ）
      if (activeTab === 'manager' && selectedProps.length > 0) {
        for (const prop of selectedProps) {
          if (!prop.id) continue;
          await supabase.from('properties').update({ management_company_id: created.id, join_code: prop.code }).eq('id', prop.id);
        }
      }

      // 4. 完了情報をステートにセット（表示用）
      setRegisteredInfo({
        url: `${window.location.origin}/login`,
        email: newItem.email,
        pw: initialPassword
      });

      setNewItem({ name: '', email: '' });
      setSelectedProps([]);
      fetchTabData(activeTab);
    } catch (err: any) {
      alert('エラー: ' + err.message);
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
          <div className="flex gap-2">
             <button onClick={() => router.push('/management/post-ad')} className="bg-slate-900 text-white px-6 py-4 rounded-2xl hover:bg-blue-600 transition shadow-xl text-[10px] font-black uppercase tracking-widest">🎯 広告を新規作成</button>
             <button onClick={() => router.push('/management/reporting')} className="bg-white border-2 border-slate-900 text-slate-900 px-6 py-4 rounded-2xl hover:bg-slate-50 transition shadow-md text-[10px] font-black uppercase tracking-widest">📈 全体レポート</button>
          </div>
        </header>

        {/* 統計 */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-12">
          {[{ label: '登録住民総数', value: stats.totalResidents, unit: '名', color: 'text-blue-600', path: '/management/reporting?target=resident' },
            { label: '登録店舗・業者', value: stats.totalShops, unit: '件', color: 'text-orange-500', path: '/properties' },
            { label: '分析対象広告', value: stats.totalAds, unit: '本', color: 'text-purple-600', path: '/management/reporting?target=posting' },
            { label: '掲示板通知数', value: stats.activeNotices, unit: '件', color: 'text-emerald-600', path: '/management/notices' }
          ].map((item, i) => (
            <div key={i} onClick={() => router.push(item.path)} className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100 cursor-pointer hover:scale-[1.02] transition-all group">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">{item.label}</p>
              <div className="flex items-baseline gap-1">
                <span className={`text-4xl font-black tracking-tighter ${item.color}`}>{item.value.toLocaleString()}</span>
                <span className="text-xs font-bold text-slate-300">{item.unit}</span>
              </div>
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
            + {activeTab === 'posting' ? '業者' : activeTab === 'manager' ? '管理会社' : '店舗'}を新規登録
          </button>
        </div>

        {/* リスト表示 */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {dataList.map(item => (
            <div key={item.id} className="bg-white rounded-[3rem] shadow-sm border border-slate-100 p-8 group hover:border-blue-200 transition-all flex flex-col relative overflow-hidden">
              <div className="flex justify-between items-start mb-2 relative z-10">
                <span className={`text-[9px] font-black px-3 py-1 rounded-full uppercase tracking-widest ${item.status === 'active' ? 'bg-emerald-50 text-emerald-600' : 'bg-orange-50 text-orange-600'}`}>
                  {item.status === 'active' ? '利用中' : 'PW発行済'}
                </span>
                {item.propCount > 0 && <span className="text-[10px] font-black bg-blue-50 text-blue-600 px-3 py-1 rounded-full">{item.propCount} 物件</span>}
              </div>
              <h3 className="text-2xl font-black text-slate-900 italic mb-1 group-hover:text-blue-600 transition-colors tracking-tighter relative z-10">{item.name}</h3>
              <p className="text-[11px] text-blue-600 font-bold mb-6 relative z-10">📧 {item.email}</p>
              <div className="flex gap-2 mt-auto relative z-10">
                <button className="flex-1 bg-slate-50 text-slate-400 py-3 rounded-xl text-[9px] font-black uppercase tracking-widest">ログイン情報再送</button>
                <button onClick={() => router.push(`/management/reporting?id=${item.id}`)} className="flex-1 bg-slate-900 text-white py-3 rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-blue-600 transition shadow-md">管理</button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 登録用モーダル */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-[3rem] w-full max-w-xl p-10 shadow-2xl relative">
            {!registeredInfo ? (
              <>
                <h2 className="text-2xl font-black italic mb-6 uppercase">パートナーを <span className="text-blue-600">登録</span></h2>
                <div className="space-y-6">
                  <div>
                    <label className="text-[10px] font-black text-slate-400 ml-2 uppercase">Company Name</label>
                    <input className="w-full p-4 bg-slate-50 rounded-2xl outline-none border-2 border-transparent focus:border-blue-500 font-bold" placeholder="会社・店舗名" value={newItem.name} onChange={(e) => setNewItem({...newItem, name: e.target.value})} />
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-slate-400 ml-2 uppercase">Email Address</label>
                    <input type="email" className="w-full p-4 bg-slate-50 rounded-2xl outline-none border-2 border-transparent focus:border-blue-500 font-bold text-blue-600" placeholder="ログインIDになります" value={newItem.email} onChange={(e) => setNewItem({...newItem, email: e.target.value})} />
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
                  <button onClick={() => setIsModalOpen(false)} className="flex-1 py-4 font-black text-slate-400 text-[10px] uppercase tracking-widest">キャンセル</button>
                  <button onClick={handleRegister} className="flex-1 bg-blue-600 text-white py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg">登録してPWを発行</button>
                </div>
              </>
            ) : (
              <div className="text-center">
                <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6 text-3xl">✓</div>
                <h2 className="text-2xl font-black mb-2">登録完了</h2>
                <p className="text-slate-400 font-bold text-xs mb-8 uppercase tracking-widest">Login Information Created</p>
                
                <div className="bg-slate-50 p-6 rounded-[2rem] text-left space-y-4 mb-8">
                  <div>
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">Login URL</label>
                    <p className="text-xs font-bold text-blue-600 break-all">{registeredInfo.url}</p>
                  </div>
                  <div>
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">Login ID (Email)</label>
                    <p className="text-sm font-black text-slate-900">{registeredInfo.email}</p>
                  </div>
                  <div>
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">Initial Password</label>
                    <p className="text-lg font-black text-orange-600 tracking-wider">{registeredInfo.pw}</p>
                  </div>
                </div>

                <button 
                  onClick={() => {
                    const text = `【ぽすっと】ログイン情報\nURL: ${registeredInfo.url}\nID: ${registeredInfo.email}\nPW: ${registeredInfo.pw}`;
                    navigator.clipboard.writeText(text);
                    alert('コピーしました。メールやチャットで送信してください。');
                    setRegisteredInfo(null);
                    setIsModalOpen(false);
                  }}
                  className="w-full bg-slate-900 text-white py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl"
                >
                  情報をコピーして閉じる
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </AdminLayout>
  );
}