'use client';
import { useEffect } from 'react';
import { supabase } from '../lib/supabase';

export default function AdViewLogger({ propertyUuid, ads }: { propertyUuid: string, ads: any[] }) {
  useEffect(() => {
    if (ads.length === 0) return;

    const recordViews = async () => {
      const logs = ads.map(ad => ({
        ad_id: ad.id,
        property_id: propertyUuid
      }));

      // インプレッション（表示回数）をDBに記録
      await supabase.from('ad_views').insert(logs);
      
      // 簡易的な累計カウントの更新（必要に応じて）
      for (const ad of ads) {
        await supabase.rpc('increment_view_count', { ad_row_id: ad.id });
      }
    };

    recordViews();
  }, [propertyUuid, ads]);

  return null; // 画面には何も出さない
}