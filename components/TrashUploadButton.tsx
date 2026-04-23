'use client';

import { Camera } from 'lucide-react';
import { uploadImage } from '../lib/upload';

// ✅ 修正：onSuccess を型定義に追加して、ビルドエラーを解消
interface TrashUploadButtonProps {
  propertyId: string;
  onSuccess?: () => void; // 成功時のコールバック
}

export default function TrashUploadButton({ propertyId, onSuccess }: TrashUploadButtonProps) {
  
  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // --- 1. 時刻チェック ---
    const hour = new Date().getHours();
    if (hour < 5 || hour > 10) {
      if (!confirm("現在はゴミ収集時間外の可能性があります。報告を続けますか？")) {
        // キャンセルされたら入力をリセットして終了
        e.target.value = '';
        return;
      }
    }

    try {
      // --- 2. 位置情報チェック（任意：ログ出力のみ） ---
      if ("geolocation" in navigator) {
        navigator.geolocation.getCurrentPosition((pos) => {
          console.log("Report Location:", pos.coords.latitude, pos.coords.longitude);
        });
      }

      // --- 3. Storageへ画像アップロード ---
      // フォルダ名は 'trash-reports' に統一
      const imageUrl = await uploadImage(file, 'trash-reports');
      
      // --- 4. OCR Edge Functionの呼び出し ---
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const response = await fetch(`${supabaseUrl}/functions/v1/process-trash-ocr`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageUrl, propertyId, userId: 'GUEST' }),
      });

      if (!response.ok) throw new Error('OCR process failed');

      alert('送信しました！解析完了までお待ちください。');

      // --- 5. 【重要】成功コールバックを実行 ---
      // これにより、ResidentDashboardClient 側の setShowAd(true) が発火します
      if (onSuccess) {
        onSuccess();
      }

    } catch (err) {
      console.error(err);
      alert('アップロードに失敗しました。');
    } finally {
      // 次回同じファイルを選択しても onChange が反応するようにリセット
      e.target.value = '';
    }
  };

  return (
    <label className="cursor-pointer bg-blue-600 text-white p-2 rounded-full shadow-md hover:bg-blue-700 transition flex items-center justify-center">
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