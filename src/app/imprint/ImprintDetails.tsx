'use client';
import { useHydrated } from '@/lib/useHydrated';

const NAME = process.env.NEXT_PUBLIC_IMPRINT_NAME;
const STREET = process.env.NEXT_PUBLIC_IMPRINT_STREET;
const CITY = process.env.NEXT_PUBLIC_IMPRINT_CITY;
const EMAIL = process.env.NEXT_PUBLIC_IMPRINT_EMAIL;

export const ImprintDetails = () => {
  const show = useHydrated();

  if (show) {
    if (!NAME || !STREET || !CITY || !EMAIL) {
      return <p className="mt-2 text-dim">Operator details not configured for this environment.</p>;
    }
    return (
      <>
        <p className="mt-2 text-dim">
          {NAME}<br />
          {STREET}<br />
          {CITY}<br />
          Deutschland
        </p>
        <h2 className="mt-6 text-lg font-medium">Contact</h2>
        <p className="mt-2 text-dim">
          E-mail: <a className="text-accent hover:underline" href={`mailto:${EMAIL}`}>{EMAIL}</a>
        </p>
        <h2 className="mt-6 text-lg font-medium">Responsible for content (§ 18 Abs. 2 MStV)</h2>
        <p className="mt-2 text-dim">{NAME}, address as above.</p>
      </>
    );
  }

  // Pre-hydration / no-JS. The <noscript> style hides the spinner and shows a
  // notice; full postal address stays JavaScript-only (anti-scraping).
  return (
    <>
      <noscript>
        <style dangerouslySetInnerHTML={{ __html: '.gwx-imprint-pending{display:none}' }} />
        <p className="mt-2 text-dim">
          The full operator details are displayed with JavaScript enabled. Without JavaScript you
          can still reach the operator by e-mail at{' '}
          <a className="text-accent hover:underline" href={`mailto:${EMAIL}`}>{EMAIL}</a>; the
          complete postal address pursuant to § 5 DDG appears once JavaScript is enabled.
        </p>
      </noscript>
      <p className="gwx-imprint-pending mt-2 text-dim">Loading operator details…</p>
    </>
  );
};
