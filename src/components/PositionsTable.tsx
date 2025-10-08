// src/components/PositionsTable.tsx
'use client';

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  TrendingUp,
  TrendingDown,
  Bitcoin,
  BarChart3,
  Wallet,
  ArrowUpDown,
} from 'lucide-react';
import type { Position } from '../app/page';

type SortKey = 'ticker' | 'value' | 'pnlAbs' | 'pnlPct' | 'weight';
type SortDir = 'asc' | 'desc';
type FilterType = 'all' | 'stock' | 'crypto' | 'etf';

export default function PositionsTable({
  positions,
  meta,
  onEdit,
  className,
}: {
  positions: Position[];
  meta: Record<string, { name: string; currency?: string; logo?: string }>;
  onEdit: (ticker: string) => void;
  className?: string;
}) {
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('value');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [filterType, setFilterType] = useState<FilterType>('all');

  const filtered = useMemo(() => {
    let result = [...positions];

    // Filtre par recherche (safe si meta[ticker]?.name est manquant)
    if (search) {
      const q = search.toLowerCase();
      result = result.filter((p) => {
        const nm = meta[p.ticker]?.name?.toLowerCase() ?? '';
        return p.ticker.toLowerCase().includes(q) || nm.includes(q);
      });
    }

    // Filtre par type d'actif
    if (filterType !== 'all') {
      result = result.filter((p) => p.type === filterType);
    }

    // Tri
    result.sort((a, b) => {
      switch (sortKey) {
        case 'ticker':
          return sortDir === 'asc'
            ? a.ticker.localeCompare(b.ticker)
            : b.ticker.localeCompare(a.ticker);
        case 'value':
          return sortDir === 'asc' ? a.value - b.value : b.value - a.value;
        case 'pnlAbs':
          return sortDir === 'asc' ? a.pnlAbs - b.pnlAbs : b.pnlAbs - a.pnlAbs;
        case 'pnlPct':
          return sortDir === 'asc' ? a.pnlPct - b.pnlPct : b.pnlPct - a.pnlPct;
        case 'weight':
          return sortDir === 'asc' ? a.weight - b.weight : b.weight - a.weight;
        default:
          return 0;
      }
    });

    return result;
  }, [positions, search, sortKey, sortDir, filterType, meta]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('desc');
    }
  };

  const getTypeIcon = (type?: 'stock' | 'crypto' | 'etf') => {
    switch (type) {
      case 'crypto':
        return <Bitcoin className="w-4 h-4 text-orange-400" />;
      case 'etf':
        return <BarChart3 className="w-4 h-4 text-purple-400" />;
      default:
        return <Wallet className="w-4 h-4 text-blue-400" />;
    }
  };

  const getTypeBadge = (type?: 'stock' | 'crypto' | 'etf') => {
    const config = {
      crypto: {
        bg: 'bg-orange-900/20',
        border: 'border-orange-600/40',
        text: 'text-orange-400',
        label: 'CRYPTO',
      },
      etf: {
        bg: 'bg-purple-900/20',
        border: 'border-purple-600/40',
        text: 'text-purple-400',
        label: 'ETF',
      },
      stock: {
        bg: 'bg-blue-900/20',
        border: 'border-blue-600/40',
        text: 'text-blue-400',
        label: 'STOCK',
      },
    } as const;
    const c = config[type || 'stock'];
    return (
      <span
        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium border ${c.bg} ${c.border} ${c.text}`}
      >
        {getTypeIcon(type)}
        {c.label}
      </span>
    );
  };

  return (
    <div
      className={`af-card af-card--pad rounded-2xl bg-gradient-to-br from-slate-800/60 to-slate-900/60 backdrop-blur-xl border border-amber-900/20 shadow-2xl p-4 text-amber-50 ${
        className ?? ''
      }`}
    >
      <header className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold tracking-tight">Positions</h3>
          <p className="text-xs text-amber-200/60 mt-1">
            {filtered.length} position
            {filtered.length > 1 ? 's' : ''} affichée
            {filtered.length > 1 ? 's' : ''}
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Filtres par type */}
          <div className="flex gap-1 p-1 rounded-xl bg-slate-900/60 border border-amber-900/30">
            {(['all', 'stock', 'crypto', 'etf'] as FilterType[]).map((type) => (
              <motion.button
                key={type}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setFilterType(type)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  filterType === type
                    ? 'bg-amber-800/80 text-amber-50 border border-amber-600/50'
                    : 'bg-transparent text-amber-200/70 hover:bg-slate-800/80'
                }`}
              >
                {type === 'all' ? 'Tous' : type.toUpperCase()}
              </motion.button>
            ))}
          </div>

          {/* Recherche */}
          <div className="relative">
            <Search className="w-4 h-4 text-amber-400/50 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="Rechercher..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 pr-4 py-2 rounded-xl bg-slate-900/60 border border-amber-900/30 text-amber-100 text-sm focus:border-amber-700/50 focus:outline-none transition-all w-64"
            />
          </div>
        </div>
      </header>

      <div className="overflow-hidden rounded-2xl border border-amber-900/30">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm text-amber-100">
            <thead className="bg-slate-950/70 text-amber-200 text-xs uppercase tracking-wide">
              <tr>
                <th className="px-4 py-3 text-left">Type</th>
                <th className="px-4 py-3 text-left">Nom</th>
                <th className="px-4 py-3 text-left">
                  <button
                    onClick={() => toggleSort('ticker')}
                    className="flex items-center gap-1 hover:text-amber-100 transition"
                  >
                    Ticker
                    <ArrowUpDown className="w-3 h-3" />
                  </button>
                </th>
                <th className="px-4 py-3 text-right">Qté</th>
                <th className="px-4 py-3 text-right">PRU</th>
                <th className="px-4 py-3 text-right">Dernier</th>
                <th className="px-4 py-3 text-right">
                  <button
                    onClick={() => toggleSort('pnlAbs')}
                    className="flex items-center gap-1 ml-auto hover:text-amber-100 transition"
                  >
                    PnL €
                    <ArrowUpDown className="w-3 h-3" />
                  </button>
                </th>
                <th className="px-4 py-3 text-right">
                  <button
                    onClick={() => toggleSort('pnlPct')}
                    className="flex items-center gap-1 ml-auto hover:text-amber-100 transition"
                  >
                    PnL %
                    <ArrowUpDown className="w-3 h-3" />
                  </button>
                </th>
                <th className="px-4 py-3 text-right">
                  <button
                    onClick={() => toggleSort('value')}
                    className="flex items-center gap-1 ml-auto hover:text-amber-100 transition"
                  >
                    Valeur
                    <ArrowUpDown className="w-3 h-3" />
                  </button>
                </th>
                <th className="px-4 py-3 text-right">
                  <button
                    onClick={() => toggleSort('weight')}
                    className="flex items-center gap-1 ml-auto hover:text-amber-100 transition"
                  >
                    Poids
                    <ArrowUpDown className="w-3 h-3" />
                  </button>
                </th>
                <th className="px-4 py-3 text-right">Depuis</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>

            <tbody>
              <AnimatePresence mode="popLayout">
                {filtered.map((r, idx) => (
                  <motion.tr
                    key={r.ticker}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    transition={{ delay: idx * 0.02 }}
                    className="border-t border-amber-900/20 hover:bg-slate-800/40 transition group"
                  >
                    <td className="px-4 py-3">{getTypeBadge(r.type)}</td>

                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <motion.img
                          whileHover={{ scale: 1.2, rotate: 5 }}
                          src={meta[r.ticker]?.logo}
                          className="w-6 h-6 rounded-full border border-amber-900/40 object-contain bg-slate-900"
                          alt=""
                        />
                        <div>
                          <div className="font-medium">
                            {meta[r.ticker]?.name ?? r.ticker}
                          </div>
                          <span className="text-xs text-amber-200/50">
                            {meta[r.ticker]?.currency ?? 'EUR'}
                          </span>
                        </div>
                      </div>
                    </td>

                    <td className="px-4 py-3 font-mono font-medium">
                      {r.ticker}
                    </td>

                    <td className="px-4 py-3 text-right tabular-nums">
                      {r.qty.toFixed(4)}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      {r.avgCost.toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums font-medium">
                      {r.last.toFixed(2)}
                    </td>

                    <td className="px-4 py-3 text-right tabular-nums">
                      <div
                        className={`inline-flex items-center gap-1 px-2 py-1 rounded-md ${
                          r.pnlAbs >= 0
                            ? 'bg-emerald-900/20 text-emerald-400'
                            : 'bg-rose-900/20 text-rose-400'
                        }`}
                      >
                        {r.pnlAbs >= 0 ? (
                          <TrendingUp className="w-3 h-3" />
                        ) : (
                          <TrendingDown className="w-3 h-3" />
                        )}
                        {r.pnlAbs.toLocaleString('fr-FR', {
                          maximumFractionDigits: 2,
                        })}{' '}
                        €
                      </div>
                    </td>

                    <td className="px-4 py-3 text-right tabular-nums">
                      <span
                        className={`font-semibold ${
                          r.pnlPct >= 0 ? 'text-emerald-400' : 'text-rose-400'
                        }`}
                      >
                        {r.pnlPct >= 0 ? '+' : ''}
                        {(r.pnlPct * 100).toFixed(2)}%
                      </span>
                    </td>

                    <td className="px-4 py-3 text-right tabular-nums font-semibold">
                      {r.value.toFixed(2)} €
                    </td>

                    <td className="px-4 py-3 text-right tabular-nums">
                      <div className="inline-flex items-center gap-2">
                        <div className="w-12 h-2 bg-slate-700 rounded-full overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${r.weight * 100}%` }}
                            transition={{ duration: 0.5, delay: idx * 0.02 }}
                            className="h-full bg-gradient-to-r from-amber-600 to-amber-800"
                          />
                        </div>
                        <span className="text-xs">
                          {(r.weight * 100).toFixed(1)}%
                        </span>
                      </div>
                    </td>

                    <td className="px-4 py-3 text-right tabular-nums text-amber-200/60">
                      {r.since ?? '—'}
                    </td>

                    <td className="px-4 py-3 text-right">
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        className="px-3 py-1.5 rounded-xl bg-slate-800/70 border border-amber-900/30 text-amber-100 hover:bg-slate-700/70 transition text-xs font-medium opacity-0 group-hover:opacity-100"
                        onClick={() => onEdit(r.ticker)}
                      >
                        Modifier
                      </motion.button>
                    </td>
                  </motion.tr>
                ))}
              </AnimatePresence>

              {!filtered.length && (
                <tr>
                  <td
                    className="px-4 py-12 text-center text-amber-200/70"
                    colSpan={12}
                  >
                    {search || filterType !== 'all'
                      ? 'Aucune position ne correspond aux filtres.'
                      : 'Aucune position. Ajoute du cash, puis une position.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
