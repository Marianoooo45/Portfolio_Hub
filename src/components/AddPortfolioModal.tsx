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
}: Props) {
  if (!open) return null;

  return (
    <div className="af-modal">
      <div className="af-backdrop" onClick={onClose} />
      <div
        className="af-card af-card--pad af-enter af-panel rounded-2xl"
        style={{
          width: 560,
          background:
            'linear-gradient(180deg, rgba(10,14,18,.92), rgba(10,14,18,.88))',
          border: '1px solid rgba(62,82,108,.45)',
          boxShadow:
            '0 18px 60px rgba(0,0,0,.6), 0 0 16px rgba(121,183,255,.18)',
        }}
      >
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-base font-semibold">Portefeuilles</h4>
          <button
            className="af-btn af-btn--primary af-pill text-sm"
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
                className="flex items-center gap-3 px-2 py-2 rounded-lg transition"
                style={{
                  background: selected.includes(p)
                    ? 'rgba(121,183,255,.06)'
                    : 'transparent',
                  border: '1px solid rgba(62,82,108,.35)',
                }}
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
          <button className="af-btn af-btn--ghost" onClick={onClose}>
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
}
