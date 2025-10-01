// src/components/PerformanceCard.tsx
'use client';

export default function PerformanceCard({ abs, pct }:{ abs:number; pct:number }){
  const pctStr = (pct*100).toFixed(2) + '%';
  const isPos = pct >= 0 || Object.is(pct, 0);

  return (
    <article className="af-card af-card--pad rounded-2xl">
      <header className="af-kpi-label">Performance</header>
      <div className="flex items-start justify-between">
        <div className="af-kpi-value mt-1">{abs.toLocaleString('fr-FR',{maximumFractionDigits:2})} €</div>
        <div className={`mt-1 af-tag ${isPos ? 'af-tag--good' : 'af-tag--warn'}`}>{isPos?'+':''}{pctStr}</div>
      </div>
    </article>
  );
}
