# 🌍 Greenwash Index

> **Who preaches water and flies kerosene.**

A satirical, open-source data visualization that tracks the gap between what public figures *say* about the climate and what their private jets and superyachts *do* to it — rendered on an interactive 3D globe, ranked by a fully transparent **Hypocrisy Score**.

[![CI](https://img.shields.io/badge/ci-pending-lightgrey)](../../actions)
[![License: MIT](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)
[![Status](https://img.shields.io/badge/status-building-orange)](docs/superpowers/plans/2026-06-10-greenwash-index.md)

---

## What is this?

Fifty of the world's most carbon-blessed celebrities and billionaires, live on a night-lights globe:

- ✈️ **Real jet tracking** — public ADS-B transponder data, the same signals every plane broadcasts
- 🛥️ **Simulated yacht voyages** — clearly labeled as such (yachts love turning their transponders off)
- 🟢 **What they say** — every documented donation, speech, interview and climate sermon
- 🔴 **What they do** — every documented flight, voyage and high-emission asset
- 📈 **A score that punishes preaching** — the louder you lecture, the harder your emissions count

### The Hypocrisy Score™

No black box. The entire formula:

```
score      = co2Tons12m × multiplier
multiplier = 1 + min(9, Σ advocacyWeight × 0.5^(ageDays / 730))
```

| You did this in public          | Weight |
|---------------------------------|--------|
| Posted about the climate        | 1      |
| Donated to a climate cause      | 1      |
| Green investment                | 2      |
| Gave an interview               | 2      |
| Keynote / summit speech         | 3      |
| Told *others* to fly less       | **5**  |

A billionaire who burns 3,000 tons of CO2 in silence ranks **below** one who burns the same while lecturing you about your shower habits. That's the whole point.

Old sermons decay (24-month half-life). The multiplier caps at 10× — even hypocrisy needs limits.

## Honesty about data

Every event on this site carries a **source link** and a **provenance badge**:

| Badge | Meaning |
|---|---|
| `LIVE` | Public ADS-B transponder data via [adsb.lol](https://adsb.lol) |
| `SIMULATED` | A plausible fictional route — never the basis for claims about a real trip |
| `AI-CLASSIFIED` | Extracted from a news article by an LLM (confidence ≥ 0.75); the linked source is authoritative |
| `ESTIMATED` | Computed from published fuel-burn figures — an estimate, not a measurement |

The full math, emission factors and data-handling rules live on the **/methodology** page — which renders its tables directly from the same code that computes the scores. The page *cannot* drift from reality.

Found an event whose source doesn't support it? **Open an issue.** Substantiated complaints lead to correction or removal.

## How it stays fresh (self-maintaining pipeline)

```
                       ┌─────────────────────────────┐
   every 15 min        │  GitHub Actions → /api/      │   top-20 jets via ADS-B
  ─────────────────►   │  ingest/live                 │ ─────────────────────────►
                       └─────────────────────────────┘
                       ┌─────────────────────────────┐   positions → trips → CO2
   daily 04:00 UTC     │  Vercel Cron → /api/         │   news scan → LLM classify
  ─────────────────►   │  ingest/daily                │   → guardrails → events
                       └─────────────────────────────┘   → scores → leaderboard
```

News sources: Google News RSS + GDELT (X/Twitter arrives indirectly — when a tweet matters, the news covers it). Classification runs through a schema-constrained LLM with hard guardrails: no resolvable source URL, no event. Below the confidence threshold, no event.

## Tech

Next.js (App Router) · React Three Fiber + three.js · TypeScript strict · Tailwind CSS v4 · GSAP · Zustand · Drizzle ORM + Neon Postgres · AI SDK via Vercel AI Gateway · Vitest · deployed on Vercel

## Running it yourself

```bash
git clone <this repo> && cd greenwash-index
npm install
cp .env.example .env.local   # then fill in:
```

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | Neon Postgres connection string (free tier works) |
| `INGEST_SECRET` | random 32-byte hex guarding the ingest endpoints |
| `AI_GATEWAY_API_KEY` | Vercel AI Gateway key (event classification) |
| `NEXT_PUBLIC_ADSENSE_CLIENT` | optional — ads + consent stay disabled without it |

```bash
npm run db:push    # create schema
npm run db:seed    # load the 50-person roster
npm run dev        # → http://localhost:3000
```

One-time data bootstrap: `tsx scripts/research-vehicles.ts` (verify jets), then `npm run backfill` (historical events — takes a while, costs a few cents of LLM calls).

## Security posture

This repo is public and treated accordingly: secrets exist only in environment stores (never in git history), ingest endpoints use timing-safe token comparison, workflows run with read-only permissions and no third-party actions, every external payload is schema-validated, and Dependabot watches the supply chain. If you find a vulnerability, please report it via a private security advisory rather than a public issue.

## Launch checklist

- [ ] Imprint filled with real operator data (legal requirement)
- [ ] All `verified: false` jets confirmed or left simulated
- [ ] Backfill run; spot-check 20 random events against their sources
- [ ] Daily cron ran twice without errors (Vercel logs)
- [ ] GitHub Actions live tick green for 24h
- [ ] AdSense: apply only after content is stable; then set NEXT_PUBLIC_ADSENSE_CLIENT
      and configure the GDPR message under Privacy & messaging
- [ ] Lighthouse: mobile performance ≥ 80, no console errors on mid-range phone

## Credits

Earth night texture by [Solar System Scope](https://www.solarsystemscope.com/textures/) (CC BY 4.0),
2k fallback from the [three.js](https://threejs.org) examples (MIT). Live flight data by [adsb.lol](https://adsb.lol).
News discovery via Google News RSS and [GDELT](https://www.gdeltproject.org/).

## Legal & editorial stance

This is a **satirical, editorial project** about persons of public interest. All factual claims link to their sources; scores are opinions computed by the open formula above; simulated data is labeled and never presented as fact. We don't dox: shown positions come from data these vehicles broadcast publicly, or are fiction marked as fiction.

## License

[MIT](LICENSE) — the code. The editorial dataset (events and classifications) is provided as-is, no warranty, satire included at no extra charge.
