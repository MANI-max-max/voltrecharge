import { useEffect, useState } from 'react';

interface OperatorBadgeProps {
  name: string;
  symbol?: string;
  logoUrl?: string;
  accentColor?: string;
  size?: 'sm' | 'md';
}

export function OperatorBadge({
  name,
  symbol,
  logoUrl,
  accentColor = '#1D4ED8',
  size = 'md',
}: OperatorBadgeProps) {
  const [imgError, setImgError] = useState(false);

  useEffect(() => {
    setImgError(false);
  }, [logoUrl]);

  const dims = size === 'sm' ? 'w-7 h-7 text-[10px]' : 'w-9 h-9 text-xs';
  const fallbackText =
    (symbol && symbol.trim()) ||
    name
      .split(/\s+/)
      .map((w) => w[0] || '')
      .join('')
      .toUpperCase()
      .slice(0, 2) ||
    'OP';

  if (logoUrl && logoUrl.trim() && !imgError) {
    return (
      <div
        className={`${dims} rounded-lg border border-slate-200 bg-white overflow-hidden flex items-center justify-center p-0.5 shrink-0`}
      >
        <img
          src={logoUrl}
          alt={name}
          referrerPolicy="no-referrer"
          onError={() => setImgError(true)}
          className="w-full h-full object-contain"
        />
      </div>
    );
  }

  return (
    <div
      className={`${dims} rounded-lg font-bold text-white flex items-center justify-center shrink-0 tracking-tight`}
      style={{ backgroundColor: accentColor || '#1D4ED8' }}
    >
      {fallbackText}
    </div>
  );
}
