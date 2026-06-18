import { eq } from 'drizzle-orm';
import { db } from '../src/lib/db/client';
import { persons } from '../src/lib/db/schema';

/**
 * Populate neutral, factual one-line bios (public role only — no editorial
 * judgment, so nothing that needs media-law review; the sourced events carry
 * the satire). Idempotent. Dry-run by default; --apply writes.
 */
const apply = process.argv.includes('--apply');

const BIOS: Record<string, string> = {
  'al-gore': 'Former U.S. Vice President and climate advocate.',
  'alisher-usmanov': 'Russian-born metals and technology billionaire.',
  'bernard-arnault': 'Chairman and CEO of the luxury group LVMH.',
  'beyonce': 'American singer and businesswoman.',
  'bill-gates': 'Co-founder of Microsoft and climate-tech investor.',
  'celine-dion': 'Canadian singer.',
  'charles-koch': 'Chairman and CEO of Koch Industries.',
  'cristiano-ronaldo': 'Portuguese professional footballer.',
  'david-geffen': 'Entertainment mogul and record-label co-founder.',
  'drake': 'Canadian rapper and singer.',
  'elon-musk': 'CEO of Tesla and SpaceX.',
  'eric-schmidt': 'Former CEO and chairman of Google.',
  'floyd-mayweather': 'Retired American professional boxer.',
  'giorgio-armani': 'Italian fashion designer, founder of the Armani group.',
  'harrison-ford': 'American actor and aviator.',
  'sultan-of-brunei': 'Sultan and head of state of Brunei.',
  'jay-z': 'American rapper and entrepreneur.',
  'jeff-bezos': 'Founder of Amazon and Blue Origin.',
  'jim-walton': 'Walmart heir and Walton family member.',
  'john-kerry': 'Former U.S. Secretary of State and climate envoy.',
  'john-travolta': 'American actor and licensed pilot.',
  'justin-bieber': 'Canadian pop singer.',
  'kanye-west': 'American rapper and designer.',
  'kim-kardashian': 'American media personality and entrepreneur.',
  'kylie-jenner': 'American media personality and cosmetics entrepreneur.',
  'larry-ellison': 'Co-founder and chairman of Oracle.',
  'larry-page': 'Co-founder of Google.',
  'leonardo-dicaprio': 'American actor and environmental campaigner.',
  'lewis-hamilton': 'British Formula 1 driver.',
  'lionel-messi': 'Argentine professional footballer.',
  'mark-cuban': 'Entrepreneur and investor.',
  'mark-zuckerberg': 'Co-founder and CEO of Meta.',
  'michael-bloomberg': 'Businessman, founder of Bloomberg LP, and former New York City mayor.',
  'mukesh-ambani': 'Chairman of Reliance Industries.',
  'oprah-winfrey': 'American media executive and talk-show host.',
  'phil-knight': 'Co-founder of Nike.',
  'prince-albert-ii': 'Sovereign Prince of Monaco.',
  'ralph-lauren': 'American fashion designer.',
  'richard-branson': 'Founder of the Virgin Group.',
  'rihanna': 'Barbadian singer and entrepreneur.',
  'roman-abramovich': 'Russian billionaire investor.',
  'sergey-brin': 'Co-founder of Google.',
  'steve-wynn': 'Casino-resort developer.',
  'steven-spielberg': 'American film director and producer.',
  'taylor-swift': 'American singer-songwriter.',
  'walton-family': 'Heirs to the Walmart fortune.',
  'tiger-woods': 'American professional golfer.',
  'tom-cruise': 'American actor and producer.',
  'travis-scott': 'American rapper.',
  'wayne-newton': 'American singer and Las Vegas entertainer.',
};

const run = async () => {
  let written = 0;
  let missing = 0;
  const all = await db.select({ slug: persons.slug }).from(persons);
  for (const { slug } of all) {
    const bio = BIOS[slug];
    if (!bio) { console.log(`NO BIO for ${slug}`); missing++; continue; }
    if (apply) await db.update(persons).set({ bio }).where(eq(persons.slug, slug));
    written++;
  }
  console.log(`\n${apply ? 'APPLIED' : 'DRY RUN'} — ${written} bios${missing ? `, ${missing} roster slugs without a bio` : ''}.`);
  if (!apply) console.log('Re-run with --apply to write.');
};

run().then(() => process.exit(0)).catch((err) => { console.error('seed-bios failed:', err); process.exit(1); });
