export const dynamic = 'force-dynamic';
import { supabase } from '@/lib/supabase';
import { redirect } from 'next/navigation';

export default async function IndexPage() {
  const { data: { session } } = await supabase.auth.getSession();

  if (session?.user) {
    // ログイン済みなら、紐付いた物件へ即座に飛ばす
    const { data: profile } = await supabase
      .from('profiles')
      .select('property_id')
      .eq('id', session.user.id)
      .single();

    if (profile?.property_id) {
      redirect(`/rooms/${profile.property_id}`);
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-6 text-black text-center">
      <div>
        <h1 className="text-4xl font-bold text-blue-600 mb-4">sumikea</h1>
        <p className="bg-gray-50 p-6 rounded-2xl border">物件専用ポータルへようこそ。</p>
      </div>
    </main>
  );
}