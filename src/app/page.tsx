// src/app/page.tsx
'use client';

import { useMemo, useState, useCallback, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BarChart3,
  LineChart as LineChartIcon,
  Eye,
  EyeOff,
  PiggyBank,
  DollarSign,
  RefreshCcw,
  Clock,
  CheckCircle,
  Bitcoin,
  Wallet,
  Info,
} from 'lucide-react';

import CashModal, { type CashPayload } from '../components/CashModal';
import PerformanceCard from '../components/PerformanceCard';
import HeatmapTickers from '../components/HeatmapTickers';
import PositionsTable from '../components/PositionsTable';
import DividendsTable from '../components/DividendsTable';
import TxModal from '../components/TxModal';
import PortfoliosModal from '../components/AddPortfolioModal';
import { fireConfetti } from '../lib/confetti';

/* ================= Types ================= */
type TxSide = 'BUY' | 'SELL';
export type Transaction = {
  id: string;
  portfolio: string;
  date: string;
  ticker: string;
  side: TxSide;
  quantity: number;
  price: number;
  fees?: number;
  note?: string;
};
export type DailyPrice = { date: string; ticker: string; close: number };
export type Position = {
  ticker: string;
  qty: number;
  last: number;
  value: number;
  weight: number;
  since?: string;
  avgCost: number;
  pnlAbs: number;
  pnlPct: number;
  type?: 'stock' | 'crypto' | 'etf';
};
export type Dividend = { id: string; portfolio: string; ticker: string; date: string; amount: number };
export type SeriesPoint = { date: string; value: number };
type RangeKey = '1W' | '1M' | '1Y' | 'ALL';

const rangeDays = (k: RangeKey) => (k === '1W' ? 7 : k === '1M' ? 31 : k === '1Y' ? 366 : Infinity);
const dateISO = (d: Date) => d.toISOString().slice(0, 10);
export const fmt = (n: number) => `${n.toLocaleString('fr-FR', { maximumFractionDigits: 2 })} €`;

/* ================= Utils de base ================= */
function lastPriceMap(prices: DailyPrice[]) {
  const m = new Map<string, number>();
  [...prices].sort((a, b) => a.date.localeCompare(b.date)).forEach((p) => m.set(p.ticker, p.close));
  return m;
}
function detectAssetType(ticker: string): 'stock' | 'crypto' | 'etf' {
  const t = ticker.toUpperCase();
  if (t.includes('BTC') || t.includes('ETH') || t.includes('BNB') || t.endsWith('-USD') || t.endsWith('-EUR')) return 'crypto';
  if (t.includes('ETF') || t.startsWith('I') || t.startsWith('V')) return 'etf';
  return 'stock';
}
const isCrypto = (sym: string) => detectAssetType(sym) === 'crypto';

function computePositions(txAll: Transaction[], px: DailyPrice[], portfolios?: string[]): Position[] {
  const tx = portfolios?.length ? txAll.filter((t) => portfolios.includes(t.portfolio)) : txAll;
  const byT = new Map<string, Transaction[]>();
  for (const t of tx) (byT.get(t.ticker) || byT.set(t.ticker, []).get(t.ticker)!).push(t);

  const last = lastPriceMap(px);
  const out: Position[] = [];
  for (const [ticker, arr] of byT) {
    arr.sort((a, b) => a.date.localeCompare(b.date));
    let qty = 0,
      avg = 0,
      since: string | undefined;
    for (const t of arr) {
      if (t.side === 'BUY') {
        const cost = qty * avg + t.quantity * t.price + (t.fees ?? 0);
        qty += t.quantity;
        avg = qty > 0 ? cost / qty : 0;
        if (!since) since = t.date;
      } else {
        qty -= t.quantity;
        if (qty <= 0) {
          qty = 0;
          avg = 0;
          since = undefined;
        }
      }
    }
    if (!qty) continue;
    const l = last.get(ticker) ?? 0;
    const value = qty * l;
    const pnlAbs = qty * (l - avg);
    const pnlPct = avg > 0 ? (l - avg) / avg : 0;
    out.push({
      ticker,
      qty,
      last: l,
      value,
      weight: 0,
      since,
      avgCost: avg,
      pnlAbs,
      pnlPct,
      type: detectAssetType(ticker),
    });
  }
  out.sort((a, b) => b.value - a.value);
  const total = out.reduce((s, x) => s + x.value, 0);
  return out.map((x) => ({ ...x, weight: total ? x.value / total : 0 }));
}

