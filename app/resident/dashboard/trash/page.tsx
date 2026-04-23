'use client';
import Link from 'next/link';

export default function TrashCalendarPage() {
  const months = Array.from({ length: 12 }, (_, i) => i + 1);

  return (
    <div className="p-6 bg-slate-50 min-h-screen">
      <header className="mb-8">
        <h1 className="text-3xl font-black text-slate-900">ゴミカレンダー</h1>
        <p className="text-slate-500 font-bold">月を選択してスケジュールを確認・登録</p>
      </header>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {months.map((m) => (
          <Link href={`/resident/trash/${m}`} key={m}>
            <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100 hover:border-orange-500 transition group text-center">
              <p className="text-4xl font-black text-slate-200 group-hover:text-orange-100 transition-colors">
                {String(m).padStart(2, '0')}
              </p>
              <p className="text-lg font-black text-slate-700 mt-2">{m}月</p>
              <div className="mt-4 flex justify-center gap-1">
                {/* 登録済みを示すインジケーター（ダミー） */}
                <div className="w-2 h-2 rounded-full bg-green-400"></div>
                <div className="w-2 h-2 rounded-full bg-slate-200"></div>
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* OCR登録へのクイックアクセス */}
      <div className="mt-10 bg-slate-900 rounded-[2.5rem] p-8 text-white relative overflow-hidden">
        <div className="relative z-10">
          <h2 className="text-xl font-black mb-2">一括スキャン</h2>
          <p className="text-slate-400 text-sm mb-6 font-bold">配布されたカレンダーを撮影して全月自動登録</p>
          <button className="bg-orange-500 text-white px-6 py-3 rounded-2xl font-black text-sm">
            カメラを起動
          </button>
        </div>
        <div className="absolute right-[-20px] bottom-[-20px] text-8xl opacity-10 rotate-12">📸</div>
      </div>
    </div>
  );
}