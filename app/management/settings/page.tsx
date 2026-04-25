'use client';
import { useState } from 'react';
import { supabase } from '../../../lib/supabase';
import AdminLayout from '../../../components/AdminLayout';

export default function SuperAdminSettings() {
  const [inviteRole, setInviteRole] = useState('USER');
  const [generatedCode, setGeneratedCode] = useState('');

  const generateInvite = () => {
    // 実際にはDBにコードを保存する処理を追加
    const code = `${inviteRole}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
    setGeneratedCode(code);
  };

  return (
    <AdminLayout userType="ADMIN">
      <div className="p-10 max-w-5xl mx-auto">
        <h1 className="text-4xl font-black italic mb-4 uppercase">System <span className="text-blue-600">Config</span></h1>
        <p className="text-slate-400 text-[10px] font-black tracking-widest mb-10">システム権限・招待コード一括管理</p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="bg-white p-10 rounded-[3rem] shadow-sm">
            <h2 className="text-xl font-black mb-6">招待コードの新規発行</h2>
            <div className="space-y-6">
              <select 
                className="w-full p-4 bg-slate-100 rounded-xl font-black"
                value={inviteRole}
                onChange={(e) => setInviteRole(e.target.value)}
              >
                <option value="USER">一般ユーザー（住民）</option>
                <option value="SHOP">店舗・ポスティング業者</option>
                <option value="MANAGER">管理会社スタッフ</option>
                <option value="ADMIN">システム管理者</option>
              </select>
              <button onClick={generateInvite} className="w-full bg-blue-600 text-white py-4 rounded-xl font-black uppercase tracking-widest text-[10px]">コードを生成</button>
              {generatedCode && (
                <div className="p-4 bg-blue-50 border-2 border-blue-100 rounded-xl text-center">
                  <p className="text-[10px] font-black text-blue-400 mb-1 tracking-widest">GENERATED CODE</p>
                  <p className="text-2xl font-black text-blue-600 tracking-tighter">{generatedCode}</p>
                </div>
              )}
            </div>
          </div>

          <div className="bg-slate-900 p-10 rounded-[3rem] text-white">
            <h2 className="text-xl font-black mb-6 text-blue-400">ユーザー権限一括管理</h2>
            <p className="text-xs text-slate-400 leading-relaxed mb-6">
              全ロール（管理会社・店舗・住民）のステータスを監視します。不正なユーザーの凍結や、新規登録時の承認フローをここで制御します。
            </p>
            <button className="w-full bg-white/10 py-4 rounded-xl font-black text-[10px] tracking-widest uppercase hover:bg-white/20 transition">ユーザーリストを開く</button>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}