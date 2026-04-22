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