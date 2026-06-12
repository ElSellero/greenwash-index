'use client';

const adsActive = Boolean(process.env.NEXT_PUBLIC_ADSENSE_CLIENT);

const PrivacyPage = () => (
  <main className="mx-auto max-w-3xl px-4 py-10 text-sm leading-6">
    <h1 className="text-2xl font-semibold">Privacy Policy</h1>

    <h2 className="mt-8 text-lg font-medium">Hosting &amp; server logs</h2>
    <p className="mt-2 text-dim">
      This site is hosted on Vercel (Vercel Inc., USA). Vercel processes technical request data
      (IP address, user agent, timestamps) in server logs to deliver and secure the service
      (legal basis: Art. 6(1)(f) GDPR). Logs are retained only as long as operationally necessary.
    </p>

    <h2 className="mt-8 text-lg font-medium">Local storage (favorites)</h2>
    <p className="mt-2 text-dim">
      Your favorite list is stored exclusively in your browser&apos;s localStorage under the key
      &quot;greenwash-index&quot;. It never leaves your device, is strictly functional, and requires
      no consent (§25(2) TDDDG). Clearing site data removes it.
    </p>

    <h2 className="mt-8 text-lg font-medium">Cookies, consent &amp; advertising</h2>
    {adsActive ? (
      <>
        <p className="mt-2 text-dim">
          We use Google AdSense together with Google&apos;s certified consent management platform
          (TCF 2.2). Ads, cookies and any profiling only run after your explicit consent via the
          consent dialog (Art. 6(1)(a) GDPR). You can withdraw or change your choice at any time:
        </p>
        <button
          onClick={() => window.googlefc?.showRevocationMessage?.()}
          className="mt-2 cursor-pointer rounded border border-accent/40 px-3 py-1.5 text-accent transition hover:bg-accent/10"
        >
          Re-open consent settings
        </button>
      </>
    ) : (
      <p className="mt-2 text-dim">
        Advertising is currently <b>not active</b>. This site sets no advertising or tracking
        cookies whatsoever — there is nothing to consent to. If advertising is activated in the
        future, Google&apos;s certified consent management platform (TCF 2.2) will ask for your
        explicit consent before any ad cookies are set, and this section will offer a control to
        change your choice at any time.
      </p>
    )}

    <h2 className="mt-8 text-lg font-medium">Your rights (GDPR Art. 15–21)</h2>
    <p className="mt-2 text-dim">
      You have the right to access, rectification, erasure, restriction of processing, data
      portability and objection regarding your personal data. Contact: see{' '}
      <a href="/imprint" className="text-accent hover:underline">imprint</a>. You may also lodge a
      complaint with a supervisory authority.
    </p>

    <h2 className="mt-8 text-lg font-medium">No accounts, no extra tracking</h2>
    <p className="mt-2 text-dim">
      This site has no user accounts, no newsletters and no analytics or tracking beyond the
      consent-gated advertising described above.
    </p>
  </main>
);

export default PrivacyPage;
