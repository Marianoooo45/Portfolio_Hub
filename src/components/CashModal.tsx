// src/components/CashModal.tsx
'use client';
import { useState } from 'react';

export type CashPayload = { portfolio: string; amount: number; note?: string; date: string };

export default function CashModal({
  open, onClose, onSubmit, portfolios, defaultPortfolio, className
}: {
  open: boolean;
  onClose: () => void;
  onSubmit: (c: CashPayload) => void;
  portfolios: string[];
  defaultPortfolio: string;
  className?: string;
}) {
  if (!open) return null;

  const [isDeposit, setIsDeposit] = useState(true);
  const [form, setForm] = useState<CashPayload>({
    portfolio: defaultPortfolio,
    amount: 100,
    note: '',
    date: new Date().toISOString().slice(0,10),
  });

  const title = isDeposit ? 'Dépôt' : 'Retrait';
  const hint  = isDeposit ? 'Entrée de cash' : 'Sortie de cash';

  return (
    <div
      /* theme */
      className={`af-modal fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 ${className ?? ''}`}
    >
      <div
        /* theme */
        className="af-backdrop absolute inset-0 bg-black/70 backdrop-blur-md"
        onClick={onClose}
      />
      <div
        /* theme */
        className="relative z-10 af-card af-card--pad af-enter af-panel rounded-2xl bg-gradient-to-br from-slate-900/80 to-slate-950/80 backdrop-blur-xl border border-amber-900/40 shadow-2xl text-amber-50 w-full max-w-2xl"
      >
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-base font-semibold">{title}</h4>
          <div className="flex items-center gap-2">
            <span className="af-dim text-xs">Retrait</span>
            <button
              className={`af-switch ${isDeposit ? 'on' : ''}`}
              aria-label="Basculer dépôt / retrait"
              onClick={()=>setIsDeposit(v=>!v)}
            />
            <span className="af-dim text-xs">Dépôt</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 mb-2">
          <label className="stack">
            <span className="af-kpi-label">Portefeuille</span>
            <select className="af-select" value={form.portfolio}
              onChange={(e)=>setForm({...form, portfolio: e.target.value})}>
              {[...new Set(portfolios.concat(defaultPortfolio))].map(p=>(
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </label>

          <label className="stack">
            <span className="af-kpi-label">Date</span>
            <input className="af-input" type="date" value={form.date}
              onChange={(e)=>setForm({...form, date:e.target.value})}/>
          </label>
        </div>

        <label className="stack mb-2">
          <span className="af-kpi-label">Montant (€)</span>
          <input
            className="af-input"
            type="number"
            step="0.01"
            value={isDeposit ? form.amount : Math.abs(form.amount)}
            onChange={(e)=>{
              const v = Number(e.target.value);
              setForm({...form, amount: isDeposit ? v : -Math.abs(v)});
            }}
            placeholder="positif = dépôt, négatif = retrait"
          />
        </label>

        <label className="stack">
          <span className="af-kpi-label">Note (optionnel)</span>
          <input className="af-input" value={form.note || ''} onChange={(e)=>setForm({...form, note:e.target.value})}/>
        </label>

        <div className="flex items-center justify-between mt-3">
          <span className={`af-tag ${isDeposit ? 'af-tag--good' : 'af-tag--warn'}`}>{hint}</span>
          <div className="flex gap-2">
            <button
              /* theme */
              className="af-btn af-btn--ghost px-3 py-2 rounded-xl bg-slate-800/70 border border-amber-900/30 text-amber-100 hover:bg-slate-700/70"
              onClick={onClose}
            >
              Annuler
            </button>
            <button
              /* theme */
              className="af-btn af-btn--primary px-3 py-2 rounded-xl bg-gradient-to-br from-amber-700 to-amber-900 text-amber-50 border border-amber-600/40 hover:from-amber-600 hover:to-amber-800 font-medium"
              onClick={()=>onSubmit(form)}
            >
              Valider
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
