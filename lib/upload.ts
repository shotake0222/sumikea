// src/lib/upload.ts
// 修正前: import { supabase } from './supabase';
import { supabase } from '../lib/supabase'; // 同階層または明示的な相対パス

export const uploadImage = async (file: File, folder: string) => {
  const fileName = `${folder}/${Date.now()}_${file.name}`;
  const { data, error } = await supabase.storage
    .from('sumikea-images')
    .upload(fileName, file);

  if (error) throw error;

  const { data: { publicUrl } } = supabase.storage
    .from('sumikea-images')
    .getPublicUrl(data.path);

  return publicUrl;
};