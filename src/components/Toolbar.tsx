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
}: Props) {
  const [showPortfolios, setShowPortfolios] = useState(false);

  const totalSelected = useMemo(
    () => selectedPortfolios.reduce((s, p) => s + (cashByPortfolio[p] || 0), 0),
    [selectedPortfolios, cashByPortfolio]
  );

  return (
    <header
      className="af-sticky"
      style={{
        background:
          'linear-gradient(180deg, rgba(6,9,12,.78), rgba(6,9,12,.55))',
        borderBottom: '1px solid rgba(62,82,108,.35)',
        backdropFilter: 'blur(10px)',
      }}
    >
      <div className="af-container py-4 flex items-center justify-between">
        {/* Logo + titre */}
        <div className="flex items-center gap-3">
          <div
            className="h-8 w-8 rounded-lg"
            style={{
              background: 'linear-gradient(135deg,#79b7ff,#c4996c)',
              boxShadow:
                '0 0 18px rgba(121,183,255,.25), 0 0 12px rgba(196,153,108,.18) inset',
            }}
          />
        <h1 className="text-xl font-semibold tracking-tight">{title}</h1>
        </div>

        {/* Boutons */}
        <div className="flex items-center gap-2">
          <button
            className="af-btn af-tab"
            onClick={() => setShowPortfolios(true)}
          >
            Portefeuilles
          </button>

          <button className="af-btn" onClick={onRefresh}>
            Rafraîchir cours
          </button>

          <button className="af-btn" onClick={onOpenCash}>
            Dépôt / Retrait
          </button>

          <button className="af-btn af-btn--primary" onClick={onAddPosition}>
            Ajouter position
          </button>
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
