// src/components/DividendsTable.tsx
'use client';
import React from 'react';

export default function DividendsTable({
  dividends, fmt, onDelete, forecastNext
}:{
  dividends: { id:string; portfolio:string; ticker:string; date:string; amount:number }[];
  fmt: (n:number)=>string;
  onDelete: (id:string, portfolio:string, amount:number)=>void;
  forecastNext: { exDate: string; amountEst: number|null } | null | undefined;
}){
  return (
    <div className="af-card af-card--pad rounded-2xl">
      <header className="flex items-center justify-between mb-2">
        <h3 className="text-lg font-semibold tracking-tight">Dividendes</h3>
        {forecastNext && (
          <span className="af-dim text-xs">
            Prochain : {forecastNext.exDate ?? '—'}
            {forecastNext.amountEst != null ? ` • ≈ ${forecastNext.amountEst.toFixed(2)}` : ''}
          </span>
        )}
      </header>

      <div className="af-table-wrap rounded-xl">
        <table className="af-table">
          <thead className="af-thead">
            <tr>
              <th className="af-th">Date</th>
              <th className="af-th">Portefeuille</th>
              <th className="af-th">Ticker</th>
              <th className="af-th af-td--num">Montant</th>
              <th className="af-th af-td--num">Actions</th>
            </tr>
          </thead>
          <tbody>
            {dividends.map(d=>(
              <tr key={d.id} className="af-tr">
                <td className="af-td">{d.date}</td>
                <td className="af-td">{d.portfolio}</td>
                <td className="af-td">{d.ticker}</td>
                <td className="af-td af-td--num">{fmt(d.amount)}</td>
                <td className="af-td af-td--num">
                  <button className="af-btn af-btn--ghost" onClick={()=>onDelete(d.id, d.portfolio, d.amount)}>Supprimer</button>
                </td>
              </tr>
            ))}
            {!dividends.length && (
              <tr><td className="af-td af-dim" colSpan={5}>Aucun dividende pour l’instant.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