function wide(prices: DailyPrice[]) {
  const dates = Array.from(new Set(prices.map((p) => p.date))).sort();
  const tickers = Array.from(new Set(prices.map((p) => p.ticker))).sort();
  const mapByDate: Record<string, Record<string, number>> = {};
  for (const p of prices) (mapByDate[p.date] ||= {})[p.ticker] = p.close;

  const rows: { date: string; cols: Record<string, number> }[] = [];
  let prev: Record<string, number> = {};
  for (const d of dates) {
    const row = { ...prev, ...(mapByDate[d] || {}) };
    rows.push({ date: d, cols: row });
    prev = row;
  }
  return { dates, tickers, rows };
}

function navSeries(txAll: Transaction[], prices: DailyPrice[], portfolios?: string[]): SeriesPoint[] {
  const tx = portfolios?.length ? txAll.filter((t) => portfolios.includes(t.portfolio)) : txAll;
  if (!tx.length || !prices.length) return [];
  const { dates, rows, tickers } = wide(prices);
  const firstTrade = tx.map((t) => t.date).sort()[0];
  const useDates = dates.filter((d) => d >= firstTrade);

  const txS = [...tx].sort((a, b) => a.date.localeCompare(b.date));
  const qty: Record<string, number> = {};
  tickers.forEach((t) => (qty[t] = 0));
  let i = 0;
  const out: SeriesPoint[] = [];
  for (const d of useDates) {
    while (i < txS.length && txS[i].date <= d) {
      const t = txS[i];
      qty[t.ticker] = (qty[t.ticker] ?? 0) + (t.side === 'BUY' ? t.quantity : -t.quantity);
      i++;
    }
    const cols = rows.find((r) => r.date === d)?.cols || {};
    let v = 0;
    for (const k of Object.keys(qty)) v += (qty[k] ?? 0) * (cols[k] ?? 0);
    out.push({ date: d, value: v });
  }
  return out;
}

/* =================== Helpers prix robustes (crypto) =================== */
const dateNDaysAgoISO = (n: number) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
};
const quoteVariants = (symbol: string) => {
  const S = symbol.toUpperCase();
  // Si déjà suffixé, on teste tel quel + l'autre devise
  if (S.endsWith('-USD')) return [S, S.replace(/-USD$/, '-EUR')];
  if (S.endsWith('-EUR')) return [S, S.replace(/-EUR$/, '-USD')];
  // Sinon, on essaie brut, puis USD, puis EUR
  return [S, `${S}-USD`, `${S}-EUR`];
};
const lastTradePriceFor = (symbol: string, txs: Transaction[]): number | null => {
  const my = txs
    .filter((t) => t.ticker === symbol)
    .sort((a, b) => a.date.localeCompare(b.date))
    .reverse();
  for (const t of my) {
    if (Number.isFinite(t.price)) return t.price;
  }
  return null;
};

/** Essaie /api/quote puis /api/history (dernière clôture) sur les variantes (sym,-USD,-EUR) */
const getLatestPrice = async (
  symbol: string
): Promise<{ symbolUsed: string; price: number | null; name?: string; currency?: string } | null> => {
  for (const v of quoteVariants(symbol)) {
    try {
      // 1) quote direct
      const q = await fetch(`/api/quote?symbol=${encodeURIComponent(v)}`, { cache: 'no-store' }).then((r) => r.json());
      if (Number.isFinite(q?.price)) {
        return { symbolUsed: v, price: Number(q.price), name: q?.name, currency: q?.currency };
      }
      // 2) fallback historique 2 semaines
      const from = dateNDaysAgoISO(14);
      const hist: Array<{ date: string; close: number }> = await fetch(
        `/api/history?symbol=${encodeURIComponent(v)}&from=${from}&to=${dateISO(new Date())}`,
        { cache: 'no-store' }
      ).then((r) => r.json());
      const last = [...(hist || [])].filter((x) => Number.isFinite(x?.close)).pop();
      if (last && Number.isFinite(last.close)) {
        return { symbolUsed: v, price: Number(last.close) };
      }
    } catch {
      // ignore et passe à la variante suivante
    }
  }
  return null;
};

