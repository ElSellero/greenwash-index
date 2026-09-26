'use client';
import { DocPage, DocSection } from '@/components/doc/DocPage';

const adsActive = Boolean(process.env.NEXT_PUBLIC_ADSENSE_CLIENT);
const link = 'text-accent hover:underline';

const TOC = [
  { id: 'hosting', label: 'Hosting & logs' },
  { id: 'imagery', label: 'Satellite imagery' },
  { id: 'storage', label: 'Local storage' },
  { id: 'donations', label: 'Donation links' },
  { id: 'ads', label: 'Cookies & ads' },
  { id: 'public-figures', label: 'Public figures' },
  { id: 'rights', label: 'Your rights' },
  { id: 'no-tracking', label: 'No extra tracking' },
];

const PrivacyPage = () => (
  <DocPage current="/privacy" eyebrow="Privacy" title="Privacy Policy" toc={TOC}
    lede="No accounts, no analytics, no tracking without consent. Here is exactly what data moves, and why.">
    <DocSection id="hosting" index={1} title="Hosting & server logs">
      <p>
        This site is hosted on Vercel (Vercel Inc., USA). Vercel processes technical request data (IP address,
        user agent, timestamps) in server logs to deliver and secure the service (legal basis: Art. 6(1)(f) GDPR).
        Logs are retained only as long as operationally necessary.
      </p>
    </DocSection>

    <DocSection id="imagery" index={2} title="Satellite imagery">
      <p>
        When you zoom in, sharper satellite tiles (NASA Blue Marble and Earth at Night) are loaded for the visible
        area. Our own server fetches them from NASA&apos;s imagery service and delivers them from this domain — your
        browser never contacts NASA, and no data about you is passed on.
      </p>
    </DocSection>

    <DocSection id="storage" index={3} title="Local storage (favorites, banner)">
      <p>
        Your favorite list and globe display settings (key &quot;greenwash-index&quot;) and the dismissal state of the support banner (key
        &quot;greenwash-index-banner&quot;) are stored exclusively in your browser&apos;s localStorage. They never
        leave your device, are strictly functional, and require no consent (§25(2) TDDDG). Clearing site data
        removes them.
      </p>
    </DocSection>

    <DocSection id="donations" index={4} title="External donation links">
      <p>
        The support banner contains plain links to external donation platforms (Ko-fi, GitHub Sponsors). No
        scripts, cookies or data transfers from these platforms occur on this site — their privacy policies apply
        only once you follow a link and visit them.
      </p>
    </DocSection>

    <DocSection id="ads" index={5} title="Cookies, consent & advertising">
      {adsActive ? (
        <>
          <p>
            We use Google AdSense together with Google&apos;s certified consent management platform (TCF 2.2). Ads,
            cookies and any profiling only run after your explicit consent via the consent dialog (Art. 6(1)(a)
            GDPR). You can withdraw or change your choice at any time:
          </p>
          <button
            onClick={() => window.googlefc?.showRevocationMessage?.()}
            className="min-h-11 cursor-pointer rounded border border-accent/40 px-3 py-1.5 text-accent transition hover:bg-accent/10"
          >
            Re-open consent settings
          </button>
        </>
      ) : (
        <p>
          Advertising is currently <b>not active</b>. This site sets no advertising or tracking cookies whatsoever —
          there is nothing to consent to. If advertising is activated in the future, Google&apos;s certified consent
          management platform (TCF 2.2) will ask for your explicit consent before any ad cookies are set, and this
          section will offer a control to change your choice at any time.
        </p>
      )}
    </DocSection>

    <DocSection id="public-figures" index={6} title="Personal data of featured public figures">
      <p>
        This site processes publicly available information about public figures (names, publicly broadcast vehicle
        positions, and sourced news events) for a satirical, journalistic-editorial purpose. This processing relies
        on the media privilege (Art. 85 GDPR in conjunction with the applicable German press/media law) and our
        legitimate interest in public-interest reporting (Art. 6(1)(f) GDPR). Every claim links to its source.
        Featured persons may request rectification or removal of any event whose source does not support it — see
        the <a href="/methodology" className={link}>methodology</a>{' '}and the contact in the{' '}
        <a href="/imprint" className={link}>imprint</a>; substantiated requests are honored promptly.
      </p>
    </DocSection>

    <DocSection id="rights" index={7} title="Your rights (GDPR Art. 15–21)">
      <p>
        You have the right to access, rectification, erasure, restriction of processing, data portability and
        objection regarding your personal data. Contact: see <a href="/imprint" className={link}>imprint</a>. You
        may also lodge a complaint with a supervisory authority.
      </p>
    </DocSection>

    <DocSection id="no-tracking" index={8} title="No accounts, no extra tracking">
      <p>
        This site has no user accounts, no newsletters and no analytics or tracking beyond the consent-gated
        advertising described above.
      </p>
    </DocSection>
  </DocPage>
);

export default PrivacyPage;
