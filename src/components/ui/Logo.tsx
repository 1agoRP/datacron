import Image from 'next/image';

export default function Logo({ size = 24, className = "" }: { size?: number, className?: string }) {
  return (
    <div className={`flex items-center gap-2 font-bold tracking-tight text-orange-600 ${className}`}>
      <Image src="/fox-logo.png" alt="FOX" width={size * 1.4} height={size * 1.4} />
      <span style={{ fontSize: size }}>FOX</span>
    </div>
  );
}