/* ================= Charts ================= */
const NavChart = dynamic(async () => (await import('../components/NavChart')).default, { ssr: false });

/* ================= Tooltip & Status ================= */
function Tooltip({ children, content }: { children: React.ReactNode; content: string }) {
  return (
    <div className="relative group inline-block">
      {children}
      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1.5 bg-slate-900 text-amber-100 text-xs rounded-lg border border-amber-900/40 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50">
        {content}
        <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-4 border-transparent border-t-slate-900" />
      </div>
    </div>
  );
}
function StatusBadge({ lastUpdate }: { lastUpdate: Date | null }) {
  if (!lastUpdate) return null;
  const now = new Date();
  const diff = (now.getTime() - lastUpdate.getTime()) / 1000;
  const isRecent = diff < 60;

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium ${
        isRecent ? 'bg-emerald-900/20 text-emerald-400 border border-emerald-600/40' : 'bg-amber-900/20 text-amber-400 border border-amber-600/40'
      }`}
    >
      {isRecent ? <CheckCircle className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
      Mis à jour il y a {diff < 60 ? '< 1min' : `${Math.floor(diff / 60)}min`}
    </motion.div>
  );
}

/* ================= Topbar ================= */
function AmberDock({
  title,
  onOpenPortfolios,
  onOpenCash,
  onAddPosition,
  showChart,
  setShowChart,
  hideValues,
  setHideValues,
  onRefresh,
  isRefreshing,
  lastUpdate,
}: {
  title: string;
  onOpenPortfolios: () => void;
  onOpenCash: () => void;
  onAddPosition: () => void;
  showChart: boolean;
  setShowChart: (b: boolean) => void;
  hideValues: boolean;
  setHideValues: (b: boolean) => void;
  onRefresh: () => void;
  isRefreshing: boolean;
  lastUpdate: Date | null;
}) {
  return (
    <div className="pt-4">
      <div className="max-w-7xl mx-auto">
        <motion.div initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="px-4 py-3 af-topdock flex items-center justify-between relative z-40 overflow-visible">
          <div className="flex items-center gap-3">
            <motion.div whileHover={{ scale: 1.05, rotate: 5 }} className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-700 to-amber-900 flex items-center justify-center shadow-amber-900/40 shadow-xl">
              <BarChart3 className="w-6 h-6 text-amber-100" />
            </motion.div>
            <div>
              <h1 className="text-lg md:text-xl font-bold text-amber-50 tracking-tight">{title}</h1>
              <StatusBadge lastUpdate={lastUpdate} />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Tooltip content="Sélectionner les portefeuilles">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="px-3 py-2 rounded-xl bg-slate-800/70 border border-amber-900/30 text-amber-100 hover:bg-slate-700/70 transition-all flex items-center gap-2"
                onClick={onOpenPortfolios}
              >
                <Wallet className="w-4 h-4" />
                Portefeuilles
              </motion.button>
            </Tooltip>

            <Tooltip content="Dépôt ou retrait de cash">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="px-3 py-2 rounded-xl bg-slate-800/70 border border-amber-900/30 text-amber-100 hover:bg-slate-700/70 transition-all flex items-center gap-2"
                onClick={onOpenCash}
              >
                <DollarSign className="w-4 h-4" />
                Cash
              </motion.button>
            </Tooltip>

            <Tooltip content="Rafraîchir les cours (auto toutes les 5min)">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="p-2.5 rounded-xl bg-slate-800/70 border border-amber-900/30 hover:bg-slate-700/70 transition-all disabled:opacity-50"
                onClick={onRefresh}
                disabled={isRefreshing}
              >
                <RefreshCcw className={`w-5 h-5 text-amber-200 ${isRefreshing ? 'animate-spin' : ''}`} />
              </motion.button>
            </Tooltip>

            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="px-4 py-2.5 bg-gradient-to-br from-amber-700 to-amber-900 hover:from-amber-600 hover:to-amber-800 text-amber-50 rounded-xl transition-all shadow-xl shadow-amber-900/30 flex items-center gap-2 font-medium border border-amber-600/30"
              onClick={onAddPosition}
            >
              <motion.span animate={{ rotate: [0, 90, 0] }} transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}>
                +
              </motion.span>
              Position
            </motion.button>

            <Tooltip content={showChart ? 'Masquer graphique' : 'Afficher graphique'}>
              <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} className="p-2.5 rounded-xl bg-slate-800/70 border border-amber-900/30 hover:bg-slate-700/70 transition-all" onClick={() => setShowChart(!showChart)}>
                <LineChartIcon className="w-5 h-5 text-amber-200" />
              </motion.button>
            </Tooltip>

            <Tooltip content={hideValues ? 'Afficher valeurs' : 'Masquer valeurs'}>
              <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} className="p-2.5 rounded-xl bg-slate-800/70 border border-amber-900/30 hover:bg-slate-700/70 transition-all" onClick={() => setHideValues(!hideValues)}>
                {hideValues ? <EyeOff className="w-5 h-5 text-amber-200" /> : <Eye className="w-5 h-5 text-amber-200" />}
              </motion.button>
            </Tooltip>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

/* ================= Page ================= */
export default function Page() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [prices, setPrices] = useState<DailyPrice[]>([]);
  const [dividends, setDividends] = useState<Dividend[]>([]);
  const [forecast, setForecast] = useState<Record<string, { exDate: string; amountEst: number | null } | null>>({});
  const [meta, setMeta] = useState<Record<string, { name: string; currency?: string; logo?: string }>>({});
  const [cashByPortfolio, setCashByPortfolio] = useState<Record<string, number>>({});
  const [portfolios, setPortfolios] = useState<string[]>(['PEA']);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  const derivedFromData = useMemo(() => {
    const s = new Set<string>();
    transactions.forEach((t) => s.add(t.portfolio));
    dividends.forEach((d) => s.add(d.portfolio));
    Object.keys(cashByPortfolio).forEach((p) => s.add(p));
    return Array.from(s).sort();
  }, [transactions, dividends, cashByPortfolio]);

  const allPortfolios = useMemo(() => {
    const s = new Set<string>(portfolios);
    derivedFromData.forEach((p) => s.add(p));
    return Array.from(s).sort();
  }, [portfolios, derivedFromData]);

  const [selectedPortfolios, setSelectedPortfolios] = useState<string[]>([]);
  const portfoliosFilter = selectedPortfolios.length ? selectedPortfolios : undefined;

  const [range, setRange] = useState<RangeKey>('ALL');
  const positions = useMemo(() => computePositions(transactions, prices, portfoliosFilter), [transactions, prices, portfoliosFilter]);
  const total = positions.reduce((s, x) => s + x.value, 0);

  const navAll = useMemo(() => navSeries(transactions, prices, portfoliosFilter), [transactions, prices, portfoliosFilter]);
  const nav = useMemo(() => {
    if (!navAll.length) return [] as SeriesPoint[];
    if (range === 'ALL') return navAll;
    const to = navAll.at(-1)!.date;
    const d = rangeDays(range);
    const from = dateISO(new Date(new Date(to).getTime() - d * 864e5));
    return navAll.filter((x) => x.date >= from);
  }, [navAll, range]);

  const perfAbs = useMemo(() => (nav.length >= 2 ? nav.at(-1)!.value - nav[0].value : 0), [nav]);
  const perfPct = useMemo(() => (nav.length >= 2 && nav[0].value > 0 ? (nav.at(-1)!.value - nav[0].value) / nav[0].value : 0), [nav]);

  const cash = useMemo(() => {
    const keys = portfoliosFilter ?? Object.keys(cashByPortfolio);
    return keys.reduce((s, k) => s + (cashByPortfolio[k] || 0), 0);
  }, [cashByPortfolio, portfoliosFilter]);

  /* === masque global pour le bouton "œil" === */
  const [showChart, setShowChart] = useState(true);
  const [hideValues, setHideValues] = useState(false);
  const fmtMasked = useCallback((n: number) => (hideValues ? '•••' : fmt(n)), [hideValues]);

  /* ====== mergePx util ====== */
  const mergePx = (old: DailyPrice[], up: DailyPrice[]) => {
    const m = new Map<string, DailyPrice>();
    for (const p of old) m.set(`${p.ticker}|${p.date}`, p);
    for (const p of up) m.set(`${p.ticker}|${p.date}`, p);
    return Array.from(m.values()).sort((a, b) => a.date.localeCompare(b.date));
  };

  /* ====== chargement méta + prix robuste (crypto OK) ====== */
  const ensureMetaAndPrice = useCallback(
    async (symbol: string) => {
      // meta "safe"
      if (!meta[symbol]) {
        const guessLogo = (sym: string) => {
          const low = sym.toLowerCase();
          const common: Record<string, string> = {
            aapl: 'apple.com',
            msft: 'microsoft.com',
            goog: 'google.com',
            googl: 'google.com',
            amzn: 'amazon.com',
            meta: 'meta.com',
            tsla: 'tesla.com',
            nvda: 'nvidia.com',
            btc: 'bitcoin.org',
            eth: 'ethereum.org',
            bnb: 'binance.com',
            sol: 'solana.com',
          };
          const key = Object.keys(common).find((k) => low.startsWith(k));
          const domain = key ? common[key] : `${low.replace(/[^a-z0-9]/g, '')}.com`;
          return `https://logo.clearbit.com/${domain}`;
        };
        setMeta((m) => ({ ...m, [symbol]: { name: symbol, currency: isCrypto(symbol) ? 'USD' : undefined, logo: guessLogo(symbol) } }));
      }

      const today = dateISO(new Date());
      const latest = await getLatestPrice(symbol);

      if (latest?.price != null) {
        setPrices((px) => mergePx(px, [{ date: today, ticker: symbol, close: latest.price }]));
        if (latest.name || latest.currency) {
          setMeta((m) => ({
            ...m,
            [symbol]: { name: latest.name || m[symbol]?.name || symbol, currency: latest.currency ?? m[symbol]?.currency, logo: m[symbol]?.logo },
          }));
        }
        return;
      }

      // Dernier recours pour crypto : seed avec dernier trade connu
      if (isCrypto(symbol)) {
        const seed = lastTradePriceFor(symbol, transactions);
        if (seed != null) setPrices((px) => mergePx(px, [{ date: today, ticker: symbol, close: seed }]));
      }
    },
    [meta, transactions]
  );

  const loadHistory = useCallback(
    async (symbol: string) => {
      const first = transactions.filter((t) => t.ticker === symbol).map((t) => t.date).sort()[0];
      if (!first) return;
      const arr: { date: string; close: number }[] = await fetch(
        `/api/history?symbol=${encodeURIComponent(symbol)}&from=${first}&to=${dateISO(new Date())}`,
        { cache: 'no-store' }
      ).then((r) => r.json());
      const up = arr.map((x) => ({ ticker: symbol, date: x.date, close: x.close }));
      setPrices((px) => mergePx(px, up));
    },
    [transactions]
  );

  const qtyAtDate = useCallback(
    (portfolio: string, ticker: string, date: string) => {
      const tx = transactions.filter((t) => t.portfolio === portfolio && t.ticker === ticker && t.date <= date).sort((a, b) => a.date.localeCompare(b.date));
      let q = 0;
      for (const t of tx) q += t.side === 'BUY' ? t.quantity : -t.quantity;
      return Math.max(q, 0);
    },
    [transactions]
  );

  const syncDividends = useCallback(
    async (symbol: string) => {
      const first = transactions.filter((t) => t.ticker === symbol).map((t) => t.date).sort()[0];
      if (!first) return;
      const data = await fetch(`/api/dividends?symbol=${encodeURIComponent(symbol)}&from=${first}`, { cache: 'no-store' }).then((r) => r.json());
      const past: { date: string; amount: number }[] = data?.history ?? [];
      const next = data?.next ?? null;

      const newLines: Dividend[] = [];
      for (const p of allPortfolios) {
        for (const d of past) {
          const qty = qtyAtDate(p, symbol, d.date);
          if (qty <= 0) continue;
          const amount = Number((qty * d.amount).toFixed(6));
          const id = `div|${p}|${symbol}|${d.date}`;
          if (!dividends.find((x) => x.id === id)) newLines.push({ id, portfolio: p, ticker: symbol, date: d.date, amount });
        }
      }
      if (newLines.length) {
        setDividends((prev) => [...prev, ...newLines].sort((a, b) => a.date.localeCompare(b.date)));
        setCashByPortfolio((prev) => {
          const copy = { ...prev };
          for (const d of newLines) copy[d.portfolio] = (copy[d.portfolio] || 0) + d.amount;
          return copy;
        });
      }
      setForecast((f) => ({ ...f, [symbol]: next }));
    },
    [allPortfolios, dividends, qtyAtDate]
  );

  const tickers = useMemo(() => Array.from(new Set(transactions.map((t) => t.ticker))), [transactions]);
  useEffect(() => {
    tickers.forEach((s) => {
      ensureMetaAndPrice(s);
      loadHistory(s);
      syncDividends(s);
    });
  }, [tickers, ensureMetaAndPrice, loadHistory, syncDividends]);

  const refreshQuotes = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const today = dateISO(new Date());
      const ups: DailyPrice[] = [];

      for (const s of Array.from(new Set(positions.map((p) => p.ticker)))) {
        const latest = await getLatestPrice(s);
        if (latest?.price != null) {
          ups.push({ date: today, ticker: s, close: latest.price });
          if (latest.name) {
            setMeta((m) => ({ ...m, [s]: { name: latest.name, currency: latest.currency ?? m[s]?.currency, logo: m[s]?.logo } }));
          }
        } else if (isCrypto(s)) {
          const seed = lastTradePriceFor(s, transactions);
          if (seed != null) ups.push({ date: today, ticker: s, close: seed });
        }
      }

      if (ups.length) setPrices((px) => mergePx(px, ups));
      setLastUpdate(new Date());
    } finally {
      setIsRefreshing(false);
    }
  }, [positions, transactions]);

  // Auto-refresh 5 min
  useEffect(() => {
    const interval = setInterval(() => {
      refreshQuotes();
    }, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [refreshQuotes]);

  const [showCash, setShowCash] = useState(false);
  const [showPortfolios, setShowPortfolios] = useState(false);
  const [txModal, setTxModal] = useState<{ open: boolean; mode: 'add' | 'edit'; ticker?: string }>({ open: false, mode: 'add' });

  const handleCash = (c: CashPayload) => setCashByPortfolio((prev) => ({ ...prev, [c.portfolio]: (prev[c.portfolio] || 0) + c.amount }));

  const handleTxSubmit = (t: Omit<Transaction, 'id'>, cashDeltaOk: boolean) => {
    const gross = t.quantity * t.price + (t.fees ?? 0);
    if (t.side === 'BUY') {
      if ((cashByPortfolio[t.portfolio] || 0) < gross) {
        alert('Cash insuffisant dans ' + t.portfolio);
        return;
      }
      if (!cashDeltaOk) return;
      setCashByPortfolio((p) => ({ ...p, [t.portfolio]: (p[t.portfolio] || 0) - gross }));
    } else {
      const credit = t.quantity * t.price - (t.fees ?? 0);
      setCashByPortfolio((p) => ({ ...p, [t.portfolio]: (p[t.portfolio] || 0) + credit }));
    }
    setTransactions((arr) => [...arr, { ...t, id: `tx-${Date.now()}-${Math.random().toString(36).slice(2, 8)}` }]);
    fireConfetti({ particleCount: 80, spread: 70, origin: { y: 0.25 } });
    setTxModal({ open: false, mode: 'add' });
    ensureMetaAndPrice(t.ticker);
    loadHistory(t.ticker);
    syncDividends(t.ticker);
  };

  const totalSelected = useMemo(() => {
    const scope = selectedPortfolios.length ? selectedPortfolios : allPortfolios;
    return scope.reduce((s, p) => s + (cashByPortfolio[p] || 0), 0);
  }, [selectedPortfolios, allPortfolios, cashByPortfolio]);

  return (
    <>
      {/* FOND animé */}
      <div className="fixed inset-0 -z-10">
        <div className="absolute inset-0 opacity-30">
          <motion.div animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.5, 0.3] }} transition={{ duration: 8, repeat: Infinity }} className="absolute top-20 left-20 w-96 h-96 bg-amber-900/20 rounded-full blur-3xl" />
          <motion.div animate={{ scale: [1.2, 1, 1.2], opacity: [0.5, 0.3, 0.5] }} transition={{ duration: 10, repeat: Infinity, delay: 1 }} className="absolute bottom-20 right-20 w-96 h-96 bg-amber-800/20 rounded-full blur-3xl" />
          <motion.div animate={{ scale: [1, 1.3, 1], opacity: [0.2, 0.4, 0.2] }} transition={{ duration: 12, repeat: Infinity, delay: 2 }} className="absolute top-1/2 left-1/2 w-96 h-96 bg-amber-700/10 rounded-full blur-3xl" />
        </div>
        <div className="absolute inset-0 bg-slate-950" />
      </div>

      <AmberDock
        title="Portfolio Hub"
        onOpenPortfolios={() => setShowPortfolios(true)}
        onOpenCash={() => setShowCash(true)}
        onAddPosition={() => setTxModal({ open: true, mode: 'add' })}
        showChart={showChart}
        setShowChart={setShowChart}
        hideValues={hideValues}
        setHideValues={setHideValues}
        onRefresh={refreshQuotes}
        isRefreshing={isRefreshing}
        lastUpdate={lastUpdate}
      />

      <main className="max-w-7xl mx-auto p-6 space-y-6">
        {/* Cards stats */}
        <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ staggerChildren: 0.1 }} className="grid gap-4 xl:grid-cols-4">
          <motion.article whileHover={{ scale: 1.02, y: -2 }} className="bg-gradient-to-br from-slate-800/60 to-slate-900/60 backdrop-blur-xl rounded-2xl p-6 border border-amber-900/20 shadow-2xl hover:shadow-amber-900/30 transition-all">
            <div className="text-amber-200/70 text-sm mb-1 flex items-center gap-2">
              <DollarSign className="w-4 h-4" />
              Valeur totale
              <Tooltip content="Somme des positions + cash">
                <Info className="w-3 h-3 cursor-help" />
              </Tooltip>
            </div>
            <div className="text-4xl font-bold text-amber-50">{fmtMasked(total + cash)}</div>
            <div className="text-xs text-amber-200/50 mt-1">
              Positions: {fmtMasked(total)} | Cash: {fmtMasked(cash)}
            </div>
          </motion.article>

          <motion.div whileHover={{ scale: 1.02, y: -2 }} className="xl:col-span-1">
            <div className="bg-gradient-to-br from-slate-800/60 to-slate-900/60 rounded-2xl p-4 border border-amber-900/20 shadow-2xl hover:shadow-amber-900/30 transition-all h-full">
              <PerformanceCard abs={perfAbs} pct={perfPct} />
            </div>
          </motion.div>

          <motion.article whileHover={{ scale: 1.02, y: -2 }} className="bg-gradient-to-br from-slate-800/60 to-slate-900/60 backdrop-blur-xl rounded-2xl p-6 border border-amber-900/20 shadow-2xl hover:shadow-amber-900/30 transition-all xl:col-span-2">
            <div className="flex items-center justify-between mb-4">
              <div className="text-amber-200/70 text-sm flex items-center gap-2">
                <PiggyBank className="w-4 h-4" /> Répartition par type
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <Wallet className="w-4 h-4 text-blue-400" />
                  <span className="text-xs text-amber-200/70">Actions</span>
                </div>
                <div className="text-2xl font-bold text-amber-50">{positions.filter((p) => p.type === 'stock').length}</div>
                <div className="text-xs text-amber-200/50">
                  {fmtMasked(positions.filter((p) => p.type === 'stock').reduce((s, p) => s + p.value, 0))}
                </div>
              </div>
              <div className="text-center">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <Bitcoin className="w-4 h-4 text-orange-400" />
                  <span className="text-xs text-amber-200/70">Crypto</span>
                </div>
                <div className="text-2xl font-bold text-amber-50">{positions.filter((p) => p.type === 'crypto').length}</div>
                <div className="text-xs text-amber-200/50">
                  {fmtMasked(positions.filter((p) => p.type === 'crypto').reduce((s, p) => s + p.value, 0))}
                </div>
              </div>
              <div className="text-center">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <BarChart3 className="w-4 h-4 text-purple-400" />
                  <span className="text-xs text-amber-200/70">ETF</span>
                </div>
                <div className="text-2xl font-bold text-amber-50">{positions.filter((p) => p.type === 'etf').length}</div>
                <div className="text-xs text-amber-200/50">
                  {fmtMasked(positions.filter((p) => p.type === 'etf').reduce((s, p) => s + p.value, 0))}
                </div>
              </div>
            </div>
          </motion.article>
        </motion.section>

        {/* Heatmap */}
        <AnimatePresence>
          {positions.length > 0 && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.3 }}>
              <HeatmapTickers positions={positions} meta={meta} />
            </motion.div>
          )}
        </AnimatePresence>

        {/* NAV */}
        <AnimatePresence>
          {showChart && (
            <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="bg-gradient-to-br from-slate-800/60 to-slate-900/60 rounded-2xl p-6 border border-amber-900/20 shadow-2xl">
              <header className="flex items-center justify-between mb-2">
                <div className="text-amber-200/70 text-sm flex items-center gap-2">
                  <LineChartIcon className="w-4 h-4" />
                  NAV
                </div>

                <div className="flex items-center gap-3">
                  <Tooltip content="Rafraîchir les cours">
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={refreshQuotes}
                      disabled={isRefreshing}
                      className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm
                                 bg-amber-900/30 border border-amber-600/40 text-amber-100
                                 hover:bg-amber-800/40 transition disabled:opacity-50"
                    >
                      <RefreshCcw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                      Rafraîchir
                    </motion.button>
                  </Tooltip>

                  <div className="flex gap-2 p-1 rounded-xl bg-slate-900/60 border border-amber-900/30">
                    {(['1W', '1M', '1Y', 'ALL'] as RangeKey[]).map((k) => (
                      <motion.button
                        key={k}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        className={`px-3 py-1.5 rounded-lg text-sm border transition-all ${
                          k === range ? 'bg-amber-800/80 text-amber-50 border-amber-600/50 shadow-lg' : 'bg-transparent text-amber-200/80 border-transparent hover:bg-slate-800/80'
                        }`}
                        onClick={() => setRange(k)}
                      >
                        {k}
                      </motion.button>
                    ))}
                  </div>
                </div>
              </header>
              <NavChart data={nav} />
            </motion.section>
          )}
        </AnimatePresence>

        {/* Positions */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <PositionsTable positions={positions} meta={meta} onEdit={(ticker) => setTxModal({ open: true, mode: 'edit', ticker })} />
        </motion.div>

        {/* Dividendes */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <DividendsTable
            dividends={portfoliosFilter ? dividends.filter((d) => portfoliosFilter.includes(d.portfolio)) : dividends}
            fmt={(n) => fmtMasked(n)}
            onDelete={(id, port, amount) => {
              setDividends((arr) => arr.filter((x) => x.id !== id));
              setCashByPortfolio((p) => ({ ...p, [port]: (p[port] || 0) - amount }));
            }}
            forecastNext={positions[0]?.ticker ? forecast[positions[0].ticker] : null}
          />
        </motion.div>
      </main>

      {/* Modales */}
      <AnimatePresence>
        {showCash && (
          <CashModal
            open
            onClose={() => setShowCash(false)}
            onSubmit={(c) => {
              handleCash(c);
              setShowCash(false);
            }}
            portfolios={allPortfolios.length ? allPortfolios : ['PEA']}
            defaultPortfolio={allPortfolios[0] || 'PEA'}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showPortfolios && (
          <PortfoliosModal
            open
            onClose={() => setShowPortfolios(false)}
            allPortfolios={allPortfolios}
            selected={selectedPortfolios}
            cashByPortfolio={cashByPortfolio}
            onToggle={(p) => setSelectedPortfolios((s) => (s.includes(p) ? s.filter((x) => x !== p) : s.concat(p)))}
            onCreate={({ name, amount }) => {
              const n = name.trim() || 'Portefeuille';
              setPortfolios((prev) => Array.from(new Set(prev.concat(n))));
              if (amount) setCashByPortfolio((prev) => ({ ...prev, [n]: (prev[n] || 0) + amount }));
              setSelectedPortfolios((s) => Array.from(new Set(s.concat(n))));
              setShowPortfolios(false);
              fireConfetti({ particleCount: 100, spread: 80, origin: { y: 0.2 } });
            }}
            totalSelected={totalSelected}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {txModal.open && (
          <TxModal
            open
            mode={txModal.mode}
            initialTicker={txModal.ticker ?? null}
            onClose={() => setTxModal({ open: false, mode: 'add' })}
            portfolios={allPortfolios.length ? allPortfolios : ['PEA']}
            defaultPortfolio={allPortfolios[0] || 'PEA'}
            cashByPortfolio={cashByPortfolio}
            onSubmit={handleTxSubmit}
          />
        )}
      </AnimatePresence>
    </>
  );
}
