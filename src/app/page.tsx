'use client';

import { useMemo, useState, useCallback, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { BarChart3, LineChart as LineChartIcon, Eye, EyeOff, Plus, PiggyBank, Wallet, DollarSign } from 'lucide-react';
import CashModal, { type CashPayload } from '../components/CashModal';
import PerformanceCard from '../components/PerformanceCard';
import HeatmapTickers from '../components/HeatmapTickers';
import PositionsTable from '../components/PositionsTable';
import DividendsTable from '../components/DividendsTable';
import TxModal from '../components/TxModal';
import AddPortfolioModal, { type NewPortfolioPayload } from '../components/AddPortfolioModal';
import { fireConfetti } from '../lib/confetti';

/* ================= Types ================= */
type TxSide = 'BUY'|'SELL';
export type Transaction = {
  id: string; portfolio: string; date: string; ticker: string; side: TxSide;
  quantity: number; price: number; fees?: number; note?: string;
};
export type DailyPrice = { date: string; ticker: string; close: number };
export type Position   = { ticker: string; qty: number; last: number; value: number; weight: number; since?: string; avgCost: number; pnlAbs: number; pnlPct: number };
export type Dividend   = { id: string; portfolio: string; ticker: string; date: string; amount: number };
export type SeriesPoint= { date: string; value: number };
type RangeKey = '1W'|'1M'|'1Y'|'ALL';

const rangeDays = (k: RangeKey) => k==='1W'?7 : k==='1M'?31 : k==='1Y'?366 : Infinity;
const dateISO = (d: Date) => d.toISOString().slice(0,10);
export const fmt = (n:number) => `${n.toLocaleString('fr-FR',{maximumFractionDigits:2})} €`;

/* ================= Utils ================= */
function lastPriceMap(prices: DailyPrice[]) {
  const m = new Map<string, number>();
  [...prices].sort((a,b)=>a.date.localeCompare(b.date)).forEach(p=>m.set(p.ticker, p.close));
  return m;
}
function computePositions(txAll: Transaction[], px: DailyPrice[], portfolios?: string[]): Position[] {
  const tx = portfolios?.length ? txAll.filter(t=>portfolios.includes(t.portfolio)) : txAll;
  const byT = new Map<string, Transaction[]>();
  for (const t of tx) (byT.get(t.ticker) || byT.set(t.ticker, []).get(t.ticker)!).push(t);

  const last = lastPriceMap(px);
  const out: Position[] = [];
  for (const [ticker, arr] of byT) {
    arr.sort((a,b)=>a.date.localeCompare(b.date));
    let qty = 0, avg = 0, since: string | undefined;
    for (const t of arr) {
      if (t.side==='BUY') {
        const cost = qty*avg + t.quantity*t.price + (t.fees ?? 0);
        qty += t.quantity;
        avg = qty>0 ? cost/qty : 0;
        if (!since) since = t.date;
      } else {
        qty -= t.quantity;
        if (qty<=0) { qty=0; avg=0; since=undefined; }
      }
    }
    if (!qty) continue;
    const l = last.get(ticker) ?? 0;
    const value = qty*l;
    const pnlAbs = qty*(l-avg);
    const pnlPct = avg>0 ? (l-avg)/avg : 0;
    out.push({ ticker, qty, last:l, value, weight:0, since, avgCost:avg, pnlAbs, pnlPct });
  }
  out.sort((a,b)=>b.value-a.value);
  const total = out.reduce((s,x)=>s+x.value,0);
  return out.map(x=>({ ...x, weight: total? x.value/total : 0 }));
}
function wide(prices: DailyPrice[]) {
  const dates = Array.from(new Set(prices.map(p=>p.date))).sort();
  const tickers = Array.from(new Set(prices.map(p=>p.ticker))).sort();
  const mapByDate: Record<string, Record<string, number>> = {};
  for (const p of prices) (mapByDate[p.date] ||= {})[p.ticker] = p.close;

  const rows: { date:string; cols: Record<string,number> }[] = [];
  let prev: Record<string,number> = {};
  for (const d of dates) {
    const row = { ...prev, ...(mapByDate[d]||{}) };
    rows.push({ date:d, cols:row }); prev=row;
  }
  return { dates, tickers, rows };
}
function navSeries(txAll: Transaction[], prices:DailyPrice[], portfolios?: string[]): SeriesPoint[] {
  const tx = portfolios?.length ? txAll.filter(t=>portfolios.includes(t.portfolio)) : txAll;
  if (!tx.length || !prices.length) return [];
  const { dates, rows, tickers } = wide(prices);
  const firstTrade = tx.map(t=>t.date).sort()[0];
  const useDates = dates.filter(d=>d>=firstTrade);

  const txS = [...tx].sort((a,b)=>a.date.localeCompare(b.date));
  const qty: Record<string, number> = {}; tickers.forEach(t=>qty[t]=0);
  let i=0; const out: SeriesPoint[] = [];
  for (const d of useDates) {
    while (i<txS.length && txS[i].date<=d) {
      const t = txS[i]; qty[t.ticker] = (qty[t.ticker] ?? 0) + (t.side==='BUY' ? t.quantity : -t.quantity); i++;
    }
    const cols = rows.find(r=>r.date===d)?.cols || {};
    let v = 0; for (const k of Object.keys(qty)) v += (qty[k]??0) * (cols[k]??0);
    out.push({ date:d, value:v });
  }
  return out;
}

/* ================= Charts ================= */
const NavChart = dynamic(async () => (await import('../components/NavChart')).default, { ssr:false });

/* ================= Topbar dans le style ambre/ardoise ================= */
function AmberDock({
  title, cashByPortfolio, allPortfolios, selected, onToggle, onAddPortfolio, onOpenCash, onAddPosition, onRefresh,
  showChart, setShowChart, hideValues, setHideValues
}:{
  title:string;
  cashByPortfolio: Record<string, number>;
  allPortfolios: string[];
  selected: string[];
  onToggle: (p:string)=>void;
  onAddPortfolio: ()=>void;
  onOpenCash: ()=>void;
  onAddPosition: ()=>void;
  onRefresh: ()=>void;
  showChart: boolean;
  setShowChart: (b:boolean)=>void;
  hideValues: boolean;
  setHideValues: (b:boolean)=>void;
}) {
  return (
    <div className="pt-4">
      <div className="max-w-7xl mx-auto">
        <div className="px-4 py-3 bg-gradient-to-br from-slate-900/70 to-slate-950/70 backdrop-blur xl rounded-2xl border border-amber-900/30 shadow-2xl flex items-center justify-between">
          {/* Logo + titre */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-700 to-amber-900 flex items-center justify-center shadow-amber-900/40 shadow-xl">
              <BarChart3 className="w-6 h-6 text-amber-100"/>
            </div>
            <h1 className="text-lg md:text-xl font-bold text-amber-50 tracking-tight">{title}</h1>
          </div>
          {/* Actions */}
          <div className="flex items-center gap-2">
            {/* Sélecteur portefeuilles */}
            <details className="relative">
              <summary className="px-3 py-2 rounded-xl bg-slate-800/70 border border-amber-900/30 text-amber-100 cursor-pointer select-none hover:bg-slate-700/70">Portefeuilles</summary>
              <div className="absolute right-0 mt-2 w-80 bg-slate-900/95 border border-amber-900/40 rounded-xl shadow-2xl p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-amber-200/70 text-sm">Sélection multiple</span>
                  <button className="px-2.5 py-1.5 rounded-lg bg-gradient-to-br from-amber-700 to-amber-900 text-amber-50 border border-amber-600/40 text-sm font-medium hover:from-amber-600 hover:to-amber-800" onClick={onAddPortfolio}>
                    <Plus className="inline-block w-4 h-4 mr-1"/> Nouveau
                  </button>
                </div>
                <div className="max-h-64 overflow-auto divide-y divide-amber-900/20">
                  {allPortfolios.length ? allPortfolios.map(p=> (
                    <label key={p} className="flex items-center gap-2 py-2 text-amber-50">
                      <input type="checkbox" className="accent-amber-700" checked={selected.includes(p)} onChange={()=>onToggle(p)} />
                      <span className="font-medium">{p}</span>
                      <span className="text-amber-200/60 text-xs ml-auto">{(cashByPortfolio[p]||0).toLocaleString('fr-FR',{maximumFractionDigits:2})} €</span>
                    </label>
                  )) : (
                    <div className="text-amber-200/60 text-sm">Aucun portefeuille. Ajoute un dépôt pour en créer un.</div>
                  )}
                </div>
              </div>
            </details>

            <button className="px-3 py-2 rounded-xl bg-slate-800/70 border border-amber-900/30 text-amber-100 hover:bg-slate-700/70" onClick={onRefresh}>Rafraîchir</button>
            <button className="px-3 py-2 rounded-xl bg-slate-800/70 border border-amber-900/30 text-amber-100 hover:bg-slate-700/70" onClick={onOpenCash}>Dépôt / Retrait</button>
            <button className="px-3 py-2 rounded-xl bg-gradient-to-br from-amber-700 to-amber-900 text-amber-50 border border-amber-600/40 hover:from-amber-600 hover:to-amber-800 font-medium" onClick={onAddPosition}>Ajouter position</button>
            <button className="p-2.5 rounded-xl bg-slate-800/70 border border-amber-900/30 hover:bg-slate-700/70" onClick={()=>setShowChart(!showChart)}>
              <LineChartIcon className="w-5 h-5 text-amber-200"/>
            </button>
            <button className="p-2.5 rounded-xl bg-slate-800/70 border border-amber-900/30 hover:bg-slate-700/70" onClick={()=>setHideValues(!hideValues)}>
              {hideValues ? <EyeOff className="w-5 h-5 text-amber-200"/> : <Eye className="w-5 h-5 text-amber-200"/>}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ================= Page ================= */
export default function Page(){
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [prices, setPrices] = useState<DailyPrice[]>([]);
  const [dividends, setDividends] = useState<Dividend[]>([]);
  const [forecast, setForecast] = useState<Record<string, { exDate: string; amountEst: number|null }|null>>({});
  const [meta, setMeta] = useState<Record<string, { name:string; currency?:string; logo?: string }>>({});
  const [cashByPortfolio, setCashByPortfolio] = useState<Record<string, number>>({});

  const [portfolios, setPortfolios] = useState<string[]>(['PEA']);

  const derivedFromData = useMemo(()=>{
    const s = new Set<string>();
    transactions.forEach(t=>s.add(t.portfolio));
    dividends.forEach(d=>s.add(d.portfolio));
    Object.keys(cashByPortfolio).forEach(p=>s.add(p));
    return Array.from(s).sort();
  }, [transactions, dividends, cashByPortfolio]);

  const allPortfolios = useMemo(()=>{
    const s = new Set<string>(portfolios);
    derivedFromData.forEach(p=>s.add(p));
    return Array.from(s).sort();
  }, [portfolios, derivedFromData]);

  const [selectedPortfolios, setSelectedPortfolios] = useState<string[]>([]);
  const portfoliosFilter = selectedPortfolios.length ? selectedPortfolios : undefined;

  const [range, setRange] = useState<RangeKey>('ALL');
  const positions = useMemo(()=>computePositions(transactions, prices, portfoliosFilter), [transactions, prices, portfoliosFilter]);
  const total = positions.reduce((s,x)=>s+x.value,0);

  const navAll = useMemo(()=>navSeries(transactions, prices, portfoliosFilter), [transactions, prices, portfoliosFilter]);
  const nav = useMemo(()=>{
    if (!navAll.length) return [] as SeriesPoint[];
    if (range==='ALL') return navAll;
    const to = navAll.at(-1)!.date;
    const d  = rangeDays(range);
    const from = dateISO(new Date(new Date(to).getTime() - d*864e5));
    return navAll.filter(x=>x.date>=from);
  }, [navAll, range]);
  const perfAbs = useMemo(()=> nav.length>=2 ? nav.at(-1)!.value - nav[0].value : 0, [nav]);
  const perfPct = useMemo(()=> nav.length>=2 && nav[0].value>0 ? (nav.at(-1)!.value - nav[0].value)/nav[0].value : 0, [nav]);

  const cash = useMemo(()=>{
    const keys = portfoliosFilter ?? Object.keys(cashByPortfolio);
    return keys.reduce((s,k)=>s+(cashByPortfolio[k]||0),0);
  }, [cashByPortfolio, portfoliosFilter]);

  const ensureMeta = useCallback(async (symbol: string)=>{
    if (meta[symbol]) return;
    const r = await fetch(`/api/quote?symbol=${encodeURIComponent(symbol)}`, { cache:'no-store' }).then(r=>r.json());
    const guessLogo = (sym:string)=>{
      const low = sym.toLowerCase();
      const common: Record<string,string> = { aapl:'apple.com', msft:'microsoft.com', goog:'google.com', googl:'google.com', amzn:'amazon.com', meta:'meta.com', tsla:'tesla.com', nvda:'nvidia.com' };
      const domain = common[low] || `${low}.com`;
      return `https://logo.clearbit.com/${domain}`;
    };
    setMeta(m=>({ ...m, [symbol]: { name: r?.name || symbol, currency: r?.currency || undefined, logo: guessLogo(symbol) } }));
    if (Number.isFinite(r?.price)) setPrices(px => mergePx(px, [{ date: dateISO(new Date()), ticker: symbol, close: Number(r.price) }]));
  }, [meta]);

  const mergePx = (old:DailyPrice[], up:DailyPrice[])=>{
    const m = new Map<string, DailyPrice>();
    for (const p of old) m.set(`${p.ticker}|${p.date}`, p);
    for (const p of up) m.set(`${p.ticker}|${p.date}`, p);
    return Array.from(m.values()).sort((a,b)=>a.date.localeCompare(b.date));
  };

  const loadHistory = useCallback(async (symbol:string)=>{
    const first = transactions.filter(t=>t.ticker===symbol).map(t=>t.date).sort()[0];
    if (!first) return;
    const arr:{date:string;close:number}[] = await fetch(`/api/history?symbol=${encodeURIComponent(symbol)}&from=${first}&to=${dateISO(new Date())}`, { cache:'no-store'}).then(r=>r.json());
    const up = arr.map(x=>({ ticker:symbol, date:x.date, close:x.close }));
    setPrices(px=>mergePx(px, up));
  }, [transactions]);

  const qtyAtDate = useCallback((portfolio:string, ticker:string, date:string)=>{
    const tx = transactions.filter(t=>t.portfolio===portfolio && t.ticker===ticker && t.date<=date).sort((a,b)=>a.date.localeCompare(b.date));
    let q = 0; for (const t of tx) q += t.side==='BUY' ? t.quantity : -t.quantity;
    return Math.max(q, 0);
  }, [transactions]);

  const syncDividends = useCallback(async (symbol:string)=>{
    const first = transactions.filter(t=>t.ticker===symbol).map(t=>t.date).sort()[0];
    if (!first) return;
    const data = await fetch(`/api/dividends?symbol=${encodeURIComponent(symbol)}&from=${first}`, { cache:'no-store' }).then(r=>r.json());
    const past: {date:string, amount:number}[] = data?.history ?? [];
    const next = data?.next ?? null;

    const newLines: Dividend[] = [];
    for (const p of allPortfolios) {
      for (const d of past) {
        const qty = qtyAtDate(p, symbol, d.date);
        if (qty<=0) continue;
        const amount = Number((qty * d.amount).toFixed(6));
        const id = `div|${p}|${symbol}|${d.date}`;
        if (!dividends.find(x=>x.id===id)) newLines.push({ id, portfolio: p, ticker: symbol, date: d.date, amount });
      }
    }
    if (newLines.length) {
      setDividends(prev => [...prev, ...newLines].sort((a,b)=>a.date.localeCompare(b.date)));
      setCashByPortfolio(prev=>{ const copy = { ...prev }; for (const d of newLines) copy[d.portfolio] = (copy[d.portfolio] || 0) + d.amount; return copy; });
    }
    setForecast(f => ({ ...f, [symbol]: next }));
  }, [allPortfolios, dividends, qtyAtDate]);

  const tickers = useMemo(()=>Array.from(new Set(transactions.map(t=>t.ticker))), [transactions]);
  useEffect(()=>{ tickers.forEach(s => { ensureMeta(s); loadHistory(s); syncDividends(s); }); }, [tickers, ensureMeta, loadHistory, syncDividends]);

  const refreshQuotes = useCallback(async ()=>{
    const syms = Array.from(new Set(positions.map(p=>p.ticker)));
    const today = dateISO(new Date());
    const ups:DailyPrice[] = [];
    for (const s of syms) {
      const r = await fetch(`/api/quote?symbol=${encodeURIComponent(s)}`, { cache:'no-store'}).then(r=>r.json());
      if (Number.isFinite(r?.price)) ups.push({ date: today, ticker: s, close: Number(r.price) });
      if (r?.name) setMeta(m=>({ ...m, [s]: { name:r.name, currency:r.currency ?? m[s]?.currency, logo: m[s]?.logo } }));
    }
    if (ups.length) setPrices(px=>mergePx(px, ups));
  }, [positions]);

  const [showCash, setShowCash] = useState(false);
  const [showNewPortfolio, setShowNewPortfolio] = useState(false);
  const [txModal, setTxModal] = useState<{open:boolean; mode:'add'|'edit'; ticker?:string}>({ open:false, mode:'add' });

  const handleCash = (c: CashPayload)=> setCashByPortfolio(prev=>({ ...prev, [c.portfolio]: (prev[c.portfolio] || 0) + c.amount }));

  const handleNewPortfolio = (p: NewPortfolioPayload)=>{
    const name = p.name.trim() || 'Portefeuille';
    setPortfolios(prev => Array.from(new Set(prev.concat(name))));
    if (p.amount !== 0) setCashByPortfolio(prev=>({ ...prev, [name]: (prev[name] || 0) + p.amount }));
    setSelectedPortfolios(s => Array.from(new Set(s.concat(name))));
    setShowNewPortfolio(false);
    fireConfetti({ particleCount: 100, spread: 80, origin: { y: 0.2 } });
  };

  const handleTxSubmit = (t: Omit<Transaction,'id'>, cashDeltaOk:boolean)=>{
    const gross = t.quantity*t.price + (t.fees ?? 0);
    if (t.side==='BUY') {
      if ((cashByPortfolio[t.portfolio]||0) < gross) { alert('Cash insuffisant dans '+t.portfolio); return; }
      if (!cashDeltaOk) return;
      setCashByPortfolio(p=>({ ...p, [t.portfolio]: (p[t.portfolio]||0) - gross }));
    } else {
      const credit = t.quantity*t.price - (t.fees ?? 0);
      setCashByPortfolio(p=>({ ...p, [t.portfolio]: (p[t.portfolio]||0) + credit }));
    }
    setTransactions(arr=>[...arr, { ...t, id:`tx-${Date.now()}-${Math.random().toString(36).slice(2,8)}` }]);
    fireConfetti({ particleCount: 80, spread: 70, origin: { y: 0.25 } });
    setTxModal({ open:false, mode:'add' });
    ensureMeta(t.ticker); loadHistory(t.ticker); syncDividends(t.ticker);
  };

  const [showChart, setShowChart] = useState(true);
  const [hideValues, setHideValues] = useState(false);

  return (
    <>
      {/* FOND animé ambre/ardoise */}
      <div className="fixed inset-0 -z-10">
        <div className="absolute inset-0 opacity-30">
          <div className="absolute top-20 left-20 w-96 h-96 bg-amber-900/20 rounded-full blur-3xl animate-pulse" />
          <div className="absolute bottom-20 right-20 w-96 h-96 bg-amber-800/20 rounded-full blur-3xl animate-pulse" style={{animationDelay:'1s'}} />
          <div className="absolute top-1/2 left-1/2 w-96 h-96 bg-amber-700/10 rounded-full blur-3xl animate-pulse" style={{animationDelay:'2s'}} />
        </div>
        <div className="absolute inset-0 bg-slate-950" />
      </div>

      {/* TOPBAR */}
      <AmberDock
        title="Portfolio Hub"
        cashByPortfolio={cashByPortfolio}
        allPortfolios={allPortfolios}
        selected={selectedPortfolios}
        onToggle={(p)=>setSelectedPortfolios(s=> s.includes(p)? s.filter(x=>x!==p) : s.concat(p))}
        onAddPortfolio={()=>setShowNewPortfolio(true)}
        onOpenCash={()=>setShowCash(true)}
        onAddPosition={()=>setTxModal({ open:true, mode:'add' })}
        onRefresh={refreshQuotes}
        showChart={showChart}
        setShowChart={setShowChart}
        hideValues={hideValues}
        setHideValues={setHideValues}
      />

      {/* CONTENU */}
      <main className="max-w-7xl mx-auto p-6 space-y-6">
        <section className="grid gap-4 xl:grid-cols-4">
          <article className="bg-gradient-to-br from-slate-800/60 to-slate-900/60 backdrop-blur-xl rounded-2xl p-6 border border-amber-900/20 shadow-2xl">
            <div className="text-amber-200/70 text-sm mb-1 flex items-center gap-2"><DollarSign className="w-4 h-4"/>Valeur totale</div>
            <div className="text-4xl font-bold text-amber-50">{fmt(total)}</div>
          </article>

          <div className="xl:col-span-1">
            {/* On suppose que PerformanceCard suit son propre style; on l'encadre */}
            <div className="bg-gradient-to-br from-slate-800/60 to-slate-900/60 rounded-2xl p-4 border border-amber-900/20 shadow-2xl">
              <PerformanceCard abs={perfAbs} pct={perfPct} />
            </div>
          </div>

          <article className="bg-gradient-to-br from-slate-800/60 to-slate-900/60 backdrop-blur-xl rounded-2xl p-6 border border-amber-900/20 shadow-2xl xl:col-span-2">
            <div className="text-amber-200/70 text-sm mb-1 flex items-center gap-2"><PiggyBank className="w-4 h-4"/>Cash</div>
            <div className="text-4xl font-bold text-amber-50">{fmt(cash)}</div>
            <p className="text-amber-200/50 text-sm mt-1">Somme des soldes des portefeuilles sélectionnés</p>
          </article>
        </section>

        <div className="bg-gradient-to-br from-slate-800/60 to-slate-900/60 rounded-2xl p-4 border border-amber-900/20 shadow-2xl">
          <HeatmapTickers positions={positions} meta={meta} />
        </div>

        <section className="bg-gradient-to-br from-slate-800/60 to-slate-900/60 rounded-2xl p-6 border border-amber-900/20 shadow-2xl">
          <header className="flex items-center justify-between mb-2">
            <div className="text-amber-200/70 text-sm">NAV</div>
            <div className="flex gap-2 p-1 rounded-xl bg-slate-900/60 border border-amber-900/30">
              {(['1W','1M','1Y','ALL'] as RangeKey[]).map(k=> (
                <button key={k} className={`px-3 py-1.5 rounded-lg text-sm border ${k===range? 'bg-amber-800/80 text-amber-50 border-amber-600/50' : 'bg-transparent text-amber-200/80 border-transparent hover:bg-slate-800/80'}`} onClick={()=>setRange(k)}>{k}</button>
              ))}
            </div>
          </header>
          {/* NavChart hérite de son propre style; on conserve uniquement le conteneur */}
          <NavChart data={nav} />
        </section>

        <div className="bg-gradient-to-br from-slate-800/60 to-slate-900/60 rounded-2xl p-4 border border-amber-900/20 shadow-2xl">
          <PositionsTable positions={positions} meta={meta} onEdit={(ticker)=>setTxModal({ open:true, mode:'edit', ticker })}/>
        </div>

        <div className="bg-gradient-to-br from-slate-800/60 to-slate-900/60 rounded-2xl p-4 border border-amber-900/20 shadow-2xl">
          <DividendsTable
            dividends={portfoliosFilter ? dividends.filter(d=>portfoliosFilter.includes(d.portfolio)) : dividends}
            fmt={fmt}
            onDelete={(id, port, amount)=>{ setDividends(arr=>arr.filter(x=>x.id!==id)); setCashByPortfolio(p=>({ ...p, [port]: (p[port]||0) - amount })); }}
            forecastNext={positions[0]?.ticker ? forecast[positions[0].ticker] : null}
          />
        </div>
      </main>

      {/* Modals */}
      {showCash && (
        <CashModal
          open
          onClose={()=>setShowCash(false)}
          onSubmit={(c)=>{ handleCash(c); setShowCash(false); }}
          portfolios={allPortfolios.length?allPortfolios:['PEA']}
          defaultPortfolio={allPortfolios[0] || 'PEA'}
        />
      )}
      {showNewPortfolio && (
        <AddPortfolioModal
          open
          onClose={()=>setShowNewPortfolio(false)}
          onSubmit={handleNewPortfolio}
          defaultName={(allPortfolios[0] ?? 'PEA')}
        />
      )}
      {txModal.open && (
        <TxModal
          open
          mode={txModal.mode}
          initialTicker={txModal.ticker ?? null}
          onClose={()=>setTxModal({ open:false, mode:'add' })}
          portfolios={allPortfolios.length?allPortfolios:['PEA']}
          defaultPortfolio={allPortfolios[0] || 'PEA'}
          cashByPortfolio={cashByPortfolio}
          onSubmit={handleTxSubmit}
        />
      )}
    </>
  );
}
