'use client';
import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import AdminLayout from '../../../components/AdminLayout';

export default function AdminStoreManager() {
  const [stores, setStores] = useState<any[]>([]);
  const [allProperties, setAllProperties] = useState<any[]>([]);
  const [newStoreName, setNewStoreName] = useState('');
  const [newOwnerId, setNewOwnerId] = useState(''); // 事前にAuthで作成したUID
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    // 1. 店舗と、紐付いている物件を取得
    const { data: storesData } = await supabase
      .from('stores')
      .select(`
        *,
        store_property_permissions(property_id)
      `);
    
    // 2. 全物件リストを取得
    const { data: propsData } = await supabase.from('properties').select('uuid, name');
    
    if (storesData) setStores(storesData);
    if (propsData) setAllProperties(propsData);
  };

  // 店舗の新規登録
  const handleCreateStore = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    // --- 【修正】店舗データ挿入と同時にProfileのロールを更新 ---
    const { error: storeError } = await supabase.from('stores').insert([
      { name: newStoreName, owner_id: newOwnerId }
    ]);

    if (storeError) {
      alert(storeError.message);
    } else {
      // ユーザーのロールをSHOPに昇格させる
      await supabase
        .from('profiles')
        .update({ role: 'SHOP', display_name: newStoreName })
        .eq('id', newOwnerId);

      setNewStoreName(''); setNewOwnerId('');
      fetchData();
    }
    setLoading(false);
  };

  // 権限の切り替え（チェックボックス操作）
  const togglePermission = async (storeId: string, propertyId: string, isGranted: boolean) => {
    if (isGranted) {
      // 権限削除
      await supabase
        .from('store_property_permissions')
        .delete()
        .eq('store_id', storeId)
        .eq('property_id', propertyId);
    } else {
      // 権限追加
      await supabase
        .from('store_property_permissions')
        .insert([{ store_id: storeId, property_id: propertyId }]);
    }
    fetchData(); // 状態更新
  };

  return (
    <AdminLayout userType="ADMIN"> {/* OWNERからADMINに変更 */}
      <div className="space-y-8">
        {/* セクション1：新規店舗登録 */}
        <section className="bg-white rounded-[2rem] p-8 shadow-sm border border-slate-100">
          <h2 className="text-xl font-black text-slate-800 mb-6 flex items-center">
            <span className="mr-2">🏪</span> 新規パートナー店舗の登録
          </h2>
          <form onSubmit={handleCreateStore} className="flex flex-wrap gap-4">
            <input 
              className="bg-slate-50 border-none p-4 rounded-2xl text-sm flex-1 min-w-[200px]" 
              placeholder="店舗名（例：ひまわりカフェ）"
              value={newStoreName}
              onChange={(e) => setNewStoreName(e.target.value)}
              required
            />
            <input 
              className="bg-slate-50 border-none p-4 rounded-2xl text-sm flex-1 min-w-[200px] font-mono" 
              placeholder="Auth Owner UID (Supabase Authからコピー)"
              value={newOwnerId}
              onChange={(e) => setNewOwnerId(e.target.value)}
              required
            />
            <button 
              disabled={loading}
              className="bg-blue-600 text-white px-8 py-4 rounded-2xl font-black hover:bg-blue-700 transition disabled:opacity-50"
            >
              店舗を開設
            </button>
          </form>
        </section>

        {/* セクション2：権限マトリックス管理 */}
        <section className="bg-white rounded-[2rem] p-8 shadow-sm border border-slate-100 overflow-hidden">
          <h2 className="text-xl font-black text-slate-800 mb-6 flex items-center">
            <span className="mr-2">🔑</span> 配信権限マネージャー
          </h2>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-50">
                  <th className="py-4 px-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">店舗名</th>
                  {allProperties.map(prop => (
                    <th key={prop.uuid} className="py-4 px-4 text-[10px] font-black text-slate-400 uppercase tracking-widest min-w-[120px] text-center">
                      {prop.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {stores.map(store => (
                  <tr key={store.id} className="hover:bg-slate-50 transition">
                    <td className="py-4 px-4">
                      <p className="font-bold text-slate-800 text-sm">{store.name}</p>
                      <p className="text-[9px] text-slate-400 font-mono truncate w-32">{store.owner_id}</p>
                    </td>
                    {allProperties.map(prop => {
                      const isGranted = store.store_property_permissions?.some(
                        (p: any) => p.property_id === prop.uuid
                      );
                      return (
                        <td key={prop.uuid} className="py-4 px-4 text-center">
                          <input 
                            type="checkbox"
                            checked={isGranted}
                            onChange={() => togglePermission(store.id, prop.uuid, !!isGranted)}
                            className="w-5 h-5 rounded-lg border-slate-200 text-blue-600 focus:ring-blue-500 cursor-pointer"
                          />
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </AdminLayout>
  );
}