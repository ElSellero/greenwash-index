const FILL = { pos: 'bg-pos/80', neg: 'bg-neg/80' } as const;

/** A single-series magnitude list: label, thin bar, value — readable as a plain table too. */
export const BarList = ({ rows, tone, caption, unit = '' }: {
  rows: { label: string; value: number }[];
  tone: keyof typeof FILL;
  caption: string;
  unit?: string;
}) => {
  const max = Math.max(...rows.map((r) => r.value), 1);
  return (
    <table className="w-full text-left text-xs">
      <caption className="sr-only">{caption}</caption>
      <thead className="sr-only"><tr><th scope="col">Item</th><th scope="col">Value{unit && ` (${unit})`}</th></tr></thead>
      <tbody>
        {rows.map((r) => (
          <tr key={r.label} className="border-t border-panel-edge/60" title={`${r.label}: ${r.value}${unit && ` ${unit}`}`}>
            <th scope="row" className="py-1.5 pr-4 font-normal text-slate-300">{r.label}</th>
            <td className="w-[55%] py-1.5">
              <div className="flex items-center gap-3">
                <div className="h-1.5 flex-1 rounded-full bg-grid">
                  <div className={`h-full rounded-full ${FILL[tone]}`} style={{ width: `${(r.value / max) * 100}%` }} />
                </div>
                <span className="w-10 shrink-0 text-right font-num tabular-nums text-slate-200">{r.value}</span>
              </div>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
};
