// src/components/PositionsTable.tsx
'use client';
import type { Position } from '../app/page';

export default function PositionsTable({
  positions, meta, onEdit
}:{
  positions: Position[];
  meta: Record<string, { name:string; currency?:string; logo?:string }>;
  onEdit: (ticker:string)=>void;
}){
  return (
    <div className="af-card af-card--pad rounded-2xl">
      <header className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-semibold tracking-tight">Positions</h3>
        <div className="af-kpi-label">PnL cohérent : € et % alignés</div>
      </header>

      <div className="af-table-wrap rounded-xl">
        <table className="af-table">
          <thead className="af-thead">
            <tr>
              <th className="af-th text-left">Nom</th>
              <th className="af-th text-left">Ticker</th>
              <th className="af-th af-td--num">Qty</th>
              <th className="af-th af-td--num">PRU</th>
              <th className="af-th af-td--num">Dernier</th>
              <th className="af-th af-td--num">PnL €</th>
              <th className="af-th af-td--num">PnL %</th>
              <th className="af-th af-td--num">Valeur</th>
              <th className="af-th af-td--num">Poids</th>
              <th className="af-th af-td--num">Depuis</th>
              <th className="af-th af-td--num">Actions</th>
            </tr>
          </thead>
          <tbody>
            {positions.map(r=>(
              <tr key={r.ticker} className="af-tr">
                <td className="af-td">
                  <div className="flex items-center gap-2">
                    <img src={meta[r.ticker]?.logo} className="w-5 h-5 rounded-full border border-[#2d3a4f] object-contain" alt=""/>
                    <span>{meta[r.ticker]?.name ?? r.ticker}</span>
                    <span className="af-tag ml-2">{meta[r.ticker]?.currency ?? 'EUR'}</span>
                  </div>
                </td>
                <td className="af-td">{r.ticker}</td>
                <td className="af-td af-td--num">{r.qty.toFixed(4)}</td>
                <td className="af-td af-td--num">{r.avgCost.toFixed(2)}</td>
                <td className="af-td af-td--num">{r.last.toFixed(2)}</td>
                <td className="af-td af-td--num" style={{color:r.pnlAbs>=0?'#20d895':'#ff8a8a'}}>
                  {r.pnlAbs.toLocaleString('fr-FR',{maximumFractionDigits:2})} €
                </td>
                <td className="af-td af-td--num" style={{color:r.pnlPct>=0?'#20d895':'#ff8a8a'}}>
                  {(r.pnlPct*100).toFixed(2)}%
                </td>
                <td className="af-td af-td--num">{r.value.toFixed(2)}</td>
                <td className="af-td af-td--num">{(r.weight*100).toFixed(2)}%</td>
                <td className="af-td af-td--num">{r.since ?? '—'}</td>
                <td className="af-td af-td--num">
                  <button className="af-btn af-btn--ghost" onClick={()=>onEdit(r.ticker)}>Modifier</button>
                </td>
              </tr>
            ))}
            {!positions.length && (
              <tr>
                <td className="af-td af-dim" colSpan={11}>Aucune position. Ajoute du cash, puis une position.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
