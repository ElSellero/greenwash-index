import { createGoogleGenerativeAI } from '@ai-sdk/google';
import type { LanguageModel } from 'ai';
import { z } from 'zod';

const googleKey = () => process.env.GOOGLE_GENERATIVE_AI_API_KEY;

const ollamaModelName = () => process.env.OLLAMA_MODEL;
/** Local Ollama is the LAST-resort fallback, used only when set (local runs). */
export const isOllama = (): boolean => Boolean(ollamaModelName());
/** Provenance label for Ollama-classified rows ('ollama:*' = pending Gemini re-verification). */
export const ollamaLabel = (): string => `ollama:${ollamaModelName()}`;

// Value/meta keywords that make Ollama's grammar engine silently stop
// enforcing the JSON shape; we strip them for the `format` grammar and still
// validate the result strictly with the full Zod schema afterwards.
const OLLAMA_DROP_KEYS = new Set([
  '$schema', 'pattern', 'minLength', 'maxLength', 'minimum', 'maximum',
  'exclusiveMinimum', 'exclusiveMaximum', 'format', 'description', 'default',
]);

const simplifyForOllama = (node: unknown): unknown => {
  if (Array.isArray(node)) return node.map(simplifyForOllama);
  if (node && typeof node === 'object') {
    return Object.fromEntries(
      Object.entries(node)
        .filter(([k]) => !OLLAMA_DROP_KEYS.has(k))
        .map(([k, v]) => [k, simplifyForOllama(v)]),
    );
  }
  return node;
};

/**
 * Generate a schema-validated object via a local Ollama model, using Ollama's
 * native grammar-constrained structured-output endpoint (the AI-SDK provider
 * doesn't enforce the grammar reliably for gemma). No quota, no rate limit.
 */
export const ollamaGenerateObject = async <T>(
  schema: z.ZodType<T>,
  system: string,
  prompt: string,
): Promise<T> => {
  const base = process.env.OLLAMA_BASE_URL ?? 'http://localhost:11434';
  const res = await fetch(`${base}/api/chat`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      model: ollamaModelName(),
      stream: false,
      options: { temperature: 0 },
      format: simplifyForOllama(z.toJSONSchema(schema)),
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: prompt },
      ],
    }),
    signal: AbortSignal.timeout(120_000),
  });
  if (!res.ok) throw new Error(`ollama ${res.status}: ${await res.text()}`);
  const data = (await res.json()) as { message?: { content?: string } };
  return schema.parse(JSON.parse(data.message?.content ?? ''));
};

// Preferred Gemini chain: try the smartest free model first, then fall back to
// the stabler, high-quota model when the primary is overloaded (503) or
// rate-limited (429). Pin a single model with LLM_GEMINI_MODEL to skip fallback.
const GEMINI_CHAIN = ['gemini-3.5-flash', 'gemini-3.1-flash-lite'] as const;

const geminiChain = (): string[] => {
  const pinned = process.env.LLM_GEMINI_MODEL;
  return pinned ? [pinned] : [...GEMINI_CHAIN];
};

/**
 * Cloud classifier tiers, label + model, tried in order before Ollama:
 * Gemini 3.5-flash → 3.1-flash-lite when a key is set; the AI-gateway model
 * only when there is no local Ollama fallback to catch the no-cloud case.
 */
export const classifierChain = (): { label: string; model: LanguageModel }[] => {
  if (googleKey()) {
    return geminiChain().map((m) => ({ label: m, model: createGoogleGenerativeAI()(m) }));
  }
  return isOllama() ? [] : [{ label: 'anthropic/claude-haiku-4-5', model: 'anthropic/claude-haiku-4-5' }];
};

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

/** A single classification attempt with a provenance label. */
export type Attempt<T> = { label: string; run: () => Promise<T> };

/**
 * Tries each attempt in order (with a few retries + backoff each) and returns
 * the first success together with the label of the tier that produced it.
 * Rethrows the last error only after every attempt is exhausted.
 */
export const runWithFallback = async <T>(
  attempts: Attempt<T>[],
): Promise<{ value: T; label: string }> => {
  let lastErr: unknown;
  for (const attempt of attempts) {
    for (let i = 1; i <= ATTEMPTS_PER_MODEL; i++) {
      try {
        return { value: await attempt.run(), label: attempt.label };
      } catch (err) {
        lastErr = err;
        if (i < ATTEMPTS_PER_MODEL) await new Promise((r) => setTimeout(r, i * 800));
      }
    }
  }
  throw lastErr ?? new Error('no classification attempts configured');
};

/** Pause between cloud LLM calls — keeps the Gemini free tier under its RPM limit. */
export const interCallDelayMs = (): number => (googleKey() ? 5_000 : 0);

/** Per-run classification cap sized to the serverless time budget (maxDuration 300s). */
export const maxClassificationsPerRun = (): number => (googleKey() ? 25 : 80);
