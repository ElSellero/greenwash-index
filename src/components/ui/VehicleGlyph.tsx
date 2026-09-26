const SRC = { jet: '/icons/jet.svg', yacht: '/icons/yacht.svg' } as const;
const TONE = { jet: 'text-jet', yacht: 'text-yacht' } as const;

/** The globe's jet/yacht silhouette as an inline glyph, tinted in the vehicle's globe colour. */
export const VehicleGlyph = ({ type, muted = false }: { type: 'jet' | 'yacht'; muted?: boolean }) => {
  const mask = `url(${SRC[type]}) center / contain no-repeat`;
  return (
    <span aria-hidden className={`inline-block size-3.5 shrink-0 bg-current ${muted ? 'text-dim opacity-60' : TONE[type]}`}
      style={{ mask, WebkitMask: mask }} />
  );
};
