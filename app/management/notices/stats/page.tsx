'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter, useParams } from 'next/navigation';
import Image from 'next/image';

export default function AnalyticsPage() {
  const params = useParams();
  const noticeId = params.id;
  const [notice, setNotice] = useState<any>(null);
  const [totalResidents, setTotalResidents] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStats() {
      try {
        setLoading(true);

        // 1. まずはお知らせ(notice)の基本情報を取得
        const { data: noticeData, error: noticeError } = await supabase
          .from('notices')
          .select('*')
          .eq('id', noticeId)
          .single();

        if (noticeError || !noticeData) {
          console.error('Notice not found');
          setLoading(false);
          return;
        }

        setNotice(noticeData);

        // 2. noticeが確実にある状態で、プロフィールの総数を取得
        // ここがエラーの起きていた箇所です。順番を正しく修正しました。
        const { count, error: profileError } = await supabase
          .from('profiles')
          .select('*', { count: 'exact', head: true })
          .eq('property_id', noticeData.property_id);

        if (profileError) throw profileError;
        setTotalResidents(count || 0);

        // 3. 既読データなどの取得もここに追加できます
        // const { data: reads } = await supabase...

      } catch (error) {
        console.error('Error fetching stats:', error);
      } finally {
        setLoading(false);
      }
    }

    if (noticeId) {
      fetchStats();
    }
  }, [noticeId]);

  if (loading) return <div className="p-8 text-center">読み込み中...</div>;
  if (!notice) return <div className="p-8 text-center">データが見つかりませんでした。</div>;

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        <h1 className="text-2xl font-bold text-gray-800">配信分析</h1>
        
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h2 className="text-sm font-medium text-gray-500 mb-1">配信対象のお知らせ</h2>
          <p className="text-lg font-semibold text-gray-900">{notice.title}</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <p className="text-sm font-medium text-gray-500">対象物件の総居住者数</p>
            <p className="text-3xl font-bold text-blue-600">{totalResidents} <span className="text-sm font-normal text-gray-400">人</span></p>
          </div>
          
          {/* 今後、既読率などをここに追加 */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <p className="text-sm font-medium text-gray-500">既読数（準備中）</p>
            <p className="text-3xl font-bold text-gray-300">-- <span className="text-sm font-normal text-gray-400">人</span></p>
          </div>
        </div>
      </div>
    </div>
  );
}
