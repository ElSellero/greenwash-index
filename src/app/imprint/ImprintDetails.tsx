'use client';
import { useSyncExternalStore } from 'react';

const NAME = process.env.NEXT_PUBLIC_IMPRINT_NAME;
const STREET = process.env.NEXT_PUBLIC_IMPRINT_STREET;
const CITY = process.env.NEXT_PUBLIC_IMPRINT_CITY;
const EMAIL = process.env.NEXT_PUBLIC_IMPRINT_EMAIL;

const emptySubscribe = () => () => {};
const useHydrated = () => useSyncExternalStore(emptySubscribe, () => true, () => false);

export const ImprintDetails = () => {
  const show = useHydrated();

  if (!show) {
    return <p className="mt-2 text-dim">Loading operator details…</p>;
  }
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
};
