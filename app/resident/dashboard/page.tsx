'use client';

import { useEffect, useState } from 'react';
import { supabase } from '../../../lib/supabase';
import { useRouter } from 'next/navigation'; // useRouterを追加
import Link from 'next/link';

export default function ResidentDashboard() {
  const router = useRouter();
  const [propertyInfo, setPropertyInfo] = useState<any>(null);
  const [utilityData, setUtilityData] = useState<any>([]);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<string | null>(null);

  useEffect(() => {
    const fetchResidentData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        router.push('/login?type=user');
        return;
      }

      const role = user.user_metadata?.role;
      setUserRole(role);

      // ✅ セキュリティガード修正: ADMIN または USER ロール以外はログインへ
      const isAuthorized = role === 'ADMIN' || role === 'USER';
      if (!isAuthorized) {
        router.push('/login?type=user');
        return;
      }

      // ユーザーのメタデータから物件IDを取得
      let propertyId = user.user_metadata?.property_id;

      // ✅ ADMINの場合、property_idがなければテスト用に最初の物件IDを取得する
      if (role === 'ADMIN' && (!propertyId || propertyId === "undefined")) {
        const { data: firstProp } = await supabase.from('properties').select('id').limit(1).single();
        if (firstProp) propertyId = firstProp.id;
      }

      // 🚨 ガード処理：依然としてpropertyIdがない場合はスキップ
      if (!propertyId || propertyId === "undefined") {
        console.warn("物件IDが特定できないため、情報取得をスキップしました。");
        setLoading(false);
        return;
      }

      // 物件専用情報の取得
      const { data: info } = await supabase
        .from('property_living_info')
        .select('*')
        .eq('property_id', propertyId)
        .single();
      
      // 直近のインフラ使用量取得
      // (ADMINの場合は全件から、USERの場合は自分のデータのみ)
      let utilityQuery = supabase.from('resident_utilities').select('*');
      if (role !== 'ADMIN') {
        utilityQuery = utilityQuery.eq('user_id', user.id);
      }
      
      const { data: utils } = await utilityQuery
        .order('usage_month', { ascending: false })
        .limit(6);

      setPropertyInfo(info);
      setUtilityData(utils || []);
      setLoading(false);
    };
    fetchResidentData();
  }, [router]);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
    </div>
  );

  return (
    <div className="max-w-md mx-auto bg-slate-50 min-h-screen pb-20" style={{ lineHeight: '1.25' }}>
      {/* ヒーローセクション：物件名と重要告知 */}
      <div className="bg-blue-600 p-8 rounded-b-[3rem] text-white shadow-lg">
        <div className="flex justify-between items-center">
          <span className="text-[10px] font-black bg-white/20 px-3 py-1 rounded-full uppercase tracking-widest">
            {userRole === 'ADMIN' ? 'Admin Preview' : 'Resident Only'}
          </span>
        </div>
        <h1 className="text-2xl font-black mt-2 tracking-tighter">
          {propertyInfo?.display_name || 'スカイハイツ立川'}
        </h1>
        <div className="mt-6 p-4 bg-white/10 rounded-2xl backdrop-blur-md border border-white/10">
          <p className="text-[10px] font-black uppercase opacity-60">Next Garbage Day</p>
          <p className="text-lg font-bold">
            {propertyInfo?.next_garbage_info || '明日 4/24(金) は 「燃えるゴミ」 です'}
          </p>
        </div>
      </div>

      <div className="p-6 space-y-8">
        {/* インフラ状況の可視化 */}
        <section>
          <h2 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4 ml-2">Utility Usage</h2>
          <div className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-slate-100">
            {utilityData.length > 0 ? (
              <div className="flex justify-between items-end gap-2 h-32">
                {utilityData.map((d: any, i: number) => (
                  <div key={i} className="flex-1 flex flex-col items-center gap-2">
                    <div className="w-full bg-blue-100 rounded-t-lg relative" style={{ height: `${Math.min((d.electricity_kwh / 500) * 100, 100)}%` }}>
                      <div className="absolute -top-6 left-0 right-0 text-[8px] text-center font-bold text-blue-600">{d.electricity_kwh}kwh</div>
                    </div>
                    <span className="text-[8px] font-black text-slate-400 uppercase">{new Date(d.usage_month).getMonth() + 1}月</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="h-32 flex items-center justify-center text-[10px] text-slate-400 font-bold uppercase italic">
                No Data Available
              </div>
            )}
          </div>
        </section>

        {/* 物件書類・契約関連 */}
        <section>
          <h2 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4 ml-2">Documents</h2>
          <div className="grid grid-cols-2 gap-4">
            <button className="bg-white p-5 rounded-3xl shadow-sm border border-slate-100 flex flex-col items-center gap-2 active:scale-95 transition">
              <span className="text-2xl">📄</span>
              <span className="text-[10px] font-black text-slate-700">管理規約PDF</span>
            </button>
            <button className="bg-white p-5 rounded-3xl shadow-sm border border-slate-100 flex flex-col items-center gap-2 active:scale-95 transition">
              <span className="text-2xl">🔌</span>
              <span className="text-[10px] font-black text-slate-700">インフラ契約</span>
            </button>
          </div>
        </section>

        {/* お問い合わせフォームへのリンク */}
        <section className="pt-4">
          <Link href="/resident/support" className="flex items-center justify-between w-full bg-slate-900 text-white p-6 rounded-[2rem] shadow-xl active:scale-95 transition">
            <div className="text-left">
              <p className="text-[10px] font-black opacity-60 uppercase">Support Center</p>
              <p className="font-bold">管理者へのお問い合わせ</p>
            </div>
            <span className="text-2xl">💬</span>
          </Link>
        </section>
      </div>

      {/* 下部に店舗広告を「ついで」に見せるセクション */}
      <div className="px-6 pb-10">
        <h2 className="text-xs font-black text-orange-500 uppercase tracking-widest mb-4 ml-2">Neighborhood Deals</h2>
        <div className="bg-orange-50 p-4 rounded-[2rem] border border-orange-100">
          <p className="text-[11px] font-bold text-orange-800 leading-relaxed">
            【住民限定】近隣の「立川ベーカリー」にて、この画面提示で10%OFF！
          </p>
        </div>
      </div>
    </div>
  );
}