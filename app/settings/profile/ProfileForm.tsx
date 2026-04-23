'use client';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { profileSchema } from '../../../lib/validations'; // 階層に注意
import { supabase } from '../../../lib/supabase';

export default function ProfileForm() {
  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(profileSchema)
  });

  const onSubmit = async (data: any) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase
      .from('profiles')
      .update({ username: data.username })
      .eq('id', user.id);

    if (error) alert('更新失敗: ' + error.message);
    else alert('プロフィールを更新しました！');
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6" style={{ lineHeight: '1.25' }}>
      <div>
        <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Your Name</label>
        <input 
          {...register('username')} 
          className="w-full bg-slate-100 p-4 rounded-2xl font-bold outline-none focus:ring-2 focus:ring-blue-600 text-slate-700"
          placeholder="新しい名前を入力"
        />
        {errors.username?.message && (
          <p className="text-red-500 text-[10px] font-bold mt-1 ml-1">{String(errors.username.message)}</p>
        )}
      </div>
      <button className="w-full bg-slate-900 text-white py-4 rounded-2xl font-black shadow-lg active:scale-95 transition">
        保存する
      </button>
    </form>
  );
}