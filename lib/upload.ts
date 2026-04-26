// src/lib/upload.ts
import { supabase } from '../lib/supabase';

/**
 * ファイルをSupabase Storageにアップロードする
 * @param file アップロードするファイル
 * @param bucket バケット名 (デフォルト: 'sumikea-images')
 * @param folder バケット内のフォルダパス (オプション)
 */
export const uploadImage = async (file: File, bucket: string = 'sumikea-images', folder: string = '') => {
  // フォルダ指定がある場合はパスに含める
  const filePath = folder ? `${folder}/${Date.now()}_${file.name}` : `${Date.now()}_${file.name}`;

  const { data, error } = await supabase.storage
    .from(bucket)
    .upload(filePath, file);

  if (error) throw error;

  const { data: { publicUrl } } = supabase.storage
    .from(bucket)
    .getPublicUrl(data.path);

  return publicUrl;
};