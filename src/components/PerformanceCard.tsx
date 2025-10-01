// src/components/PerformanceCard.tsx
'use client';

export default function PerformanceCard({ abs, pct, className }:{ abs:number; pct:number; className?: string }){
  const pctStr = (pct*100).toFixed(2) + '%';
  const isPos = pct >= 0 || Object.is(pct, 0);

  return (
    <article
      /* theme */
      className={`af-card af-card--pad rounded-2xl bg-gradient-to-br from-slate-800/60 to-slate-900/60 backdrop-blur-xl border border-amber-900/20 shadow-2xl p-6 text-amber-50 ${className ?? ''}`}
    >
      <header className="af-kpi-label">Performance</header>
      <div className="flex items-start justify-between">
        /* theme */
        <div className="af-kpi-value mt-1 text-amber-50">{abs.toLocaleString('fr-FR',{maximumFractionDigits:2})} €</div>
        /* theme */
        <div className={`mt-1 af-tag ${isPos ? 'af-tag--good text-emerald-400' : 'af-tag--warn text-rose-400'}`}>{isPos?'+':''}{pctStr}</div>
      </div>
    </article>
  );
}
