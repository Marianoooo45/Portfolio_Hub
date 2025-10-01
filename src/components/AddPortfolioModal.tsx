// src/components/AddPortfolioModal.tsx
'use client';

type Props = {
  open: boolean;
  onClose: () => void;
  allPortfolios: string[];
  selected: string[];
  cashByPortfolio: Record<string, number>;
  onToggle: (p: string) => void;
  onAddPortfolio: () => void;
  onSetDefault?: (p: string) => void;
  totalSelected: number;
  className?: string;
};

export default function PortfoliosModal({
  open,
  onClose,
  allPortfolios,
  selected,
  cashByPortfolio,
  onToggle,
  onAddPortfolio,
  onSetDefault,
  totalSelected,
  className,
}: Props) {
  if (!open) return null;

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
        className="relative z-10 af-card af-card--pad af-enter af-panel rounded-2xl bg-gradient-to-br from-slate-900/80 to-slate-950/80 backdrop-blur-xl border border-amber-900/40 shadow-2xl text-amber-50 w-full max-w-xl"
      >
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-base font-semibold">Portefeuilles</h4>
          <button
            /* theme */
            className="af-btn af-btn--primary af-pill text-sm px-3 py-2 rounded-xl bg-gradient-to-br from-amber-700 to-amber-900 text-amber-50 border border-amber-600/40 hover:from-amber-600 hover:to-amber-800 font-medium"
            onClick={onAddPortfolio}
          >
            + Nouveau
          </button>
        </div>

        <p className="af-dim text-sm mb-3">
          Sélection multiple. Solde sélectionné :{' '}
          <span className="font-medium">
            {totalSelected.toLocaleString('fr-FR', { maximumFractionDigits: 2 })}{' '}
            €
          </span>
        </p>

        <div className="max-h-80 overflow-auto space-y-1 pr-1">
          {allPortfolios.length ? (
            allPortfolios.map((p) => (
              <div
                key={p}
                /* theme */
                className={`flex items-center gap-3 px-3 py-2 rounded-xl border transition ${
                  selected.includes(p)
                    ? 'border-amber-600/50 bg-amber-900/20'
                    : 'border-amber-900/30 bg-slate-900/40 hover:bg-slate-800/40'
                }`}
              >
                <input
                  type="checkbox"
                  checked={selected.includes(p)}
                  onChange={() => onToggle(p)}
                />
                <div className="flex flex-col">
                  <span className="font-medium">{p}</span>
                  {onSetDefault && (
                    <button
                      className="af-kpi-label text-[11px] text-left hover:underline"
                      onClick={() => onSetDefault(p)}
                    >
                      Définir comme défaut
                    </button>
                  )}
                </div>
                <span className="af-dim text-sm ml-auto">
                  {(cashByPortfolio[p] || 0).toLocaleString('fr-FR', {
                    maximumFractionDigits: 2,
                  })}{' '}
                  €
                </span>
              </div>
            ))
          ) : (
            <div className="af-dim text-sm">
              Aucun portefeuille. Ajoute un dépôt pour en créer un.
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 mt-4">
          <button
            /* theme */
            className="af-btn af-btn--ghost px-3 py-2 rounded-xl bg-slate-800/70 border border-amber-900/30 text-amber-100 hover:bg-slate-700/70"
            onClick={onClose}
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
}
