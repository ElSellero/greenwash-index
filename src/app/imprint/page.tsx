import type { Metadata } from 'next';
import { DocPage, DocSection } from '@/components/doc/DocPage';
import { ImprintDetails } from './ImprintDetails';

export const metadata: Metadata = {
  title: 'Imprint — Greenwash Index',
  robots: { index: false, follow: false },
};

const ImprintPage = () => (
  <DocPage current="/imprint" eyebrow="Impressum" title="Imprint"
    lede="Who runs this satirical data project, how to reach us, and how corrections work.">
    <DocSection id="operator" index={1} title="Information pursuant to § 5 DDG and § 18 MStV">
      <ImprintDetails />
    </DocSection>
    <DocSection id="satire" index={2} title="Satire & opinion">
      <p>
        The Greenwash Index is satire and editorial commentary on persons of public interest. Hypocrisy scores
        and rankings are value judgments produced by the open formula on the{' '}
        <a href="/methodology" className="text-accent hover:underline">methodology</a>{' '}page — opinions, not
        statements of fact. Factual claims (flights, voyages, public statements) link to their public sources;
        simulated data is labelled <i>simulated</i>{' '}and never presented as fact. None of the persons listed has
        endorsed, sponsored or been consulted for this project.
      </p>
    </DocSection>
    <DocSection id="corrections" index={3} title="Corrections & right of reply">
      <p>
        Spotted a claim its source doesn&apos;t support, or want to reply as a person featured here? Write to the
        e-mail address above or open a GitHub issue. Substantiated requests lead to prompt correction or removal.
      </p>
    </DocSection>
    <DocSection id="links" index={4} title="Links to external sources">
      <p>
        Events link to third-party articles and data as evidence. We have no control over those pages and are not
        responsible for their content; no unlawful content was apparent when a link was added. Links to content that
        turns out to be unlawful are removed as soon as we learn of it.
      </p>
    </DocSection>
  </DocPage>
);

export default ImprintPage;
