'use client';
import { useHydrated } from '@/lib/useHydrated';
import { CONTACT } from '@/lib/contact';
import { DocCard } from '@/components/doc/DocPage';

const NAME = process.env.NEXT_PUBLIC_IMPRINT_NAME;
const STREET = process.env.NEXT_PUBLIC_IMPRINT_STREET;
const CITY = process.env.NEXT_PUBLIC_IMPRINT_CITY;

const link = 'text-accent hover:underline';
const label = 'font-num text-[10px] uppercase tracking-[0.2em] text-dim';

const External = ({ href, children }: { href: string; children: React.ReactNode }) => (
  <a className={link} href={href} target="_blank" rel="noopener noreferrer">{children}</a>
);

export const ImprintDetails = () => {
  const show = useHydrated();

  if (!show) {
    // Pre-hydration / no-JS: postal address and e-mail stay JavaScript-only (anti-scraping).
    return (
      <>
        <noscript>
          <style dangerouslySetInnerHTML={{ __html: '.gwx-imprint-pending{display:none}' }} />
          <p>
            The operator&apos;s postal address and e-mail are displayed with JavaScript enabled.
            {CONTACT.issuesUrl && <> Without JavaScript you can reach us via{' '}
              <External href={CONTACT.issuesUrl}>GitHub issues</External>.</>}
          </p>
        </noscript>
        <p className="gwx-imprint-pending">Loading operator details…</p>
      </>
    );
  }

  const postal = NAME && STREET && CITY;
  const contact = CONTACT.email || CONTACT.issuesUrl || CONTACT.repoUrl;
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <DocCard>
        <p className={label}>Operator</p>
        {postal ? (
          <p className="mt-2 text-slate-200">
            {NAME}<br />
            {STREET}<br />
            {CITY}<br />
            Deutschland
          </p>
        ) : (
          <p className="mt-2">Operator details not configured for this environment.</p>
        )}
      </DocCard>
      <DocCard>
        <p className={label}>Contact</p>
        {contact ? (
          <ul className="mt-2 space-y-0.5">
            {CONTACT.email && (
              <li>E-mail: <a className={link} href={`mailto:${CONTACT.email}`}>{CONTACT.email}</a></li>
            )}
            {CONTACT.issuesUrl && (
              <li>Corrections &amp; replies: <External href={CONTACT.issuesUrl}>GitHub issues</External></li>
            )}
            {CONTACT.repoUrl && <li>Source code: <External href={CONTACT.repoUrl}>repository</External></li>}
          </ul>
        ) : (
          <p className="mt-2">Contact details not configured for this environment.</p>
        )}
      </DocCard>
      {postal && (
        <DocCard className="sm:col-span-2">
          <p className={label}>Responsible for editorial content (§ 18 Abs. 2 MStV)</p>
          <p className="mt-2 text-slate-200">{NAME}, address as above.</p>
        </DocCard>
      )}
    </div>
  );
};
