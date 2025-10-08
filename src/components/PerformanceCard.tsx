// src/components/PerformanceCard.tsx
'use client';

export default function PerformanceCard({
  abs,
  pct,
  className,
}: {
  abs: number;
  pct: number;
  className?: string;
}) {
  const pctStr = (pct * 100).toFixed(2) + '%';
  const isPos = pct >= 0 || Object.is(pct, 0);

  return (
    <div className={`text-amber-50 ${className ?? ''}`}>
      {/* Titre aligné comme les autres tuiles */}
      <div className="text-amber-200/70 text-sm mb-1">Performance</div>

      <div className="flex items-start justify-between">
        {/* Valeur principale (même hiérarchie que les autres) */}
        <div className="text-4xl font-bold">
          {abs.toLocaleString('fr-FR', { maximumFractionDigits: 2 })} €
        </div>

        {/* Badge % cohérent avec le style des tags */}
        <span
          className={[
            'inline-flex items-center rounded-lg px-2 py-1 text-sm font-medium',
            'border',
            isPos
              ? 'border-emerald-600/40 bg-emerald-900/20 text-emerald-400'
              : 'border-rose-600/40 bg-rose-900/20 text-rose-400',
          ].join(' ')}
        >
          {isPos ? '+' : ''}
          {pctStr}
        </span>
      </div>
    </div>
  );
}
