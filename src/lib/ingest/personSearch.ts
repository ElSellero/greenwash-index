/**
 * News-search recall helper. Most persons are found by their display name, but
 * some are stored under a long / titled name that is a poor exact-phrase match
 * on GDELT and Google News — e.g. "Hassanal Bolkiah, Sultan of Brunei" only
 * matches texts carrying that full title, missing the bulk of his coverage (his
 * jet, palace, climate statements). For those we OR in shorter, higher-recall
 * aliases. Keyed by person slug; most persons need no entry here.
 */
const SEARCH_ALIASES: Record<string, readonly string[]> = {
  'sultan-of-brunei': ['Hassanal Bolkiah', 'Sultan of Brunei'],
  'prince-albert-ii': ['Prince Albert of Monaco', 'Albert II of Monaco'],
};

/**
 * The quoted name clause for a person's news query: the display name plus any
 * aliases, each phrase quoted and OR'd. Returns `"Name"` for the common case or
 * `("Name" OR "Alias" OR ...)` when aliases exist — one broader query, not extra
 * API calls. Combine with topic terms at the call site, e.g.
 * `` `${personNameQuery(slug, name)} (climate OR yacht ...)` ``.
 */
export const personNameQuery = (slug: string, name: string): string => {
  const phrases = [...new Set([name, ...(SEARCH_ALIASES[slug] ?? [])])];
  return phrases.length === 1
    ? `"${phrases[0]}"`
    : `(${phrases.map((p) => `"${p}"`).join(' OR ')})`;
};
