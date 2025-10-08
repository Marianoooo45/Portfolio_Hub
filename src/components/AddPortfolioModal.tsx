// src/components/AddPortfolioModal.tsx
'use client';
import { useEffect, useRef, useState } from 'react';

export type NewPortfolioPayload = { name: string; amount: number };

type Props = {
  open: boolean;
  onClose: () => void;

  /* Sélecteur */
  allPortfolios: string[];
  selected: string[];
  cashByPortfolio: Record<string, number>;
  onToggle: (p: string) => void;
  totalSelected: number;

  /* Création intégrée */
  onCreate: (p: NewPortfolioPayload) => void;

  className?: string;
};

export default function PortfoliosModal({
  open,
  onClose,
  allPortfolios,
  selected,
  cashByPortfolio,
  onToggle,
  onCreate,
  totalSelected = 0,
  className,
}: Props) {
  if (!open) return null;

  const panelRef = useRef<HTMLDivElement>(null);
  const [name, setName] = useState('');
  const [amount, setAmount] = useState<number>(0);

  // Fermer sur ESC
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const handleBackdrop = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!panelRef.current) return;
    if (!panelRef.current.contains(e.target as Node)) onClose();
  };

  const canCreate = name.trim().length > 0;

  return (
    <div
      className={`af-modal fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 ${className ?? ''}`}
      onMouseDown={handleBackdrop}
    >
      {/* Backdrop */}
      <div className="af-backdrop absolute inset-0 bg-black/70 backdrop-blur-md" />

      {/* Panel */}
      <div
        ref={panelRef}
        className="relative z-10 af-card af-card--pad af-enter af-panel rounded-2xl bg-gradient-to-br from-slate-900/80 to-slate-950/80 backdrop-blur-xl border border-amber-900/40 shadow-2xl text-amber-50 w-full max-w-xl"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-base font-semibold">Portefeuilles</h4>
          <button
            className="af-btn af-btn--ghost px-3 py-2 rounded-xl bg-slate-800/70 border border-amber-900/30 text-amber-100 hover:bg-slate-700/70"
            onClick={onClose}
          >
            Fermer
          </button>
        </div>

        <p className="af-dim text-sm mb-3">
          Sélection multiple. Solde sélectionné :{' '}
          <span className="font-medium">
            {(Number(totalSelected) || 0).toLocaleString('fr-FR', { maximumFractionDigits: 2 })} €
          </span>
        </p>

        {/* Liste des portefeuilles */}
        <div className="max-h-64 overflow-auto space-y-1 pr-1 mb-4">
          {allPortfolios.length ? (
            allPortfolios.map((p) => (
              <label
                key={p}
                className={`flex items-center gap-3 px-3 py-2 rounded-xl border transition cursor-pointer ${
                  selected.includes(p)
                    ? 'border-amber-600/50 bg-amber-900/20'
                    : 'border-amber-900/30 bg-slate-900/40 hover:bg-slate-800/40'
                }`}
              >
                <input
                  type="checkbox"
                  className="accent-amber-700"
                  checked={selected.includes(p)}
                  onChange={() => onToggle(p)}
                />
                <span className="font-medium">{p}</span>
                <span className="af-dim text-sm ml-auto">
                  {(cashByPortfolio[p] || 0).toLocaleString('fr-FR', { maximumFractionDigits: 2 })} €
                </span>
              </label>
            ))
          ) : (
            <div className="af-dim text-sm">
              Aucun portefeuille. Ajoute un dépôt pour en créer un, ou utilise le formulaire ci-dessous.
            </div>
          )}
        </div>

        {/* Création d'un portefeuille */}
        <div className="rounded-2xl border border-amber-900/30 bg-slate-900/50 p-3">
          <h5 className="text-sm font-semibold mb-2">Nouveau portefeuille</h5>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <label className="stack sm:col-span-2">
              <span className="af-kpi-label">Nom</span>
              <input
                className="af-input"
                placeholder="Ex. PEA, CTO, Crypto…"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </label>
            <label className="stack">
              <span className="af-kpi-label">Montant initial (€)</span>
              <input
                className="af-input"
                type="number"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(Number(e.target.value))}
              />
            </label>
          </div>

          <div className="flex justify-end mt-3">
            <button
              className={`af-btn af-btn--primary px-3 py-2 rounded-xl bg-gradient-to-br from-amber-700 to-amber-900 text-amber-50 border border-amber-600/40 hover:from-amber-600 hover:to-amber-800 font-medium disabled:opacity-50`}
              onClick={() => {
                if (!canCreate) return;
                onCreate({ name: name.trim(), amount: Number(amount) || 0 });
                setName('');
                setAmount(0);
              }}
              disabled={!canCreate}
            >
              Créer
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
