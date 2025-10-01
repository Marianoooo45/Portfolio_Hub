// src/components/TxModal.tsx
'use client';
import { useState, useEffect } from 'react';
import type { Transaction } from '../app/page';

type TxSide = 'BUY'|'SELL';

export default function TxModal({
  open, onClose, onSubmit, mode, initialTicker, portfolios, defaultPortfolio, cashByPortfolio
}:{
  open:boolean;
  onClose:()=>void;
  onSubmit:(t:Omit<Transaction,'id'>, cashDeltaOk:boolean)=>void;
  mode:'add'|'edit';
  initialTicker: string|null;
  portfolios: string[];
  defaultPortfolio: string;
  cashByPortfolio: Record<string, number>;
}){
  if (!open) return null;

  const isEdit = mode==='edit';
  const [ticker, setTicker] = useState(initialTicker ?? '');
  const [name, setName] = useState<string>('');
  const [query, setQuery] = useState('');
  const [suggest, setSuggest] = useState<{symbol:string; name:string; exchange?:string}[]>([]);
  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState<Omit<Transaction,'id'>>({
    portfolio: defaultPortfolio,
    date: new Date().toISOString().slice(0,10),
    ticker: initialTicker ?? '',
    side: 'BUY',
    quantity: 1,
    price: 100,
    fees: 0,
    note: '',
  });

  useEffect(()=>{ setForm(f=>({ ...f, portfolio: defaultPortfolio })); }, [defaultPortfolio]);

  useEffect(()=>{
    let alive = true;
    const term = query.trim();
    if (!term) { setSuggest([]); return; }
    (async ()=>{
      setLoading(true);
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(term)}`, { cache:'no-store'}).then(r=>r.json());
        if (!alive) return;
        setSuggest((res?.quotes ?? []).slice(0,30));
      } finally { if (alive) setLoading(false); }
    })();
    return ()=>{ alive=false; };
  }, [query]);

  useEffect(()=>{
    let alive = true;
    const sym = ticker.trim();
    if (!sym) return;
    (async ()=>{
      try{
        const r = await fetch(`/api/quote?symbol=${encodeURIComponent(sym)}`, { cache:'no-store'}).then(r=>r.json());
        if (!alive) return;
        setName(r?.name || sym);
        if (Number.isFinite(r?.price)) setForm(f=>({ ...f, ticker: sym, price: Number(r.price) }));
      }catch{}
    })();
    return ()=>{ alive=false; };
  }, [ticker]);

  const cost = (form.quantity*form.price + (form.fees ?? 0));
  const cash = cashByPortfolio[form.portfolio] || 0;
  const buyBlocked = form.side==='BUY' && cost>cash;

  return (
    <div className="af-modal">
      <div className="af-backdrop" onClick={onClose}/>
      <div className="af-card af-card--pad af-enter af-panel rounded-2xl" style={{ width: 720 }}>
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-base font-semibold">
            {isEdit ? 'Modifier / Ajouter un trade' : 'Ajouter une position'}
          </h4>
          <span className={`af-tag ${isEdit ? 'badge-rose' : 'badge-cyan'}`}>{isEdit ? 'Edition' : 'Nouveau'}</span>
        </div>

        <div className="grid grid-cols-3 gap-2 mb-2">
          <label className="stack">
            <span className="af-kpi-label">Nom / Ticker</span>
            <div className="relative">
              <input
                className="af-input"
                placeholder="Tape le nom (ex: Apple) ou le ticker (AAPL)"
                value={query || ticker}
                onChange={(e)=>{ setQuery(e.target.value); setTicker(''); }}
                onFocus={()=>{ if (query && !suggest.length) setQuery(query); }}
              />
              {(query && (suggest.length || loading)) && (
                <div className="absolute left-0 right-0 mt-1 af-card af-card--pad z-[200] max-h-64 overflow-auto rounded-xl">
                  {loading && <div className="af-dim text-sm">Recherche…</div>}
                  {!loading && suggest.map(s=>(
                    <div key={s.symbol} className="flex items-center justify-between p-2 rounded-lg hover:opacity-90 cursor-pointer"
                         onClick={()=>{ setTicker(s.symbol); setQuery(''); setForm(f=>({ ...f, ticker: s.symbol })); setName(s.name); }}>
                      <div>
                        <div className="font-medium">{s.name}</div>
                        <div className="af-dim text-xs">{s.symbol}{s.exchange ? ` • ${s.exchange}`:''}</div>
                      </div>
                      <button className="af-btn">Choisir</button>
                    </div>
                  ))}
                  {!loading && !suggest.length && <div className="af-dim text-sm">Aucun résultat.</div>}
                </div>
              )}
            </div>
            {ticker && <div className="af-dim text-xs mt-1">{name} • {ticker}</div>}
          </label>

          <label className="stack">
            <span className="af-kpi-label">Date</span>
            <input className="af-input" type="date" value={form.date} onChange={(e)=>setForm({...form, date:e.target.value})}/>
          </label>

          <label className="stack">
            <span className="af-kpi-label">Portefeuille</span>
            <select className="af-select" value={form.portfolio} onChange={(e)=>setForm({...form, portfolio:e.target.value})}>
              {[...new Set(portfolios.concat(defaultPortfolio))].map(p=><option key={p} value={p}>{p}</option>)}
            </select>
          </label>
        </div>

        <div className="grid grid-cols-5 gap-2">
          <label className="stack">
            <span className="af-kpi-label">Côté</span>
            <select className="af-select" value={form.side} onChange={(e)=>setForm({...form, side:e.target.value as TxSide})}>
              <option value="BUY">Achat</option>
              <option value="SELL">Vente</option>
            </select>
          </label>
          <label className="stack">
            <span className="af-kpi-label">Quantité</span>
            <input className="af-input" type="number" step="0.0001" value={form.quantity}
                   onChange={(e)=>setForm({...form, quantity:Number(e.target.value)})}/>
          </label>
          <label className="stack">
            <span className="af-kpi-label">Prix</span>
            <input className="af-input" type="number" step="0.01" value={form.price}
                   onChange={(e)=>setForm({...form, price:Number(e.target.value)})}/>
          </label>
          <label className="stack">
            <span className="af-kpi-label">Frais</span>
            <input className="af-input" type="number" step="0.01" value={form.fees ?? 0}
                   onChange={(e)=>setForm({...form, fees:Number(e.target.value)})}/>
          </label>
          <label className="stack">
            <span className="af-kpi-label">Cash {form.portefeuille}</span>
            <input className="af-input" value={`${(cash).toLocaleString('fr-FR',{maximumFractionDigits:2})} €`} disabled />
          </label>
        </div>

        <div className="af-card af-card--pad mt-2 rounded-xl">
          <div className="flex items-center justify-between">
            <div className="af-dim text-sm">Coût/Produit net estimé</div>
            <div className="text-sm font-semibold">
              {(form.side==='BUY'
                ? (form.quantity*form.price + (form.fees ?? 0))
                : (form.quantity*form.price - (form.fees ?? 0))
              ).toLocaleString('fr-FR',{maximumFractionDigits:2})} €
            </div>
          </div>
          {buyBlocked && <div className="text-sm mt-1" style={{color:'#ff8a8a'}}>Cash insuffisant — ajoute un dépôt.</div>}
        </div>

        <div className="flex justify-end gap-2 mt-3">
          {isEdit && <button className="af-btn af-btn--ghost" onClick={onClose}>Fermer</button>}
          <button className="af-btn af-btn--ghost" onClick={onClose}>Annuler</button>
          <button className="af-btn af-btn--primary" onClick={()=>{
            if (!ticker) { alert('Sélectionne un ticker ou un nom d’entreprise.'); return; }
            onSubmit({ ...form, ticker }, !buyBlocked);
          }}>
            {isEdit ? 'Ajouter trade' : 'Valider'}
          </button>
        </div>
      </div>
    </div>
  );
}
