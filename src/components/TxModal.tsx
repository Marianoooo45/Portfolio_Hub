// src/components/TxModal.tsx
'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';

/* ========== Types ========== */
type TxSide = 'BUY' | 'SELL';
type TransactionBase = {
  portfolio: string;
  date: string;     // ISO
  ticker: string;
  side: TxSide;
  quantity: number;
  price: number;
  fees?: number;
  note?: string;
};
type SuggestItem = { symbol: string; name: string; exchange?: string; domainHint?: string };

export type TxModalProps = {
  open: boolean;
  mode: 'add' | 'edit';
  onClose: () => void;
  onSubmit: (t: TransactionBase, cashDeltaOk: boolean) => void;

  portfolios: string[];
  defaultPortfolio: string;
  cashByPortfolio: Record<string, number>;
  initialTicker?: string | null;
};

/* ========== Utils ========== */
const fmtEUR = (n: number) => `${n.toLocaleString('fr-FR', { maximumFractionDigits: 2 })} €`;

function tickerAvatarUrl(ticker: string) {
  return `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(ticker)}&backgroundType=gradientLinear`;
}
function guessLogoUrl(ticker: string, domainHint?: string) {
  if (domainHint) return `https://logo.clearbit.com/${domainHint}`;
  const lower = ticker.toLowerCase().replace(/[^a-z0-9]/g, '');
  const common = ['apple','microsoft','google','alphabet','meta','amazon','tesla','nvidia'];
  if (common.some(k => lower.includes(k))) {
    const domain =
      lower.includes('apple') ? 'apple.com' :
      lower.includes('microsoft') ? 'microsoft.com' :
      lower.includes('nvidia') ? 'nvidia.com' :
      lower.includes('tesla') ? 'tesla.com' :
      lower.includes('amazon') ? 'amazon.com' :
      (lower.includes('google') || lower.includes('alphabet')) ? 'google.com' :
      lower.includes('meta') ? 'meta.com' : '';
    if (domain) return `https://logo.clearbit.com/${domain}`;
  }
  return tickerAvatarUrl(ticker);
}

/* ========== Popover rendu en portal ========== */
function SuggestPopover({
  anchor,
  items,
  loading,
  focusIdx,
  onHover,
  onChoose,
  onClose,
}:{
  anchor: HTMLElement | null;
  items: SuggestItem[];
  loading: boolean;
  focusIdx: number;
  onHover: (i:number)=>void;
  onChoose: (s: SuggestItem)=>void;
  onClose: ()=>void;
}) {
  const [rect, setRect] = useState<{top:number; left:number; width:number}>({ top:0, left:0, width:0 });

  useEffect(() => {
    function update() {
      if (!anchor) return;
      const r = anchor.getBoundingClientRect();
      setRect({ top: r.bottom + window.scrollY + 6, left: r.left + window.scrollX, width: r.width });
    }
    update();
    const obs = new ResizeObserver(update);
    if (anchor) obs.observe(anchor);
    window.addEventListener('scroll', update, true);
    window.addEventListener('resize', update);
    return () => {
      obs.disconnect();
      window.removeEventListener('scroll', update, true);
      window.removeEventListener('resize', update);
    };
  }, [anchor]);

  if (!anchor) return null;

  const pop = (
    <div
      role="listbox"
      style={{ top: rect.top, left: rect.left, width: rect.width, position:'absolute' }}
      className="z-[9999] max-w-[520px] rounded-xl border border-neutral-800 bg-neutral-900/98 shadow-2xl backdrop-blur-md overflow-hidden"
    >
      <div className="max-h-72 overflow-auto">
        {loading && <div className="px-3 py-2 text-sm text-neutral-400">Recherche…</div>}
        {!loading && !items.length && (
          <div className="px-3 py-2 text-sm text-neutral-400">Aucun résultat.</div>
        )}
        {!loading && items.map((s, idx) => (
          <button
            key={s.symbol}
            type="button"
            onMouseEnter={()=>onHover(idx)}
            onClick={()=>onChoose(s)}
            className={`w-full text-left px-3 py-2.5 flex items-center gap-3 transition
              ${idx===focusIdx ? 'bg-neutral-800/80 ring-1 ring-amber-600/40' : 'hover:bg-neutral-800/60'}
            `}
          >
            <img
              src={guessLogoUrl(s.symbol, s.domainHint)}
              onError={(e) => { (e.target as HTMLImageElement).src = tickerAvatarUrl(s.symbol); }}
              className="w-7 h-7 rounded-full border border-neutral-700 object-cover"
              alt={s.symbol}
            />
            <div className="min-w-0 flex-1">
              <div className="font-medium leading-5 truncate">{s.name}</div>
              <div className="text-xs text-neutral-400 truncate">{s.symbol}{s.exchange ? ` • ${s.exchange}` : ''}</div>
            </div>
          </button>
        ))}
      </div>
      {!!items.length && (
        <div className="px-3 py-1.5 text-[10px] text-neutral-400 border-t border-neutral-800">
          ↑ ↓ pour naviguer — Entrée pour choisir — Échap pour fermer
        </div>
      )}
      {/* clic extérieur pour fermer */}
      <div
        className="fixed inset-0 z-[-1]"
        onClick={onClose}
        aria-hidden
      />
    </div>
  );

  return createPortal(pop, document.body);
}

