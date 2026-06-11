import { createGoogleGenerativeAI } from '@ai-sdk/google';
import type { LanguageModel } from 'ai';

/*
 * Model selection, free-first:
 * - GOOGLE_GENERATIVE_AI_API_KEY set → Gemini free tier (no credit card; ~10-15 RPM,
 *   daily request caps — callers degrade gracefully on 429 because articles are only
 *   consumed after successful classification).
 * - otherwise → Vercel AI Gateway (paid, requires card verification).
 */
const googleKey = () => process.env.GOOGLE_GENERATIVE_AI_API_KEY;

/** High-volume headline classification: cheapest capable model. */
export const classifierModel = (): LanguageModel =>
  googleKey()
    ? createGoogleGenerativeAI()('gemini-2.5-flash-lite')
    : 'anthropic/claude-haiku-4-5';

/** One-time research: strongest model available on the active provider. */
export const researchModel = (): LanguageModel =>
  googleKey()
    ? createGoogleGenerativeAI()('gemini-2.5-flash')
    : 'anthropic/claude-opus-4-8';

/** Pause between LLM calls — keeps the Gemini free tier under its RPM limit. */
export const interCallDelayMs = (): number => (googleKey() ? 5_000 : 0);
