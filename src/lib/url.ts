/**
 * Only allow http(s) URLs as an href. Source links are derived from external news
 * articles and LLM output, so this neutralises a `javascript:` / `data:` URL ever
 * reaching the DOM — defense in depth on top of the ingest guardrail that already
 * requires http(s). Anything else collapses to a harmless '#'.
 */
export const safeHref = (url: string | null | undefined): string =>
  url && /^https?:\/\//i.test(url.trim()) ? url : '#';
