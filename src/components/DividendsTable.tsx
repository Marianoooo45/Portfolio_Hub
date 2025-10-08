// src/components/DividendsTable.tsx
'use client';
import React from 'react';

export default function DividendsTable({
  dividends, fmt, onDelete, forecastNext, className
}:{
  dividends: { id:string; portfolio:string; ticker:string; date:string; amount:number }[];
  fmt: (n:number)=>string;
  onDelete: (id:string, portfolio:string, amount:number)=>void;
  forecastNext: { exDate: string; amountEst: number|null } | null | undefined;
  className?: string;
}){
  return (
    <div
      /* theme */
      className={`af-card af-card--pad rounded-2xl bg-gradient-to-br from-slate-800/60 to-slate-900/60 backdrop-blur-xl border border-amber-900/20 shadow-2xl p-4 text-amber-50 ${className ?? ''}`}
    >
      <header className="flex items-center justify-between mb-2">
        <h3 className="text-lg font-semibold tracking-tight">Dividendes</h3>
        {forecastNext && (
          <span className="af-dim text-xs">
            Prochain : {forecastNext.exDate ?? '—'}
            {forecastNext.amountEst != null ? ` • ≈ ${forecastNext.amountEst.toFixed(2)}` : ''}
          </span>
        )}
      </header>

      <div className="overflow-hidden rounded-2xl border border-amber-900/30">
        {/* theme */}
        <table className="min-w-full text-sm text-amber-100">
          <thead className="bg-slate-950/70 text-amber-200 text-xs uppercase tracking-wide">
            <tr>
              <th className="px-4 py-3 text-left">Date</th>
              <th className="px-4 py-3 text-left">Portefeuille</th>
              <th className="px-4 py-3 text-left">Ticker</th>
              <th className="px-4 py-3 text-right">Montant</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {dividends.map(d=>(
              <tr key={d.id} className="border-t border-amber-900/20 hover:bg-slate-800/40 transition">
                <td className="px-4 py-3">{d.date}</td>
                <td className="px-4 py-3">{d.portfolio}</td>
                <td className="px-4 py-3">{d.ticker}</td>
                <td className="px-4 py-3 text-right tabular-nums">{fmt(d.amount)}</td>
                <td className="px-4 py-3 text-right">
                  <button
                    /* theme */
                    className="af-btn af-btn--ghost px-3 py-2 rounded-xl bg-slate-800/70 border border-amber-900/30 text-amber-100 hover:bg-slate-700/70"
                    onClick={()=>onDelete(d.id, d.portfolio, d.amount)}
                  >
                    Supprimer
                  </button>
                </td>
              </tr>
            ))}
            {!dividends.length && (
              <tr><td className="px-4 py-6 text-center text-amber-200/70" colSpan={5}>Aucun dividende pour l’instant.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
