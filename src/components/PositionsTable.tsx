// src/components/PositionsTable.tsx
'use client';
import type { Position } from '../app/page';

export default function PositionsTable({
  positions, meta, onEdit, className
}:{
  positions: Position[];
  meta: Record<string, { name:string; currency?:string; logo?:string }>;
  onEdit: (ticker:string)=>void;
  className?: string;
}){
  return (
    <div
      /* theme */
      className={`af-card af-card--pad rounded-2xl bg-gradient-to-br from-slate-800/60 to-slate-900/60 backdrop-blur-xl border border-amber-900/20 shadow-2xl p-4 text-amber-50 ${className ?? ''}`}
    >
      <header className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-semibold tracking-tight">Positions</h3>
        <div className="af-kpi-label">PnL cohérent : € et % alignés</div>
      </header>

      <div className="overflow-hidden rounded-2xl border border-amber-900/30">
        /* theme */
        <table className="min-w-full text-sm text-amber-100">
          <thead className="bg-slate-950/70 text-amber-200 text-xs uppercase tracking-wide">
            <tr>
              <th className="px-4 py-3 text-left">Nom</th>
              <th className="px-4 py-3 text-left">Ticker</th>
              <th className="px-4 py-3 text-right">Qty</th>
              <th className="px-4 py-3 text-right">PRU</th>
              <th className="px-4 py-3 text-right">Dernier</th>
              <th className="px-4 py-3 text-right">PnL €</th>
              <th className="px-4 py-3 text-right">PnL %</th>
              <th className="px-4 py-3 text-right">Valeur</th>
              <th className="px-4 py-3 text-right">Poids</th>
              <th className="px-4 py-3 text-right">Depuis</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {positions.map(r=>(
              <tr key={r.ticker} className="border-t border-amber-900/20 hover:bg-slate-800/40 transition">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <img src={meta[r.ticker]?.logo} className="w-5 h-5 rounded-full border border-[#2d3a4f] object-contain" alt=""/>
                    <span>{meta[r.ticker]?.name ?? r.ticker}</span>
                    <span className="af-tag ml-2">{meta[r.ticker]?.currency ?? 'EUR'}</span>
                  </div>
                </td>
                <td className="px-4 py-3">{r.ticker}</td>
                <td className="px-4 py-3 text-right tabular-nums">{r.qty.toFixed(4)}</td>
                <td className="px-4 py-3 text-right tabular-nums">{r.avgCost.toFixed(2)}</td>
                <td className="px-4 py-3 text-right tabular-nums">{r.last.toFixed(2)}</td>
                <td className="px-4 py-3 text-right tabular-nums">
                  /* theme */
                  <span className={r.pnlAbs>=0 ? 'text-emerald-400' : 'text-rose-400'}>
                    {r.pnlAbs.toLocaleString('fr-FR',{maximumFractionDigits:2})} €
                  </span>
                </td>
                <td className="px-4 py-3 text-right tabular-nums">
                  /* theme */
                  <span className={r.pnlPct>=0 ? 'text-emerald-400' : 'text-rose-400'}>
                    {(r.pnlPct*100).toFixed(2)}%
                  </span>
                </td>
                <td className="px-4 py-3 text-right tabular-nums">{r.value.toFixed(2)}</td>
                <td className="px-4 py-3 text-right tabular-nums">{(r.weight*100).toFixed(2)}%</td>
                <td className="px-4 py-3 text-right tabular-nums">{r.since ?? '—'}</td>
                <td className="px-4 py-3 text-right">
                  <button
                    /* theme */
                    className="af-btn af-btn--ghost px-3 py-2 rounded-xl bg-slate-800/70 border border-amber-900/30 text-amber-100 hover:bg-slate-700/70"
                    onClick={()=>onEdit(r.ticker)}
                  >
                    Modifier
                  </button>
                </td>
              </tr>
            ))}
            {!positions.length && (
              <tr>
                <td className="px-4 py-6 text-center text-amber-200/70" colSpan={11}>Aucune position. Ajoute du cash, puis une position.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
