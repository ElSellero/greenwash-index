import { generateObject } from 'ai';
import { z } from 'zod';
import { classifierChain, runWithFallback, type Attempt } from './llm';

/**
 * Non-Latin scripts ⇒ the text was never translated out of its source language.
 * Accented Latin (é, ñ, ü, ø) is normal English-adjacent text and is ignored.
 * Covers Cyrillic, Arabic, Greek, Thai, CJK, Hiragana/Katakana, Hangul, Hebrew.
 */
export const FOREIGN = /[Ѐ-ӿ؀-ۿͰ-Ͽ฀-๿一-鿿぀-ヿ가-힯֐-׿]/;

/** True if any of the given strings still contains untranslated foreign script. */
export const hasForeignScript = (...texts: (string | null | undefined)[]): boolean =>
  texts.some((t) => t != null && FOREIGN.test(t));

const SYSTEM = `Translate the given news headline and summary into concise, natural English. If the text is already English, return it unchanged. Output JSON only: {"title": string, "summary": string}. Preserve the original meaning exactly; do not editorialize, shorten aggressively, or add commentary.`;

const schema = z.object({ title: z.string(), summary: z.string() });
export type Translated = z.infer<typeof schema>;

/**
 * Translate a headline + summary into English with the Gemini chain (same tiers
 * as the classifier). Returns null only when every tier is unavailable (quota /
 * no key), so callers can fall back to keeping the original text and retry later.
 */
export const translateToEnglish = async (
  title: string,
  summary: string,
): Promise<Translated | null> => {
  const attempts: Attempt<Translated>[] = classifierChain().map(({ label, model }) => ({
    label,
    run: async () => (await generateObject({
      model, schema, system: SYSTEM,
      prompt: `Title: ${title}\nSummary: ${summary || '(none)'}`,
      abortSignal: AbortSignal.timeout(60_000),
    })).object,
  }));
  try {
    return (await runWithFallback(attempts)).value;
  } catch {
    return null;
  }
};
