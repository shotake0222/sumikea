'use client';

import { Camera } from 'lucide-react';
import { uploadImage } from '../lib/upload';

export default function TrashUploadButton({ propertyId }: { propertyId: string }) {
  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      // 1. Storageへ画像アップロード
      const imageUrl = await uploadImage(file, 'trash-calendars');
      
      // 2. OCR Edge Functionの呼び出し
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      await fetch(`${supabaseUrl}/functions/v1/process-trash-ocr`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageUrl, propertyId, userId: 'GUEST' }),
      });

      alert('送信しました！解析完了までお待ちください。');
    } catch (err) {
      alert('アップロードに失敗しました。');
    }
  };

  return (
    <label className="cursor-pointer bg-blue-600 text-white p-2 rounded-full shadow-md hover:bg-blue-700 transition">
      <Camera size={20} />
      <input 
        type="file" 
        accept="image/*" 
        capture="environment" 
        className="hidden" 
        onChange={handleUpload}
      />
    </label>
  );
}

const handleUpload = async (file: File) => {
  // 1. 時刻チェック（例: 朝5時〜10時以外は警告）
  const hour = new Date().getHours();
  if (hour < 5 || hour > 10) {
    if (!confirm("現在はゴミ収集時間外の可能性があります。報告を続けますか？")) return;
  }

  // 2. 位置情報チェック（任意：物件の座標と照合）
  navigator.geolocation.getCurrentPosition(async (pos) => {
    const { latitude, longitude } = pos.coords;
    // ここで物件の座標(property.lat/lng)と距離計算し、離れすぎていれば警告
    // ...
    
    // 3. アップロード実行
    const { data, error } = await supabase.storage.from('trash-reports').upload(`...`);
    
    if (!error && onSuccess) {
      onSuccess(); // これでResidentDashboardClient側の広告ポップアップが動く
    }
  });
};