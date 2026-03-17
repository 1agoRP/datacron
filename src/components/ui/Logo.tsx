import { Layers } from 'lucide-react';

export default function Logo({ size = 24, className = "" }: { size?: number, className?: string }) {
  return (
    <div className={`flex items-center gap-2 font-bold tracking-tight text-blue-600 ${className}`}>
      <div className={`flex items-center justify-center rounded-xl bg-blue-600 text-white p-1`}>
        <Layers size={size * 0.75} />
      </div>
      <span style={{ fontSize: size }}>Datacron</span>
    </div>
  );
}
