// FILL BEFORE LAUNCH (legal requirement §5 TMG/DDG) — production must not ship
// with these placeholders. Tracked in the README launch checklist.
const OPERATOR_NAME = '[OPERATOR NAME]';
const OPERATOR_STREET = '[STREET + NUMBER]';
const OPERATOR_CITY = '[ZIP + CITY]';
const OPERATOR_EMAIL = '[CONTACT EMAIL]';

const ImprintPage = () => (
  <main className="mx-auto max-w-3xl px-4 py-10 text-sm leading-6">
    <h1 className="text-2xl font-semibold">Imprint</h1>
    <h2 className="mt-6 text-lg font-medium">Information pursuant to §5 DDG</h2>
    <p className="mt-2 text-dim">
      {OPERATOR_NAME}<br />
      {OPERATOR_STREET}<br />
      {OPERATOR_CITY}
    </p>
    <h2 className="mt-6 text-lg font-medium">Contact</h2>
    <p className="mt-2 text-dim">E-mail: {OPERATOR_EMAIL}</p>
    <h2 className="mt-6 text-lg font-medium">Responsible for content</h2>
    <p className="mt-2 text-dim">{OPERATOR_NAME}, address as above.</p>
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
