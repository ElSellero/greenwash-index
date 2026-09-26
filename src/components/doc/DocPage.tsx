import Link from 'next/link';

type TocItem = { id: string; label: string };
type Page = '/methodology' | '/imprint' | '/privacy';

const PAGES: { href: Page; label: string }[] = [
  { href: '/methodology', label: 'Methodology' },
  { href: '/imprint', label: 'Imprint' },
  { href: '/privacy', label: 'Privacy' },
];

const hud = 'font-num text-[11px] uppercase tracking-[0.25em]';

const Backdrop = () => (
  <>
    <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-[30rem]
      bg-[radial-gradient(60rem_22rem_at_85%_-8%,rgb(56_189_248/0.16),transparent_60%),radial-gradient(38rem_18rem_at_8%_-4%,rgb(232_121_249/0.10),transparent_60%)]" />
    <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-[30rem] opacity-50
      [background-image:linear-gradient(var(--color-grid)_1px,transparent_1px),linear-gradient(90deg,var(--color-grid)_1px,transparent_1px)]
      [background-size:36px_36px] [mask-image:linear-gradient(to_bottom,black,transparent)]" />
  </>
);

const Toc = ({ items }: { items: TocItem[] }) => (
  <nav aria-label="On this page" className="hidden lg:block">
    <div className="sticky top-8">
      <p className={`${hud} text-dim`}>On this page</p>
      <ol className="mt-3 space-y-1.5 border-l border-panel-edge">
        {items.map((item, i) => (
          <li key={item.id}>
            <a href={`#${item.id}`}
              className="-ml-px flex gap-2 border-l border-transparent py-0.5 pl-3 text-xs text-dim transition hover:border-accent hover:text-white">
              <span className="font-num text-accent/70">{String(i + 1).padStart(2, '0')}</span>{item.label}
            </a>
          </li>
        ))}
      </ol>
    </div>
  </nav>
);

/** Shared frame for the text pages: back-to-globe bar, HUD header, optional contents rail, page switcher. */
export const DocPage = ({ current, eyebrow, title, lede, toc, children }: {
  current: Page;
  eyebrow: string;
  title: string;
  lede?: React.ReactNode;
  toc?: TocItem[];
  children: React.ReactNode;
}) => (
  <div className="relative min-h-dvh overflow-hidden">
    <Backdrop />
    <header className="relative mx-auto flex max-w-5xl items-center justify-between px-4 pt-6 sm:px-6">
      <Link href="/" className={`group flex min-h-11 items-center gap-2 ${hud} text-dim transition hover:text-white`}>
        <span aria-hidden className="transition-transform group-hover:-translate-x-0.5">←</span>Back to the globe
      </Link>
      <span className={`${hud} hidden text-dim sm:inline`}>Greenwash Index</span>
    </header>
    <main className="relative mx-auto max-w-5xl px-4 pb-20 pt-8 sm:px-6">
      <p className={`${hud} text-accent`}>{eyebrow}</p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight text-white sm:text-4xl">{title}</h1>
      {lede && <p className="mt-3 max-w-2xl text-base leading-7 text-slate-300">{lede}</p>}
      <div className={`mt-12 ${toc ? 'lg:grid lg:grid-cols-[11rem_minmax(0,1fr)] lg:gap-14' : 'max-w-3xl'}`}>
        {toc && <Toc items={toc} />}
        <div className="min-w-0 space-y-12 text-sm leading-6">{children}</div>
      </div>
      <nav aria-label="More pages" className="mt-20 flex flex-wrap gap-2 border-t border-panel-edge pt-6">
        {PAGES.map((p) => (
          <Link key={p.href} href={p.href} aria-current={p.href === current ? 'page' : undefined}
            className={`flex min-h-9 items-center rounded-full border px-3.5 text-xs transition ${p.href === current
              ? 'border-accent/50 bg-accent/10 text-accent'
              : 'border-panel-edge text-dim hover:border-accent/40 hover:text-white'}`}>
            {p.label}
          </Link>
        ))}
      </nav>
    </main>
  </div>
);

/** A numbered section of a text page. */
export const DocSection = ({ id, index, title, children }: {
  id: string;
  index: number;
  title: string;
  children: React.ReactNode;
}) => (
  <section id={id} aria-labelledby={`${id}-title`} className="scroll-mt-8">
    <h2 id={`${id}-title`} className="flex items-baseline gap-3 font-num text-xs font-semibold uppercase tracking-[0.2em] text-slate-100">
      <span className="text-accent">{String(index).padStart(2, '0')}</span>{title}
    </h2>
    <div className="mt-4 space-y-3 text-slate-400 [&_b]:font-medium [&_b]:text-slate-200">{children}</div>
  </section>
);

/** A raised panel for the one thing in a section that matters most (formula, contact, …). */
export const DocCard = ({ children, className = '' }: { children: React.ReactNode; className?: string }) => (
  <div className={`rounded-xl border border-panel-edge bg-panel/80 p-4 shadow-[0_0_24px_-12px_rgb(56_189_248/0.35)] ${className}`}>
    {children}
  </div>
);
