import { createGoogleGenerativeAI } from '@ai-sdk/google';
import type { LanguageModel } from 'ai';

const googleKey = () => process.env.GOOGLE_GENERATIVE_AI_API_KEY;

// Default model; override with LLM_GEMINI_MODEL (e.g. when 3.5-flash is
// temporarily overloaded and a bulk job should use a stabler equivalent).
const googleModel = () => process.env.LLM_GEMINI_MODEL ?? 'gemini-3.5-flash';

export const classifierModel = (): LanguageModel =>
  googleKey()
    ? createGoogleGenerativeAI()(googleModel())
    : 'anthropic/claude-haiku-4-5';

export const researchModel = (): LanguageModel =>
  googleKey()
    ? createGoogleGenerativeAI()(googleModel())
    : 'anthropic/claude-opus-4-8';

/** Pause between LLM calls — keeps the Gemini free tier under its RPM limit. */
export const interCallDelayMs = (): number => (googleKey() ? 5_000 : 0);

/** Per-run classification cap sized to the serverless time budget (maxDuration 300s). */
export const maxClassificationsPerRun = (): number => (googleKey() ? 25 : 80);
