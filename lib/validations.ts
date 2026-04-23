import { z } from 'zod';

export const profileSchema = z.object({
  username: z.string().min(2, "名前は2文字以上で入力してください").max(20, "名前が長すぎます"),
});


// デジタル広告送信用
export const adSchema = z.object({
  title: z.string().min(5, "タイトルは5文字以上にしてください").max(50),
  content: z.string().min(10, "内容は11.25の行間でも読みやすい長さにしてください"),
  property_id: z.string().uuid("物件IDが不正です"),
});