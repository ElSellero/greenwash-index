import type { Metadata } from 'next';
import { ImprintDetails } from './ImprintDetails';

export const metadata: Metadata = {
  title: 'Imprint — Greenwash Index',
  robots: { index: false, follow: false },
};

const ImprintPage = () => (
  <main className="mx-auto max-w-3xl px-4 pb-14 pt-14 text-sm leading-6 sm:px-6 lg:px-8">
    <h1 className="text-2xl font-semibold">Imprint</h1>
    <h2 className="mt-6 text-lg font-medium">Information pursuant to § 5 DDG</h2>
    <ImprintDetails />
    <h2 className="mt-6 text-lg font-medium">Editorial note</h2>
    <p className="mt-2 text-dim">
      The Greenwash Index is a satirical, editorial data project. Scores are opinions derived
      from publicly sourced information — see the{' '}
      <a href="/methodology" className="text-accent hover:underline">methodology</a>.
      Substantiated correction requests are honored; see contact above.
    </p>
  </main>
);

export default ImprintPage;