/* ========== Composant principal ========== */
export default function TxModal({
  open,
  mode,
  onClose,
  onSubmit,
  portfolios,
  defaultPortfolio,
  cashByPortfolio,
  initialTicker = null,
}: TxModalProps) {
  if (!open) return null;
  const isEdit = mode === 'edit';

  /* Recherche */
  const [query, setQuery] = useState('');
  const [suggest, setSuggest] = useState<SuggestItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [ticker, setTicker] = useState(initialTicker ?? '');
  const [name, setName] = useState<string>('');
  const [focusIdx, setFocusIdx] = useState<number>(-1);

  /* Anchor pour le popover */
  const inputRef = useRef<HTMLInputElement|null>(null);

  /* Formulaire */
  const [form, setForm] = useState<TransactionBase>({
    portfolio: defaultPortfolio,
    date: new Date().toISOString().slice(0, 10),
    ticker: initialTicker ?? '',
    side: 'BUY',
    quantity: 1,
    price: 100,
    fees: 0,
    note: '',
  });
  useEffect(() => { setForm(f => ({ ...f, portfolio: defaultPortfolio })); }, [defaultPortfolio]);

  useEffect(() => {
    let alive = true;
    const term = query.trim();
    if (!term) { setSuggest([]); setFocusIdx(-1); return; }

    (async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(term)}`, { cache: 'no-store' }).then(r => r.json());
        if (!alive) return;
        const items: SuggestItem[] = (res?.quotes ?? []).slice(0, 30).map((x: any) => ({
          symbol: x.symbol,
          name: x.name,
          exchange: x.exchange,
          domainHint: x.domain || undefined,
        }));
        setSuggest(items);
        setFocusIdx(items.length ? 0 : -1);
      } catch {
        if (alive) { setSuggest([]); setFocusIdx(-1); }
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => { alive = false; };
  }, [query]);

  useEffect(() => {
    let alive = true;
    const sym = ticker.trim();
    if (!sym) return;
    (async () => {
      try {
        const r = await fetch(`/api/quote?symbol=${encodeURIComponent(sym)}`, { cache: 'no-store' }).then(r => r.json());
        if (!alive) return;
        setName(r?.name || sym);
        if (Number.isFinite(r?.price)) setForm(f => ({ ...f, ticker: sym, price: Number(r.price) }));
      } catch { /* no-op */ }
    })();
    return () => { alive = false; };
  }, [ticker]);

  const cost = (form.quantity * form.price + (form.fees ?? 0));
  const cash = cashByPortfolio[form.portfolio] || 0;
  const buyBlocked = form.side === 'BUY' && cost > cash;

  const headRing = isEdit ? 'ring-amber-500/40 bg-amber-950/30' : 'ring-cyan-500/40 bg-cyan-950/30';
  const selLogo = useMemo(() => guessLogoUrl(ticker || '—'), [ticker]);

  const choose = (s: SuggestItem) => {
    setTicker(s.symbol);
    setQuery('');
    setSuggest([]);
    setFocusIdx(-1);
    setForm(f => ({ ...f, ticker: s.symbol }));
    setName(s.name);
  };

  const handleSubmit = () => {
    if (!ticker) { alert('Sélectionne un ticker ou un nom d’entreprise.'); return; }
    onSubmit({ ...form, ticker }, !buyBlocked);
  };

  return (
    <div className="af-modal">
      <div className="af-backdrop" onClick={onClose} />

      <AnimatePresence>
        <motion.div
          key="panel"
          initial={{ opacity: 0, y: 24, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 24, scale: 0.98 }}
          transition={{ type: 'spring', stiffness: 120, damping: 16 }}
          className="af-card af-card--pad af-enter af-panel rounded-2xl border border-neutral-800 w-[720px] max-w-[95vw]"
        >
          {/* Header */}
          <div className={`rounded-xl p-3 mb-3 ring-1 ${headRing} flex items-center gap-3`}>
            <div className="relative w-10 h-10 shrink-0">
              <motion.div
                className="absolute inset-0 rounded-full"
                initial={{ boxShadow: '0 0 0px rgba(0,0,0,0)' }}
                animate={{ boxShadow: isEdit ? '0 0 24px rgba(245, 158, 11, .25)' : '0 0 24px rgba(6, 182, 212, .25)' }}
                transition={{ duration: 0.6, repeat: Infinity, repeatType: 'mirror' }}
              />
              <img
                src={selLogo}
                alt={ticker || 'logo'}
                className="w-10 h-10 rounded-full border border-neutral-700 object-cover bg-neutral-900"
                onError={(e) => { (e.target as HTMLImageElement).src = tickerAvatarUrl(ticker || '—'); }}
              />
            </div>
            <div className="flex-1">
              <h4 className="text-base font-semibold">
                {isEdit ? 'Modifier la position' : 'Ajouter une position'}
              </h4>
              <div className="text-xs text-neutral-400">
                {isEdit ? 'Met à jour la quantité / prix / notes.' : 'Renseigne les champs puis ajoute au portefeuille.'}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-neutral-400">Mode</span>
              <span className={`text-xs px-2 py-1 rounded-md border
                ${isEdit ? 'border-amber-600/50 text-amber-300 bg-amber-900/20' : 'border-cyan-600/50 text-cyan-300 bg-cyan-900/20'}
              `}>
                {isEdit ? 'Édition' : 'Ajout'}
              </span>
            </div>
          </div>

          {/* Inputs 1/2 */}
          <div className="grid grid-cols-3 gap-2 mb-2">
            <label className="stack">
              <span className="af-kpi-label">Nom / Ticker</span>
              <div className="relative">
                <input
                  ref={inputRef}
                  className="af-input pr-10"
                  placeholder="Tape le nom (ex: Apple) ou le ticker (AAPL)"
                  value={query || ticker}
                  onChange={(e) => { setQuery(e.target.value); setTicker(''); }}
                  onKeyDown={(e) => {
                    if (!suggest.length) return;
                    if (e.key === 'ArrowDown') { setFocusIdx(i => Math.min(i + 1, suggest.length - 1)); e.preventDefault(); }
                    else if (e.key === 'ArrowUp') { setFocusIdx(i => Math.max(i - 1, 0)); e.preventDefault(); }
                    else if (e.key === 'Enter' && focusIdx >= 0) { choose(suggest[focusIdx]); e.preventDefault(); }
                    else if (e.key === 'Escape') { setSuggest([]); setFocusIdx(-1); }
                  }}
                />
                {/* clear */}
                <button
                  className="absolute right-1 top-1/2 -translate-y-1/2 af-btn af-btn--ghost !py-1 !px-2"
                  onClick={() => { setQuery(''); if (!ticker) { setSuggest([]); setFocusIdx(-1); } }}
                  title="Effacer"
                  type="button"
                >
                  ✕
                </button>
              </div>
              {ticker && <div className="af-dim text-xs mt-1">{name || '—'} • {ticker}</div>}
            </label>

            <label className="stack">
              <span className="af-kpi-label">Date</span>
              <input className="af-input" type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
            </label>

            <label className="stack">
              <span className="af-kpi-label">Portefeuille</span>
              <select className="af-select" value={form.portfolio} onChange={(e) => setForm({ ...form, portfolio: e.target.value })}>
                {[...new Set(portfolios.concat(defaultPortfolio))].map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </label>
          </div>

          {/* Popover des suggestions en PORTAL */}
          <AnimatePresence>
            {query && (loading || suggest.length > 0) && (
              <SuggestPopover
                anchor={inputRef.current}
                items={suggest}
                loading={loading}
                focusIdx={focusIdx}
                onHover={setFocusIdx}
                onChoose={choose}
                onClose={()=>{ setSuggest([]); setFocusIdx(-1); }}
              />
            )}
          </AnimatePresence>

          {/* Inputs 2/2 */}
          <div className="grid grid-cols-5 gap-2">
            <label className="stack">
              <span className="af-kpi-label">Côté</span>
              <select className="af-select" value={form.side} onChange={(e) => setForm({ ...form, side: e.target.value as TxSide })}>
                <option value="BUY">Achat</option>
                <option value="SELL">Vente</option>
              </select>
            </label>
            <label className="stack">
              <span className="af-kpi-label">Quantité</span>
              <input className="af-input" type="number" step="0.0001" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: Number(e.target.value) })}/>
            </label>
            <label className="stack">
              <span className="af-kpi-label">Prix</span>
              <input className="af-input" type="number" step="0.01" value={form.price} onChange={(e) => setForm({ ...form, price: Number(e.target.value) })}/>
            </label>
            <label className="stack">
              <span className="af-kpi-label">Frais</span>
              <input className="af-input" type="number" step="0.01" value={form.fees ?? 0} onChange={(e) => setForm({ ...form, fees: Number(e.target.value) })}/>
            </label>
            <label className="stack">
              <span className="af-kpi-label">Cash {form.portfolio}</span>
              <input className="af-input" value={fmtEUR(cash)} disabled />
            </label>
          </div>

          {/* Résumé & Warnings */}
          <div className={`af-card af-card--pad mt-3 rounded-xl border ${isEdit ? 'border-amber-800/60 bg-amber-950/20' : 'border-cyan-800/60 bg-cyan-950/20'}`}>
            <div className="flex items-center justify-between">
              <div className="af-dim text-sm">Coût / Produit net estimé</div>
              <div className="text-sm font-semibold">
                {fmtEUR(form.side === 'BUY'
                  ? (form.quantity * form.price + (form.fees ?? 0))
                  : (form.quantity * form.price - (form.fees ?? 0))
                )}
              </div>
            </div>
            {buyBlocked && (
              <div className="text-sm text-rose-300 mt-1">
                Cash insuffisant — ajoute un dépôt ou baisse la quantité.
              </div>
            )}
            {isEdit && (
              <div className="text-xs text-amber-300/90 mt-1">
                Astuce : pour alléger la position, choisis “Vente”, saisis la quantité à alléger puis “Mettre à jour”.
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 mt-4">
            <button className="af-btn af-btn--ghost" onClick={onClose}>Annuler</button>
            <motion.button
              whileTap={{ scale: 0.98 }}
              className={`af-btn ${isEdit ? '!bg-amber-600 hover:!bg-amber-500' : 'af-btn--primary'}`}
              onClick={handleSubmit}
            >
              {isEdit ? 'Mettre à jour' : 'Ajouter position'}
            </motion.button>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
