import { createGoogleGenerativeAI } from '@ai-sdk/google';
import type { LanguageModel } from 'ai';

const googleKey = () => process.env.GOOGLE_GENERATIVE_AI_API_KEY;

// Preferred Gemini chain: try the smartest free model first, then fall back to
// the stabler, high-quota model when the primary is overloaded (503) or
// rate-limited (429). Pin a single model with LLM_GEMINI_MODEL to skip fallback.
const GEMINI_CHAIN = ['gemini-3.5-flash', 'gemini-3.1-flash-lite'] as const;

const geminiChain = (): string[] => {
  const pinned = process.env.LLM_GEMINI_MODEL;
  return pinned ? [pinned] : [...GEMINI_CHAIN];
};

/** Model chain for cheap, high-volume classification. */
export const classifierModels = (): LanguageModel[] =>
  googleKey()
    ? geminiChain().map((m) => createGoogleGenerativeAI()(m))
    : ['anthropic/claude-haiku-4-5'];

/** Model chain for the one-time, accuracy-critical vehicle research job. */
export const researchModels = (): LanguageModel[] =>
  googleKey()
    ? geminiChain().map((m) => createGoogleGenerativeAI()(m))
    : ['anthropic/claude-opus-4-8'];

/** Retries per model before falling through to the next in the chain. */
const ATTEMPTS_PER_MODEL = 2;

/**
 * Runs `call` against each model in `models`, retrying a few times per model
 * (with short backoff) before falling through to the next. Rethrows the last
 * error only after the whole chain is exhausted.
 */
export const withModelFallback = async <T>(
  models: LanguageModel[],
  call: (model: LanguageModel) => Promise<T>,
): Promise<T> => {
  let lastErr: unknown;
  for (const model of models) {
    for (let attempt = 1; attempt <= ATTEMPTS_PER_MODEL; attempt++) {
      try {
        return await call(model);
      } catch (err) {
        lastErr = err;
        if (attempt < ATTEMPTS_PER_MODEL) {
          await new Promise((r) => setTimeout(r, attempt * 800));
        }
      }
    }
  }
  throw lastErr;
};

/** Pause between LLM calls — keeps the Gemini free tier under its RPM limit. */
export const interCallDelayMs = (): number => (googleKey() ? 5_000 : 0);

/** Per-run classification cap sized to the serverless time budget (maxDuration 300s). */
export const maxClassificationsPerRun = (): number => (googleKey() ? 25 : 80);
