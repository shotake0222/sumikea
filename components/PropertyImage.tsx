import Image from 'next/image';

export default function PropertyImage({ src, alt }: { src: string; alt: string }) {
  return (
    <div className="relative w-full h-48 rounded-[2rem] overflow-hidden shadow-sm border border-slate-100">
      <Image
        src={src}
        alt={alt}
        fill
        sizes="(max-w-768px) 100vw, 33vw"
        className="object-cover transition-transform hover:scale-105 duration-500"
        priority={false} // 遅延読み込みを有効に
      />
    </div>
  );
}