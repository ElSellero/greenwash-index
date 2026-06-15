'use client';
import { usePathname } from 'next/navigation';

/**
 * Floating legal/footer links. On the homepage the mobile bottom sheet already
 * carries these links (see Sidebar), and the chip would collide with the sheet's
 * toggle — so hide it there on mobile; show everywhere else (and on desktop).
 */
export const SiteFooter = () => {
  const onHome = usePathname() === '/';
  return (
    <footer
      className={`pointer-events-auto fixed bottom-2 right-3 z-30 rounded-md border border-panel-edge/60 bg-abyss/80 px-2 py-1 text-[10px] text-dim backdrop-blur ${onHome ? 'hidden md:block' : ''}`}
    >
      <a href="/methodology" className="hover:text-accent">methodology</a> ·{' '}
      <a href="/imprint" className="hover:text-accent">imprint</a> ·{' '}
      <a href="/privacy" className="hover:text-accent">privacy</a>
    </footer>
  );
};
