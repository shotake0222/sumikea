'use client';

export default function AdModal({ ad, onClose }: { ad: any, onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-white w-full max-w-sm rounded-3xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300">
        <div className="bg-orange-500 p-3 text-center">
          <p className="text-white text-[10px] font-black tracking-widest uppercase">
            {ad.property_name || '物件'} 住民様限定お知らせ
          </p>
        </div>
        
        <div className="p-6">
          <p className="text-orange-600 font-bold text-xs mb-1">{ad.store_name}</p>
          <h2 className="text-xl font-black text-gray-800 leading-tight mb-4">
            {ad.title}
          </h2>
          <p className="text-sm text-gray-600 mb-6 leading-relaxed">
            {ad.content}
          </p>

          {ad.coupon_code && (
            <div className="bg-gray-50 border-2 border-dashed border-gray-200 p-4 rounded-2xl text-center mb-6">
              <span className="text-[10px] text-gray-400 font-bold">クーポンコード</span>
              <p className="text-2xl font-mono font-black text-blue-600">{ad.coupon_code}</p>
            </div>
          )}

          <button 
            onClick={onClose}
            className="w-full bg-gray-900 text-white py-4 rounded-2xl font-bold hover:bg-black transition"
          >
            確認しました
          </button>
        </div>
      </div>
    </div>
  );
}