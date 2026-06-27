'use client';

const adsActive = Boolean(process.env.NEXT_PUBLIC_ADSENSE_CLIENT);

const PrivacyPage = () => (
  <main className="mx-auto max-w-3xl px-4 pb-14 pt-14 text-sm leading-6 sm:px-6 lg:px-8">
    <h1 className="text-2xl font-semibold">Privacy Policy</h1>

    <h2 className="mt-8 text-lg font-medium">Hosting &amp; server logs</h2>
    <p className="mt-2 text-dim">
      This site is hosted on Vercel (Vercel Inc., USA). Vercel processes technical request data
      (IP address, user agent, timestamps) in server logs to deliver and secure the service
      (legal basis: Art. 6(1)(f) GDPR). Logs are retained only as long as operationally necessary.
    </p>

    <h2 className="mt-8 text-lg font-medium">Local storage (favorites, banner)</h2>
    <p className="mt-2 text-dim">
      Your favorite list (key &quot;greenwash-index&quot;) and the dismissal state of the support
      banner (key &quot;greenwash-index-banner&quot;) are stored exclusively in your browser&apos;s
      localStorage. They never leave your device, are strictly functional, and require no consent
      (§25(2) TDDDG). Clearing site data removes them.
    </p>

    <h2 className="mt-8 text-lg font-medium">External donation links</h2>
    <p className="mt-2 text-dim">
      The support banner contains plain links to external donation platforms (Ko-fi, GitHub
      Sponsors). No scripts, cookies or data transfers from these platforms occur on this site —
      their privacy policies apply only once you follow a link and visit them.
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

    <h2 className="mt-8 text-lg font-medium">Personal data of featured public figures</h2>
    <p className="mt-2 text-dim">
      This site processes publicly available information about public figures (names, publicly
      broadcast vehicle positions, and sourced news events) for a satirical, journalistic-editorial
      purpose. This processing relies on the media privilege (Art. 85 GDPR in conjunction with the
      applicable German press/media law) and our legitimate interest in public-interest reporting
      (Art. 6(1)(f) GDPR). Every claim links to its source. Featured persons may request
      rectification or removal of any event whose source does not support it — see the{' '}
      <a href="/methodology" className="text-accent hover:underline">methodology</a>{' '}and the
      contact in the <a href="/imprint" className="text-accent hover:underline">imprint</a>;
      substantiated requests are honored promptly.
    </p>

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
