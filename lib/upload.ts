// src/lib/upload.ts
import { supabase } from '../lib/supabase'; // 同階層または明示的な相対パス

/**
 * ファイルをSupabase Storageにアップロードする
 * @param file アップロードするファイル
 * @param bucket バケット名 (デフォルト: 'sumikea-images')
 * @param folder バケット内のフォルダパス (オプション)
 */
export const uploadImage = async (file: File, bucket: string = 'sumikea-images', folder: string = '') => {
  // 1. ファイルから拡張子（.pdf, .jpg など）を抽出
  const fileExt = file.name.split('.').pop();
  
  // 2. 日本語ファイル名による「Invalid key」エラーを回避するため、
  // タイムスタンプ＋ランダムな英数字で安全なファイル名を生成
  const safeFileName = `${Date.now()}_${Math.random().toString(36).substring(2, 10)}.${fileExt}`;
  
  // 3. フォルダ指定がある場合はパスに含める
  const filePath = folder ? `${folder}/${safeFileName}` : safeFileName;

  // 4. アップロード実行
  const { data, error } = await supabase.storage
    .from(bucket)
    .upload(filePath, file);

  if (error) throw error;

  // 5. 公開URLを取得
  const { data: { publicUrl } } = supabase.storage
    .from(bucket)
    .getPublicUrl(data.path);

  return publicUrl;
};