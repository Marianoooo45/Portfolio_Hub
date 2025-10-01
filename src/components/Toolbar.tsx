// src/components/Toolbar.tsx
'use client';

import { useMemo, useState } from 'react';
import PortfoliosModal from './PortfoliosModal';

type Props = {
  title: string;
  cashByPortfolio: Record<string, number>;
  allPortfolios: string[];
  selectedPortfolios: string[];
  onTogglePortfolio: (p: string) => void;
  onSetDefault?: (p: string) => void;
  onRefresh: () => void;
  onOpenCash: () => void;
  onAddPosition: () => void;
  onAddPortfolio: () => void;
  className?: string;
};

export default function Toolbar({
  title,
  cashByPortfolio,
  allPortfolios,
  selectedPortfolios,
  onTogglePortfolio,
  onSetDefault,
  onRefresh,
  onOpenCash,
  onAddPosition,
  onAddPortfolio,
  className,
}: Props) {
  const [showPortfolios, setShowPortfolios] = useState(false);

  const totalSelected = useMemo(
    () => selectedPortfolios.reduce((s, p) => s + (cashByPortfolio[p] || 0), 0),
    [selectedPortfolios, cashByPortfolio]
  );

  return (
    <header className={`af-sticky ${className ?? ''}`}>
      <div className="pt-4">
        <div className="max-w-7xl mx-auto">
          <div
            /* theme */
            className="px-4 py-3 bg-gradient-to-br from-slate-900/70 to-slate-950/70 backdrop-blur-xl rounded-2xl border border-amber-900/30 shadow-2xl flex items-center justify-between"
          >
            {/* Logo + titre */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-700 to-amber-900 flex items-center justify-center shadow-amber-900/40 shadow-xl" />
              <h1 className="text-lg md:text-xl font-bold text-amber-50 tracking-tight">{title}</h1>
            </div>

            {/* Boutons */}
            <div className="flex items-center gap-2">
              <button
                /* theme */
                className="af-btn af-tab px-3 py-2 rounded-xl bg-slate-800/70 border border-amber-900/30 text-amber-100 hover:bg-slate-700/70"
                onClick={() => setShowPortfolios(true)}
              >
                Portefeuilles
              </button>

              <button
                /* theme */
                className="af-btn px-3 py-2 rounded-xl bg-slate-800/70 border border-amber-900/30 text-amber-100 hover:bg-slate-700/70"
                onClick={onRefresh}
              >
                Rafraîchir cours
              </button>

              <button
                /* theme */
                className="af-btn px-3 py-2 rounded-xl bg-slate-800/70 border border-amber-900/30 text-amber-100 hover:bg-slate-700/70"
                onClick={onOpenCash}
              >
                Dépôt / Retrait
              </button>

              <button
                /* theme */
                className="af-btn af-btn--primary px-3 py-2 rounded-xl bg-gradient-to-br from-amber-700 to-amber-900 text-amber-50 border border-amber-600/40 hover:from-amber-600 hover:to-amber-800 font-medium"
                onClick={onAddPosition}
              >
                Ajouter position
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Modale Portefeuilles */}
      {showPortfolios && (
        <PortfoliosModal
          open
          onClose={() => setShowPortfolios(false)}
          allPortfolios={allPortfolios}
          selected={selectedPortfolios}
          cashByPortfolio={cashByPortfolio}
          onToggle={onTogglePortfolio}
          onAddPortfolio={() => {
            setShowPortfolios(false);
            onAddPortfolio();
          }}
          onSetDefault={onSetDefault}
          totalSelected={totalSelected}
        />
      )}
    </header>
  );
}
