# greenwash-index Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
> **For all frontend tasks (Phase 6–8):** REQUIRED SUB-SKILL: `ui-ux-pro-max:ui-ux-pro-max` must be invoked before writing UI code — it defines the design language (dark mission-control/cyberpunk) and component quality bar.

**Goal:** A satirical data-visualization web app showing celebrities' vehicle CO2 emissions vs. their public climate advocacy on an interactive 3D globe, ranked by a transparent "Hypocrisy Score", self-maintaining via automated ingest pipelines.

**Architecture:** Next.js App Router (Vercel) serves both the React Three Fiber globe frontend and the API/ingest backend. Neon Postgres (Drizzle ORM) is the single source of truth: persons → vehicles → events (sourced, append-only) → daily score snapshots. A daily Vercel cron runs the full pipeline (CO2 aggregation, score computation, news classification); a GitHub Actions schedule (15 min, configurable) refreshes live positions for the top 20. The client interpolates CO2 tickers between snapshots and falls back to simulated data when live sources fail.

**Tech Stack:** Next.js 16 (App Router, TypeScript strict, arrow functions only), React 19, React Three Fiber + drei, three.js, Tailwind CSS v4, GSAP, Zustand v5, Drizzle ORM + @neondatabase/serverless (Neon Postgres), AI SDK v6 via Vercel AI Gateway (`anthropic/claude-haiku-4-5`) for event classification, fast-xml-parser (RSS), Vitest, GitHub Actions, Google AdSense + Google certified CMP.

---

## Decision Record (from grill-me session 2026-06-10)

1. **Data:** Hybrid — real ADS-B jet data (adsb.lol), simulated yacht routes, everything labeled `live` / `estimated` / `simulated`; graceful fallback to simulation.
2. **Legal:** Real names, public figures only. Every event row REQUIRES a `sourceUrl`. Score is presented as satirical opinion with a public methodology page.
3. **Stack:** Next.js + React Three Fiber (see Tech Stack).
4. **Storage:** Neon Postgres + Drizzle; API routes serve heavily cached JSON.
5. **Live cadence:** Daily Vercel cron (full pipeline) + GitHub Actions every 15 min (top 20 only; interval is a config constant, ≥10 min out of politeness to free APIs). Client ticker interpolates.
6. **Score:** `score = co2Tons12m × multiplier`, `multiplier = 1 + min(9, Σ weight × 0.5^(ageDays/730))`. Weights: post=1, interview=2, speech/keynote=3, public renunciation-preaching=5. Always shown as a breakdown in the UI.
7. **Scope:** 50 persons. System built data-first-empty; one-time deep-research backfill script; then self-maintaining.
8. **Auto-pipeline:** LLM classification with hard guardrails — resolvable sourceUrl required, confidence ≥ 0.75, visible `auto-classified` badge, optional review flag. Sources: Google News RSS, GDELT, YouTube Data API (later), Wikidata (later), Bluesky (later). X/Twitter only indirectly via news coverage.
9. **Globe look:** NASA Black-Marble night texture + atmosphere fresnel glow + neon route arcs.
10. **Privacy/Money:** Google AdSense + Google's TCF-2.2-certified CMP (no homemade banner). Ad slots planned into layout, consent-gated. Imprint + privacy pages.
11. **Repo:** Public GitHub repo (free Actions minutes, transparency as legal asset).
12. **Mobile:** Fully responsive; sidebar → bottom sheet; adaptive quality tiers (DPR cap, reduced geometry).

---

## File Structure

```
greenwash-index/
├── .github/workflows/live-ingest.yml      # 15-min top-20 position refresh
├── docs/superpowers/plans/                 # this plan
├── data/persons.json                       # 50-person roster (seed input)
├── drizzle/                                # generated migrations
├── drizzle.config.ts
├── public/textures/earth-night.jpg         # NASA Black Marble (downloaded in Task 23)
├── scripts/
│   ├── seed.ts                             # roster JSON → DB
│   ├── research-vehicles.ts                # LLM+web fills/verifies tail numbers & icao24
│   └── backfill.ts                         # one-time historical event research
├── src/
│   ├── config.ts                           # ALL tunables (intervals, weights, caps)
│   ├── app/
│   │   ├── layout.tsx                      # fonts, CMP loader, shell
│   │   ├── page.tsx                        # globe + sidebar main view
│   │   ├── globals.css                     # Tailwind v4 theme tokens
│   │   ├── person/[slug]/page.tsx          # detail dashboard (side-by-side lists)
│   │   ├── methodology/page.tsx
│   │   ├── imprint/page.tsx
│   │   ├── privacy/page.tsx
│   │   └── api/
│   │       ├── leaderboard/route.ts        # ranked persons, cached
│   │       ├── persons/[slug]/route.ts     # person detail JSON
│   │       ├── positions/route.ts          # current vehicle positions + active trips
│   │       └── ingest/
│   │           ├── daily/route.ts          # Vercel cron target
│   │           └── live/route.ts           # GitHub Actions target
│   ├── components/
│   │   ├── globe/
│   │   │   ├── GlobeCanvas.tsx             # <Canvas> wrapper, quality tiers
│   │   │   ├── Earth.tsx                   # night-lights sphere + atmosphere
│   │   │   ├── VehicleMarkers.tsx          # clickable pins
│   │   │   ├── RouteArcs.tsx               # animated bezier arcs
│   │   │   └── CameraRig.tsx               # GSAP fly-to on selection
│   │   ├── sidebar/
│   │   │   ├── Sidebar.tsx                 # search + leaderboard + bottom-sheet on mobile
│   │   │   └── LeaderboardRow.tsx
│   │   ├── person/
│   │   │   ├── ActionColumns.tsx           # green/red side-by-side
│   │   │   ├── ActionItem.tsx              # one event w/ source link + badges
│   │   │   └── ScoreBreakdown.tsx          # "E × M = Score" explainer
│   │   └── ui/
│   │       ├── Co2Ticker.tsx               # rAF-interpolated counter
│   │       ├── InfoPopup.tsx               # selection card over the globe
│   │       ├── LiveFeed.tsx                # latest events stream
│   │       ├── FavoriteButton.tsx
│   │       ├── SourceBadge.tsx             # live/estimated/simulated/auto-classified
│   │       ├── AdSlot.tsx                  # consent-gated AdSense slot
│   │       └── ConsentLoader.tsx           # Google CMP script loader
│   └── lib/
│       ├── db/
│       │   ├── schema.ts                   # Drizzle schema (single source of truth)
│       │   ├── client.ts                   # neon-http drizzle client
│       │   └── queries.ts                  # all DB reads/writes used by routes
│       ├── score/
│       │   ├── hypocrisy.ts                # pure: multiplier, score, ranking
│       │   └── co2.ts                      # pure: trip CO2, rate/sec
│       ├── ingest/
│       │   ├── adsb.ts                     # adsb.lol client + parser (pure parse fn)
│       │   ├── trips.ts                    # trip state machine (pure core)
│       │   ├── yachtSim.ts                 # deterministic simulated voyages
│       │   ├── news.ts                     # Google News RSS + GDELT fetchers
│       │   ├── classify.ts                 # LLM classification + guardrails
│       │   └── pipeline.ts                 # daily + live orchestrators
│       ├── geo.ts                          # haversine, latLng→Vector3, arc points
│       ├── format.ts                       # number/CO2/date formatting
│       └── store.ts                        # Zustand: selection, favorites (persisted)
├── vercel.ts                               # crons + headers (typed config)
└── vitest.config.ts
```

**Design rules enforced throughout:** arrow functions only (`const fn = () => {}`), named exports, no `any`, every data row that reaches the UI carries its provenance (`source`, `autoClassified`), all tunables live in `src/config.ts`.

## Environment Variables

| Name | Where | Purpose |
|---|---|---|
| `DATABASE_URL` | Vercel + `.env.local` + GH Secret (not needed in GH) | Neon Postgres connection |
| `INGEST_SECRET` | Vercel + GH Secret | Bearer token guarding `/api/ingest/*` |
| `AI_GATEWAY_API_KEY` | Vercel + `.env.local` | AI Gateway key for classification |
| `NEXT_PUBLIC_ADSENSE_CLIENT` | Vercel (optional) | `ca-pub-…`; CMP+ads render only when set |
| `NEXT_PUBLIC_BASE_URL` | Vercel | canonical URL for metadata |

---

## Security Addendum (cross-cutting — applies to EVERY task; public repo ⇒ hostile-readable)

1. **Secrets** live only in `.env.local` (gitignored), GitHub Actions Secrets, Vercel env. Never in code, docs, workflows or commit history. Before every commit, the staged diff must contain no tokens/connection strings.
2. **Branch model:** `main` = stable (Vercel production), `develop` = integration. ALL task commits land on `develop`. Merge develop→main only at release checkpoints.
3. **Ingest auth** uses timing-safe comparison (`src/lib/auth.ts`, Task 15) — never `===` on secrets.
4. **HTTP security headers** in `next.config.ts` (Task 16, Step 2b):

```ts
import type { NextConfig } from 'next';

const securityHeaders = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
];

const nextConfig: NextConfig = {
  headers: async () => [{ source: '/(.*)', headers: securityHeaders }],
};

export default nextConfig;
```

5. **Workflows:** `permissions: contents: read`, only GitHub-official actions (`actions/*`), secrets only via `${{ secrets.* }}`.
6. **Supply chain:** `.github/dependabot.yml` (committed at repo setup). CI added in Task 2 as `.github/workflows/ci.yml`:

```yaml
name: ci
on:
  push: { branches: [develop, main] }
  pull_request: {}
permissions:
  contents: read
jobs:
  check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 24, cache: npm }
      - run: npm ci
      - run: npm run lint
      - run: npx tsc --noEmit
      - run: npm test
```

7. **Untrusted input:** every external payload (ADS-B, RSS, GDELT, LLM output) passes zod; news headlines are untrusted prompt input — classification output is schema-constrained and never rendered as HTML; external links always `rel="noopener noreferrer"`.
8. **Client exposure:** only `NEXT_PUBLIC_ADSENSE_CLIENT` and `NEXT_PUBLIC_BASE_URL` are public; `DATABASE_URL`, `INGEST_SECRET`, `AI_GATEWAY_API_KEY` are server-only.

---

# Phase 0 — Repo & Scaffold

Produces: bootable Next.js dev server, git history started, test runner working.

### Task 1: Git init + Next.js scaffold

The directory already contains `docs/` (this plan), so `create-next-app` must scaffold into a temp dir first (it refuses non-empty dirs with unknown files).

**Files:**
- Create: entire Next.js scaffold at repo root (via temp-dir move)

- [ ] **Step 1: Verify repo state** — git repo with `main` + `develop` already exists (controller created it with plan, README, LICENSE, dependabot). Confirm you are on `develop`: `git branch --show-current` → `develop`. Never commit to main.

- [ ] **Step 2: Scaffold into temp dir, move to root** (PowerShell). README.md at root is hand-written — keep ours, discard the scaffold's. Use the scaffold's `.gitignore` (it's complete and covers `.env*` — verify that after moving).

```powershell
npx create-next-app@latest tmp-scaffold --ts --tailwind --eslint --app --src-dir --turbopack --use-npm --yes
Get-ChildItem tmp-scaffold -Force | Where-Object { $_.Name -notin @('.git', 'README.md') } | Move-Item -Destination . -Force
Remove-Item tmp-scaffold -Recurse -Force
Select-String -Path .gitignore -Pattern '\.env'   # MUST match before first commit
```

- [ ] **Step 3: Verify dev server boots**

Run: `npm run dev` (background), fetch `http://localhost:3000`, expect HTTP 200, then stop it.

- [ ] **Step 4: Commit**

```powershell
git add -A
git commit -m "chore: scaffold next.js app (ts, tailwind, app router, src dir)"
```

### Task 2: Dependencies + strict TS + Vitest

**Files:**
- Create: `vitest.config.ts`
- Modify: `package.json` (scripts), `tsconfig.json`

- [ ] **Step 1: Install runtime deps**

```powershell
npm i three @react-three/fiber @react-three/drei gsap zustand drizzle-orm @neondatabase/serverless ai zod fast-xml-parser
npm i -D vitest drizzle-kit @types/three tsx
```

- [ ] **Step 2: Create `vitest.config.ts`**

```ts
import { defineConfig } from 'vitest/config';
import path from 'node:path';

export default defineConfig({
  resolve: { alias: { '@': path.resolve(__dirname, 'src') } },
  test: { include: ['src/**/*.test.ts', 'scripts/**/*.test.ts'] },
});
```

- [ ] **Step 3: Add scripts to `package.json`**

```json
"test": "vitest run",
"test:watch": "vitest",
"db:push": "drizzle-kit push",
"db:seed": "tsx scripts/seed.ts",
"backfill": "tsx scripts/backfill.ts"
```

- [ ] **Step 4: Ensure `tsconfig.json` has `"strict": true` (create-next-app default) and add `"noUncheckedIndexedAccess": true` to `compilerOptions`.**

- [ ] **Step 5: Verify test runner**

Run: `npm test` → Expected: "No test files found" exit 0 (or passWithNoTests; add `passWithNoTests: true` to the test block in `vitest.config.ts`).

- [ ] **Step 6: Commit**

```powershell
git add -A
git commit -m "chore: add deps, vitest, db scripts"
```

### Task 3: Central config

**Files:**
- Create: `src/config.ts`

- [ ] **Step 1: Write `src/config.ts`**

```ts
export const CONFIG = {
  site: {
    name: 'Greenwash Index',
    tagline: 'Tracking the gap between climate talk and climate exhaust.',
  },
  live: {
    /** GitHub Actions cadence (min). Keep >= 10 — free community APIs. */
    intervalMinutes: 15,
    /** Only this many top-ranked persons get live position refreshes. */
    topN: 20,
  },
  score: {
    /** Advocacy decay half-life in days (24 months). */
    halfLifeDays: 730,
    /** multiplier ∈ [1, multiplierCap] */
    multiplierCap: 10,
    /** Events below this LLM confidence are discarded. */
    confidenceThreshold: 0.75,
    /** Advocacy weights by positive-event type. */
    advocacyWeights: {
      post: 1,
      donation: 1,
      investment: 2,
      interview: 2,
      speech: 3,
      preaching: 5,
    } as const,
  },
  co2: {
    /** Fallback when a jet model is unknown (kg CO2 per km). */
    jetFallbackKgPerKm: 4.5,
    /** Rolling window for the score's emission base (days). */
    windowDays: 365,
  },
  cache: {
    leaderboardSMaxAge: 300,
    personSMaxAge: 300,
    positionsSMaxAge: 60,
    staleWhileRevalidate: 600,
  },
  globe: {
    radius: 1,
    markerAltitude: 1.01,
    arcSegments: 64,
  },
} as const;

export type AdvocacyType = keyof typeof CONFIG.score.advocacyWeights;
```

- [ ] **Step 2: Commit**

```powershell
git add src/config.ts
git commit -m "feat: central config with score weights and cadence constants"
```

---

# Phase 1 — Pure Domain Core (TDD)

Produces: fully unit-tested geo/CO2/score functions with zero I/O. Everything later builds on these.

### Task 4: Geo utilities

**Files:**
- Create: `src/lib/geo.ts`
- Test: `src/lib/geo.test.ts`

- [ ] **Step 1: Write failing tests**

```ts
// src/lib/geo.test.ts
import { describe, expect, it } from 'vitest';
import { haversineKm, latLngToVector3, arcPoints } from '@/lib/geo';

describe('haversineKm', () => {
  it('computes Berlin→Paris ≈ 878 km', () => {
    expect(haversineKm(52.52, 13.405, 48.8566, 2.3522)).toBeCloseTo(878, -1);
  });
  it('returns 0 for identical points', () => {
    expect(haversineKm(10, 20, 10, 20)).toBe(0);
  });
});

describe('latLngToVector3', () => {
  it('puts the north pole on +Y', () => {
    const v = latLngToVector3(90, 0, 1);
    expect(v.y).toBeCloseTo(1, 5);
    expect(Math.hypot(v.x, v.z)).toBeCloseTo(0, 5);
  });
  it('keeps points on the sphere surface', () => {
    expect(latLngToVector3(48.85, 2.35, 1).length()).toBeCloseTo(1, 5);
  });
});

describe('arcPoints', () => {
  it('starts/ends on surface and bulges in the middle', () => {
    const a = latLngToVector3(52.52, 13.405, 1);
    const b = latLngToVector3(40.71, -74.0, 1);
    const pts = arcPoints(a, b, 32);
    expect(pts).toHaveLength(33);
    expect(pts[0]!.length()).toBeCloseTo(1, 3);
    expect(pts[32]!.length()).toBeCloseTo(1, 3);
    expect(pts[16]!.length()).toBeGreaterThan(1.02);
  });
});
```

- [ ] **Step 2: Run tests, verify FAIL** — `npm test` → "Cannot find module '@/lib/geo'".

- [ ] **Step 3: Implement `src/lib/geo.ts`**

```ts
import { Vector3 } from 'three';

const toRad = (deg: number): number => (deg * Math.PI) / 180;

export const haversineKm = (
  aLat: number, aLng: number, bLat: number, bLng: number,
): number => {
  const R = 6371;
  const dLat = toRad(bLat - aLat);
  const dLng = toRad(bLng - aLng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(aLat)) * Math.cos(toRad(bLat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
};

export const latLngToVector3 = (lat: number, lng: number, radius = 1): Vector3 => {
  const phi = toRad(90 - lat);
  const theta = toRad(lng + 180);
  return new Vector3(
    -radius * Math.sin(phi) * Math.cos(theta),
    radius * Math.cos(phi),
    radius * Math.sin(phi) * Math.sin(theta),
  );
};

/** Great-circle-ish arc with altitude bulge proportional to angular distance. */
export const arcPoints = (a: Vector3, b: Vector3, segments = 64): Vector3[] => {
  const angle = a.angleTo(b);
  const points: Vector3[] = [];
  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    const p = new Vector3().copy(a).lerp(b, t).normalize();
    const altitude = 1 + Math.sin(Math.PI * t) * (0.04 + angle * 0.08);
    points.push(p.multiplyScalar(altitude));
  }
  return points;
};
```

- [ ] **Step 4: Run tests, verify PASS** — `npm test`.

- [ ] **Step 5: Commit** — `git add src/lib/geo*; git commit -m "feat: geo utilities (haversine, sphere projection, arcs)"`

### Task 5: CO2 math

**Files:**
- Create: `src/lib/score/co2.ts`
- Test: `src/lib/score/co2.test.ts`

- [ ] **Step 1: Write failing tests**

```ts
// src/lib/score/co2.test.ts
import { describe, expect, it } from 'vitest';
import { tripCo2Kg, co2RatePerSecond, JET_MODEL_KG_PER_KM } from '@/lib/score/co2';

describe('tripCo2Kg', () => {
  it('multiplies distance by the vehicle factor', () => {
    expect(tripCo2Kg(1000, 4.9)).toBe(4900);
  });
  it('never returns negative', () => {
    expect(tripCo2Kg(-5, 4.9)).toBe(0);
  });
});

describe('co2RatePerSecond', () => {
  it('spreads last-24h kg over 86400s', () => {
    expect(co2RatePerSecond(8640)).toBeCloseTo(0.1, 5);
  });
});

describe('JET_MODEL_KG_PER_KM', () => {
  it('has a plausible G650 factor', () => {
    expect(JET_MODEL_KG_PER_KM['gulfstream-g650']).toBeGreaterThan(3);
  });
});
```

- [ ] **Step 2: Run tests, verify FAIL.**

- [ ] **Step 3: Implement `src/lib/score/co2.ts`**

```ts
/**
 * Published estimates, documented on /methodology.
 * kg CO2 per km at typical cruise. Sources: aircraft fuel-burn specs × 3.16 kg CO2 per kg Jet-A.
 */
export const JET_MODEL_KG_PER_KM: Record<string, number> = {
  'gulfstream-g650': 4.9,
  'gulfstream-g550': 4.4,
  'global-6000': 4.6,
  'global-express': 4.7,
  'falcon-7x': 3.4,
  'falcon-900': 3.3,
  'citation-x': 3.2,
  'embraer-legacy-650': 3.8,
  'boeing-737-bbj': 12.0,
  'boeing-757-vip': 14.5,
  'boeing-767-vip': 16.0,
  'airbus-a319-acj': 11.5,
};

export const tripCo2Kg = (distanceKm: number, vehicleKgPerKm: number): number =>
  Math.max(0, distanceKm) * vehicleKgPerKm;

/** For the client ticker: how fast the counter should tick, from the last 24h total. */
export const co2RatePerSecond = (last24hKg: number): number => last24hKg / 86_400;
```

- [ ] **Step 4: Run tests, verify PASS.**

- [ ] **Step 5: Commit** — `git commit -am "feat: co2 math + jet model factors"`

### Task 6: Hypocrisy score engine

**Files:**
- Create: `src/lib/score/hypocrisy.ts`
- Test: `src/lib/score/hypocrisy.test.ts`

- [ ] **Step 1: Write failing tests**

```ts
// src/lib/score/hypocrisy.test.ts
import { describe, expect, it } from 'vitest';
import { advocacyMultiplier, hypocrisyScore, rankPersons } from '@/lib/score/hypocrisy';

const NOW = new Date('2026-06-10T00:00:00Z');
const daysAgo = (d: number) => new Date(NOW.getTime() - d * 86_400_000);

describe('advocacyMultiplier', () => {
  it('is 1 with no advocacy (the silent emitter)', () => {
    expect(advocacyMultiplier([], NOW)).toBe(1);
  });
  it('adds full weight for a fresh event', () => {
    expect(advocacyMultiplier([{ weight: 5, occurredAt: NOW }], NOW)).toBeCloseTo(6, 5);
  });
  it('halves weight after one half-life (730 days)', () => {
    expect(advocacyMultiplier([{ weight: 4, occurredAt: daysAgo(730) }], NOW)).toBeCloseTo(3, 2);
  });
  it('caps at 10', () => {
    const spam = Array.from({ length: 100 }, () => ({ weight: 5, occurredAt: NOW }));
    expect(advocacyMultiplier(spam, NOW)).toBe(10);
  });
});

describe('hypocrisyScore', () => {
  it('preacher outranks silent emitter at equal CO2', () => {
    const silent = hypocrisyScore(3000, advocacyMultiplier([], NOW));
    const preacher = hypocrisyScore(
      3000,
      advocacyMultiplier([{ weight: 5, occurredAt: NOW }], NOW),
    );
    expect(preacher).toBeGreaterThan(silent);
    expect(silent).toBe(3000);
  });
});

describe('rankPersons', () => {
  it('sorts descending by score, rank starts at 1', () => {
    const ranked = rankPersons([
      { personId: 1, score: 10 },
      { personId: 2, score: 99 },
      { personId: 3, score: 50 },
    ]);
    expect(ranked.map((r) => r.personId)).toEqual([2, 3, 1]);
    expect(ranked[0]!.rank).toBe(1);
  });
});
```

- [ ] **Step 2: Run tests, verify FAIL.**

- [ ] **Step 3: Implement `src/lib/score/hypocrisy.ts`**

```ts
import { CONFIG } from '@/config';

export type AdvocacyEvent = { weight: number; occurredAt: Date };

/**
 * multiplier = 1 + min(cap-1, Σ weight × 0.5^(ageDays / halfLife))
 * Documented verbatim on /methodology — keep code and page in sync.
 */
export const advocacyMultiplier = (events: AdvocacyEvent[], now: Date): number => {
  const { halfLifeDays, multiplierCap } = CONFIG.score;
  const sum = events.reduce((acc, e) => {
    const ageDays = Math.max(0, (now.getTime() - e.occurredAt.getTime()) / 86_400_000);
    return acc + e.weight * Math.pow(0.5, ageDays / halfLifeDays);
  }, 0);
  return 1 + Math.min(multiplierCap - 1, sum);
};

export const hypocrisyScore = (co2Tons12m: number, multiplier: number): number =>
  co2Tons12m * multiplier;

export const rankPersons = <T extends { score: number }>(
  rows: T[],
): (T & { rank: number })[] =>
  [...rows]
    .sort((a, b) => b.score - a.score)
    .map((row, i) => ({ ...row, rank: i + 1 }));
```

- [ ] **Step 4: Run tests, verify PASS.**

- [ ] **Step 5: Commit** — `git commit -am "feat: hypocrisy score engine (weighted, decaying, capped)"`

---

# Phase 2 — Database & Roster

Produces: migrated Neon schema, 50-person roster seeded, vehicle data research-verified.

### Task 7: Drizzle schema

**Files:**
- Create: `src/lib/db/schema.ts`, `drizzle.config.ts`

- [ ] **Step 1: Write `src/lib/db/schema.ts`**

```ts
import {
  pgTable, serial, text, integer, real, timestamp, boolean, date, index,
} from 'drizzle-orm/pg-core';

export const persons = pgTable('persons', {
  id: serial('id').primaryKey(),
  slug: text('slug').notNull().unique(),
  name: text('name').notNull(),
  category: text('category').notNull(), // 'tech' | 'music' | 'film' | 'sports' | 'business' | 'royalty'
  bio: text('bio').notNull().default(''),
  imageUrl: text('image_url'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const vehicles = pgTable('vehicles', {
  id: serial('id').primaryKey(),
  personId: integer('person_id').notNull().references(() => persons.id),
  type: text('type').notNull(), // 'jet' | 'yacht'
  name: text('name').notNull(), // "Gulfstream G650ER" / "M/Y Koru"
  registration: text('registration'), // tail number or vessel name
  icao24: text('icao24'), // lowercase hex, jets only
  modelKey: text('model_key'), // key into JET_MODEL_KG_PER_KM
  co2KgPerKm: real('co2_kg_per_km').notNull(),
  trackingMode: text('tracking_mode').notNull(), // 'live' | 'simulated'
  verified: boolean('verified').notNull().default(false), // research script sets true w/ source
  verificationUrl: text('verification_url'),
});

export const events = pgTable('events', {
  id: serial('id').primaryKey(),
  personId: integer('person_id').notNull().references(() => persons.id),
  kind: text('kind').notNull(), // 'positive' | 'negative'
  type: text('type').notNull(), // positive: post|donation|investment|interview|speech|preaching ; negative: flight|yacht_trip|asset
  title: text('title').notNull(),
  description: text('description').notNull().default(''),
  sourceUrl: text('source_url').notNull(), // HARD REQUIREMENT (legal)
  occurredAt: timestamp('occurred_at').notNull(),
  co2Kg: real('co2_kg'), // negative events only
  advocacyWeight: integer('advocacy_weight'), // positive events only, 1–5
  confidence: real('confidence'), // LLM confidence, null = human-entered
  autoClassified: boolean('auto_classified').notNull().default(false),
  reviewed: boolean('reviewed').notNull().default(false),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (t) => [
  index('events_person_kind_idx').on(t.personId, t.kind),
  index('events_occurred_idx').on(t.occurredAt),
]);

export const positions = pgTable('positions', {
  id: serial('id').primaryKey(),
  vehicleId: integer('vehicle_id').notNull().references(() => vehicles.id),
  lat: real('lat').notNull(),
  lng: real('lng').notNull(),
  altitudeM: real('altitude_m'),
  heading: real('heading'),
  isMoving: boolean('is_moving').notNull(),
  source: text('source').notNull(), // 'adsb' | 'sim'
  recordedAt: timestamp('recorded_at').notNull().defaultNow(),
}, (t) => [index('positions_vehicle_time_idx').on(t.vehicleId, t.recordedAt)]);

export const trips = pgTable('trips', {
  id: serial('id').primaryKey(),
  vehicleId: integer('vehicle_id').notNull().references(() => vehicles.id),
  status: text('status').notNull(), // 'active' | 'completed'
  startLat: real('start_lat').notNull(),
  startLng: real('start_lng').notNull(),
  lastLat: real('last_lat').notNull(),
  lastLng: real('last_lng').notNull(),
  distanceKm: real('distance_km').notNull().default(0),
  startedAt: timestamp('started_at').notNull(),
  endedAt: timestamp('ended_at'),
}, (t) => [index('trips_vehicle_status_idx').on(t.vehicleId, t.status)]);

export const scoreSnapshots = pgTable('score_snapshots', {
  id: serial('id').primaryKey(),
  personId: integer('person_id').notNull().references(() => persons.id),
  snapshotDate: date('snapshot_date').notNull(),
  co2Kg12m: real('co2_kg_12m').notNull(),
  co2KgTotal: real('co2_kg_total').notNull(),
  multiplier: real('multiplier').notNull(),
  score: real('score').notNull(),
  rank: integer('rank').notNull(),
  co2RatePerSec: real('co2_rate_per_sec').notNull().default(0),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (t) => [index('snapshots_person_date_idx').on(t.personId, t.snapshotDate)]);

export const seenArticles = pgTable('seen_articles', {
  id: serial('id').primaryKey(),
  urlHash: text('url_hash').notNull().unique(), // sha256 of canonical URL — ingest dedupe
  createdAt: timestamp('created_at').notNull().defaultNow(),
});
```

- [ ] **Step 2: Write `drizzle.config.ts`**

```ts
import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './src/lib/db/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: { url: process.env.DATABASE_URL! },
});
```

- [ ] **Step 3: Provision Neon.** Create a free Neon project (via Vercel Marketplace integration or neon.tech), put the pooled connection string into `.env.local` as `DATABASE_URL=postgres://…`. Verify `.env.local` is gitignored (create-next-app default `.env*` — confirm).

- [ ] **Step 4: Push schema** — `npx drizzle-kit push` (drizzle-kit reads `.env.local` only with dotenv; if it doesn't pick it up, run `npx dotenv -e .env.local -- drizzle-kit push` or set the var inline: `$env:DATABASE_URL='…'; npx drizzle-kit push`). Expected: tables created.

- [ ] **Step 5: Commit** — `git add src/lib/db/schema.ts drizzle.config.ts; git commit -m "feat: drizzle schema (persons, vehicles, events, positions, trips, snapshots)"`

### Task 8: DB client + query module

**Files:**
- Create: `src/lib/db/client.ts`, `src/lib/db/queries.ts`

- [ ] **Step 1: Write `src/lib/db/client.ts`**

```ts
import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from './schema';

export const db = drizzle(neon(process.env.DATABASE_URL!), { schema });
```

- [ ] **Step 2: Write `src/lib/db/queries.ts`** — every read the API routes need, in one place:

```ts
import { and, desc, eq, gte, inArray, sql } from 'drizzle-orm';
import { db } from './client';
import { events, persons, positions, scoreSnapshots, trips, vehicles } from './schema';

/** Latest snapshot per person joined with person — the leaderboard. */
export const getLeaderboard = async () => {
  const latest = db.$with('latest').as(
    db.select({
      personId: scoreSnapshots.personId,
      maxDate: sql<string>`max(${scoreSnapshots.snapshotDate})`.as('max_date'),
    }).from(scoreSnapshots).groupBy(scoreSnapshots.personId),
  );
  return db.with(latest)
    .select({
      personId: persons.id,
      slug: persons.slug,
      name: persons.name,
      category: persons.category,
      imageUrl: persons.imageUrl,
      co2Kg12m: scoreSnapshots.co2Kg12m,
      co2KgTotal: scoreSnapshots.co2KgTotal,
      multiplier: scoreSnapshots.multiplier,
      score: scoreSnapshots.score,
      rank: scoreSnapshots.rank,
      co2RatePerSec: scoreSnapshots.co2RatePerSec,
      snapshotDate: scoreSnapshots.snapshotDate,
    })
    .from(scoreSnapshots)
    .innerJoin(latest, and(
      eq(latest.personId, scoreSnapshots.personId),
      eq(latest.maxDate, scoreSnapshots.snapshotDate),
    ))
    .innerJoin(persons, eq(persons.id, scoreSnapshots.personId))
    .orderBy(scoreSnapshots.rank);
};

export const getPersonDetail = async (slug: string) => {
  const person = await db.query.persons.findFirst({ where: eq(persons.slug, slug) });
  if (!person) return null;
  const [personVehicles, personEvents, snapshot] = await Promise.all([
    db.select().from(vehicles).where(eq(vehicles.personId, person.id)),
    db.select().from(events)
      .where(eq(events.personId, person.id))
      .orderBy(desc(events.occurredAt)),
    db.select().from(scoreSnapshots)
      .where(eq(scoreSnapshots.personId, person.id))
      .orderBy(desc(scoreSnapshots.snapshotDate)).limit(1),
  ]);
  return { person, vehicles: personVehicles, events: personEvents, snapshot: snapshot[0] ?? null };
};

/** Latest position per vehicle + active trip, for the globe. */
export const getCurrentPositions = async () => {
  const latestPos = db.$with('latest_pos').as(
    db.select({
      vehicleId: positions.vehicleId,
      maxAt: sql<string>`max(${positions.recordedAt})`.as('max_at'),
    }).from(positions).groupBy(positions.vehicleId),
  );
  const rows = await db.with(latestPos)
    .select({
      vehicleId: vehicles.id,
      personId: vehicles.personId,
      type: vehicles.type,
      vehicleName: vehicles.name,
      trackingMode: vehicles.trackingMode,
      lat: positions.lat,
      lng: positions.lng,
      isMoving: positions.isMoving,
      source: positions.source,
      recordedAt: positions.recordedAt,
    })
    .from(positions)
    .innerJoin(latestPos, and(
      eq(latestPos.vehicleId, positions.vehicleId),
      eq(latestPos.maxAt, positions.recordedAt),
    ))
    .innerJoin(vehicles, eq(vehicles.id, positions.vehicleId));
  const activeTrips = await db.select().from(trips).where(eq(trips.status, 'active'));
  return { positions: rows, activeTrips };
};

export const getRecentEvents = async (limit = 20) =>
  db.select({
    id: events.id,
    personId: events.personId,
    name: persons.name,
    slug: persons.slug,
    kind: events.kind,
    type: events.type,
    title: events.title,
    occurredAt: events.occurredAt,
    sourceUrl: events.sourceUrl,
    autoClassified: events.autoClassified,
  })
    .from(events)
    .innerJoin(persons, eq(persons.id, events.personId))
    .orderBy(desc(events.createdAt))
    .limit(limit);

export const getTopNPersonIds = async (n: number): Promise<number[]> => {
  const board = await getLeaderboard();
  return board.slice(0, n).map((r) => r.personId);
};

export const getVehiclesForPersons = async (personIds: number[]) =>
  personIds.length === 0
    ? []
    : db.select().from(vehicles).where(inArray(vehicles.personId, personIds));

export const getEventsSince = async (personId: number, since: Date) =>
  db.select().from(events).where(and(
    eq(events.personId, personId),
    gte(events.occurredAt, since),
  ));
```

- [ ] **Step 3: Typecheck** — `npx tsc --noEmit` → Expected: clean.

- [ ] **Step 4: Commit** — `git commit -am "feat: db client and query module"`

### Task 9: 50-person roster + seed script

The roster ships names, categories and *claimed* vehicles; tail numbers/icao24 stay `null` until the research script (Task 10) verifies them with a source. Until verified, jets get `trackingMode: 'simulated'` — the site is never blocked on research.

**Files:**
- Create: `data/persons.json`, `scripts/seed.ts`

- [ ] **Step 1: Write `data/persons.json`** — full roster. Structure per entry (the executor writes all 50; the categories below define the spread — ~20 tech/business, ~15 music/film, ~5 sports, ~10 known climate-vocal figures so the Snitch Factor has material):

```json
[
  { "slug": "elon-musk", "name": "Elon Musk", "category": "tech",
    "vehicles": [{ "type": "jet", "name": "Gulfstream G650ER", "modelKey": "gulfstream-g650" }] },
  { "slug": "taylor-swift", "name": "Taylor Swift", "category": "music",
    "vehicles": [{ "type": "jet", "name": "Dassault Falcon 7X", "modelKey": "falcon-7x" }] },
  { "slug": "jeff-bezos", "name": "Jeff Bezos", "category": "tech",
    "vehicles": [{ "type": "jet", "name": "Gulfstream G650ER", "modelKey": "gulfstream-g650" },
                  { "type": "yacht", "name": "M/Y Koru", "modelKey": null }] },
  { "slug": "bill-gates", "name": "Bill Gates", "category": "tech",
    "vehicles": [{ "type": "jet", "name": "Gulfstream G650ER", "modelKey": "gulfstream-g650" }] },
  { "slug": "leonardo-dicaprio", "name": "Leonardo DiCaprio", "category": "film", "vehicles": [] },
  { "slug": "kim-kardashian", "name": "Kim Kardashian", "category": "music",
    "vehicles": [{ "type": "jet", "name": "Gulfstream G650ER", "modelKey": "gulfstream-g650" }] },
  { "slug": "drake", "name": "Drake", "category": "music",
    "vehicles": [{ "type": "jet", "name": "Boeing 767 (Air Drake)", "modelKey": "boeing-767-vip" }] }
]
```

Continue to 50 with: Mark Zuckerberg, Larry Ellison, Larry Page, Sergey Brin, Eric Schmidt, Michael Bloomberg, Bernard Arnault, Mukesh Ambani, David Geffen, Richard Branson, Mark Cuban, Oprah Winfrey, Steven Spielberg, Jay-Z, Beyoncé, Kylie Jenner, Travis Scott, Kanye West, Rihanna, Justin Bieber, Celine Dion, Tom Cruise, John Travolta, Harrison Ford, Floyd Mayweather, Cristiano Ronaldo, Lionel Messi, Lewis Hamilton, Roman Abramovich, Alisher Usmanov, the Walton family, Phil Knight, Ralph Lauren, Giorgio Armani, Jim Walton, Charles Koch, Al Gore (vehicles: []), John Kerry (vehicles: []), Prince Albert II, Sultan of Brunei, Tiger Woods, Steve Wynn, Wayne Newton. Yacht-only entries get `"modelKey": null`. Climate-vocal figures without owned vehicles keep `"vehicles": []` — their flights surface later via news events; their advocacy still feeds the multiplier.

- [ ] **Step 2: Write `scripts/seed.ts`**

```ts
import { readFileSync } from 'node:fs';
import { db } from '../src/lib/db/client';
import { persons, vehicles } from '../src/lib/db/schema';
import { JET_MODEL_KG_PER_KM } from '../src/lib/score/co2';
import { CONFIG } from '../src/config';

type RosterVehicle = { type: 'jet' | 'yacht'; name: string; modelKey: string | null };
type RosterEntry = { slug: string; name: string; category: string; vehicles: RosterVehicle[] };

const YACHT_DEFAULT_KG_PER_KM = 90; // documented estimate, /methodology

const run = async () => {
  const roster: RosterEntry[] = JSON.parse(readFileSync('data/persons.json', 'utf8'));
  for (const entry of roster) {
    const [person] = await db.insert(persons)
      .values({ slug: entry.slug, name: entry.name, category: entry.category })
      .onConflictDoUpdate({ target: persons.slug, set: { name: entry.name, category: entry.category } })
      .returning();
    if (!person) continue;
    for (const v of entry.vehicles) {
      const co2KgPerKm = v.type === 'yacht'
        ? YACHT_DEFAULT_KG_PER_KM
        : (v.modelKey ? JET_MODEL_KG_PER_KM[v.modelKey] : undefined) ?? CONFIG.co2.jetFallbackKgPerKm;
      await db.insert(vehicles).values({
        personId: person.id,
        type: v.type,
        name: v.name,
        modelKey: v.modelKey,
        co2KgPerKm,
        trackingMode: 'simulated', // research script upgrades jets to 'live' once icao24 verified
      });
    }
    console.log(`seeded ${entry.name} (${entry.vehicles.length} vehicles)`);
  }
};

run().then(() => process.exit(0));
```

Note: re-running the seed inserts duplicate vehicles — acceptable for a one-shot script; if re-seeding is ever needed, truncate `vehicles` first.

- [ ] **Step 3: Run** — `npx dotenv -e .env.local -- tsx scripts/seed.ts` (or set `DATABASE_URL` inline). Expected: 50 "seeded …" lines.

- [ ] **Step 4: Commit** — `git add data scripts/seed.ts; git commit -m "feat: 50-person roster + seed script"`

### Task 10: Vehicle research script (LLM-assisted, verification-gated)

Fills `icao24`/`registration` for jets using the LLM + public registries, but **only flips `trackingMode` to `live` when a verification URL is provided and the executor spot-checks it** (e.g. the aircraft shows up under that hex on `https://globe.adsb.lol`).

**Files:**
- Create: `scripts/research-vehicles.ts`

- [ ] **Step 1: Write `scripts/research-vehicles.ts`**

```ts
import { eq } from 'drizzle-orm';
import { generateObject } from 'ai';
import { z } from 'zod';
import { db } from '../src/lib/db/client';
import { persons, vehicles } from '../src/lib/db/schema';

const schema = z.object({
  found: z.boolean(),
  registration: z.string().nullable(),
  icao24: z.string().regex(/^[0-9a-f]{6}$/).nullable(),
  verificationUrl: z.string().url().nullable(),
  confidence: z.number().min(0).max(1),
});

const run = async () => {
  const jets = await db.select({
    id: vehicles.id, name: vehicles.name, personName: persons.name,
  }).from(vehicles)
    .innerJoin(persons, eq(persons.id, vehicles.personId))
    .where(eq(vehicles.type, 'jet'));

  for (const jet of jets) {
    const { object } = await generateObject({
      model: 'anthropic/claude-opus-4-8', // one-time job: use the strong model
      schema,
      prompt: `Find the publicly documented aircraft registration (tail number) and ICAO24 hex code for the ${jet.name} associated with ${jet.personName}. Only report values documented in public sources (FAA registry, planespotters.net, news articles about celebrity jet tracking). Provide the URL of the best source as verificationUrl. If ownership is not publicly documented or was sold, return found=false.`,
    });
    if (object.found && object.icao24 && object.verificationUrl && object.confidence >= 0.8) {
      await db.update(vehicles).set({
        registration: object.registration,
        icao24: object.icao24,
        verificationUrl: object.verificationUrl,
        verified: false, // stays false until human spot-check below
      }).where(eq(vehicles.id, jet.id));
      console.log(`CANDIDATE ${jet.personName}: ${object.registration} / ${object.icao24}\n  verify: ${object.verificationUrl}\n  check:  https://globe.adsb.lol/?icao=${object.icao24}`);
    } else {
      console.log(`SKIPPED ${jet.personName} (${jet.name}) — no documented registration`);
    }
  }
  console.log('\nNow spot-check each CANDIDATE line, then run with --confirm <icao24...> to mark verified+live.');
};

const confirm = async (hexes: string[]) => {
  for (const hex of hexes) {
    await db.update(vehicles)
      .set({ verified: true, trackingMode: 'live' })
      .where(eq(vehicles.icao24, hex));
    console.log(`verified + live: ${hex}`);
  }
};

const args = process.argv.slice(2);
(args[0] === '--confirm' ? confirm(args.slice(1)) : run()).then(() => process.exit(0));
```

- [ ] **Step 2: Run candidate pass** — `npx dotenv -e .env.local -- tsx scripts/research-vehicles.ts`. Spot-check each printed `check:` URL (does the hex resolve to the right aircraft type?).

- [ ] **Step 3: Confirm verified hexes** — `npx dotenv -e .env.local -- tsx scripts/research-vehicles.ts --confirm a835af …` for each spot-checked hex.

- [ ] **Step 4: Commit** — `git add scripts/research-vehicles.ts; git commit -m "feat: LLM-assisted vehicle research with manual verification gate"`

---

# Phase 3 — Vehicle Ingest (positions, trips, CO2 events)

Produces: working `/api/ingest/daily` + `/api/ingest/live`, cron wiring, real ADS-B data flowing for verified jets, simulated yachts moving deterministically.

### Task 11: ADS-B client with pure parser

**Files:**
- Create: `src/lib/ingest/adsb.ts`
- Test: `src/lib/ingest/adsb.test.ts`

- [ ] **Step 1: Write failing tests (parser only — fetch stays untested I/O)**

```ts
// src/lib/ingest/adsb.test.ts
import { describe, expect, it } from 'vitest';
import { parseAdsbResponse } from '@/lib/ingest/adsb';

const airborne = { ac: [{ hex: 'a835af', lat: 33.94, lon: -118.40, alt_baro: 38000, gs: 480, track: 70 }] };
const onGround = { ac: [{ hex: 'a835af', lat: 33.94, lon: -118.40, alt_baro: 'ground', gs: 2, track: 0 }] };

describe('parseAdsbResponse', () => {
  it('parses an airborne aircraft', () => {
    const s = parseAdsbResponse(airborne);
    expect(s).toEqual({ lat: 33.94, lng: -118.40, altitudeM: expect.closeTo(11582, 0), heading: 70, isAirborne: true });
  });
  it('detects ground state', () => {
    expect(parseAdsbResponse(onGround)?.isAirborne).toBe(false);
  });
  it('returns null when no aircraft is reported', () => {
    expect(parseAdsbResponse({ ac: [] })).toBeNull();
    expect(parseAdsbResponse({})).toBeNull();
  });
});
```

- [ ] **Step 2: Run tests, verify FAIL.**

- [ ] **Step 3: Implement `src/lib/ingest/adsb.ts`**

```ts
import { z } from 'zod';

const acSchema = z.object({
  lat: z.number(),
  lon: z.number(),
  alt_baro: z.union([z.number(), z.literal('ground')]).optional(),
  track: z.number().optional(),
});
const responseSchema = z.object({ ac: z.array(acSchema).optional() });

export type AdsbState = {
  lat: number;
  lng: number;
  altitudeM: number | null;
  heading: number | null;
  isAirborne: boolean;
};

export const parseAdsbResponse = (json: unknown): AdsbState | null => {
  const parsed = responseSchema.safeParse(json);
  const ac = parsed.success ? parsed.data.ac?.[0] : undefined;
  if (!ac) return null;
  const isAirborne = typeof ac.alt_baro === 'number' && ac.alt_baro > 300; // ft, filters taxiing
  return {
    lat: ac.lat,
    lng: ac.lon,
    altitudeM: typeof ac.alt_baro === 'number' ? ac.alt_baro * 0.3048 : null,
    heading: ac.track ?? null,
    isAirborne,
  };
};

/** Sequential with a polite delay — adsb.lol is a free community API. */
export const fetchJetStates = async (
  icaos: string[],
): Promise<Map<string, AdsbState | null>> => {
  const out = new Map<string, AdsbState | null>();
  for (const icao of icaos) {
    try {
      const res = await fetch(`https://api.adsb.lol/v2/hex/${icao}`, {
        headers: { 'User-Agent': 'greenwash-index (open-source satire project)' },
        signal: AbortSignal.timeout(10_000),
      });
      out.set(icao, res.ok ? parseAdsbResponse(await res.json()) : null);
    } catch {
      out.set(icao, null); // hybrid strategy: missing data degrades, never breaks
    }
    await new Promise((r) => setTimeout(r, 250));
  }
  return out;
};
```

- [ ] **Step 4: Run tests, verify PASS.**

- [ ] **Step 5: Commit** — `git commit -am "feat: adsb.lol client with zod-validated parser"`

### Task 12: Trip state machine (pure core)

Opens a trip when a vehicle starts moving, accumulates haversine distance per tick, closes it (→ CO2 event payload) when it stops.

**Files:**
- Create: `src/lib/ingest/trips.ts`
- Test: `src/lib/ingest/trips.test.ts`

- [ ] **Step 1: Write failing tests**

```ts
// src/lib/ingest/trips.test.ts
import { describe, expect, it } from 'vitest';
import { nextTripState, type TripState } from '@/lib/ingest/trips';

const NOW = new Date('2026-06-10T12:00:00Z');

describe('nextTripState', () => {
  it('opens a trip when moving with no active trip', () => {
    const r = nextTripState(null, { lat: 48, lng: 11, isMoving: true }, NOW);
    expect(r.action).toBe('open');
  });
  it('extends an active trip and accumulates distance', () => {
    const active: TripState = { startLat: 48, startLng: 11, lastLat: 48, lastLng: 11, distanceKm: 0, startedAt: NOW };
    const r = nextTripState(active, { lat: 49, lng: 11, isMoving: true }, NOW);
    expect(r.action).toBe('extend');
    if (r.action === 'extend') expect(r.distanceKm).toBeCloseTo(111, 0);
  });
  it('closes the trip when movement stops', () => {
    const active: TripState = { startLat: 48, startLng: 11, lastLat: 49, lastLng: 11, distanceKm: 111, startedAt: NOW };
    const r = nextTripState(active, { lat: 49.01, lng: 11, isMoving: false }, NOW);
    expect(r.action).toBe('close');
    if (r.action === 'close') expect(r.totalKm).toBeGreaterThan(111);
  });
  it('does nothing when idle with no trip', () => {
    expect(nextTripState(null, { lat: 0, lng: 0, isMoving: false }, NOW).action).toBe('none');
  });
  it('ignores GPS jitter < 1 km while extending', () => {
    const active: TripState = { startLat: 48, startLng: 11, lastLat: 48, lastLng: 11, distanceKm: 50, startedAt: NOW };
    const r = nextTripState(active, { lat: 48.001, lng: 11, isMoving: true }, NOW);
    if (r.action === 'extend') expect(r.distanceKm).toBe(50);
  });
});
```

- [ ] **Step 2: Run tests, verify FAIL.**

- [ ] **Step 3: Implement `src/lib/ingest/trips.ts`**

```ts
import { haversineKm } from '@/lib/geo';

export type TripState = {
  startLat: number; startLng: number;
  lastLat: number; lastLng: number;
  distanceKm: number;
  startedAt: Date;
};

export type Observation = { lat: number; lng: number; isMoving: boolean };

export type TripTransition =
  | { action: 'none' }
  | { action: 'open'; startLat: number; startLng: number; startedAt: Date }
  | { action: 'extend'; lastLat: number; lastLng: number; distanceKm: number }
  | { action: 'close'; endLat: number; endLng: number; totalKm: number; endedAt: Date };

const JITTER_KM = 1;

export const nextTripState = (
  active: TripState | null,
  obs: Observation,
  now: Date,
): TripTransition => {
  if (!active && obs.isMoving)
    return { action: 'open', startLat: obs.lat, startLng: obs.lng, startedAt: now };
  if (!active) return { action: 'none' };

  const legKm = haversineKm(active.lastLat, active.lastLng, obs.lat, obs.lng);
  const grown = legKm >= JITTER_KM ? active.distanceKm + legKm : active.distanceKm;

  if (obs.isMoving)
    return { action: 'extend', lastLat: obs.lat, lastLng: obs.lng, distanceKm: grown };
  return { action: 'close', endLat: obs.lat, endLng: obs.lng, totalKm: grown + (legKm >= JITTER_KM ? 0 : legKm), endedAt: now };
};
```

- [ ] **Step 4: Run tests, verify PASS.**

- [ ] **Step 5: Commit** — `git commit -am "feat: trip state machine (open/extend/close with jitter filter)"`

### Task 13: Deterministic yacht simulation

Yachts move along seeded marina-to-marina voyages: same vehicle + same timestamp ⇒ same position (no DB state needed, labels itself `sim`).

**Files:**
- Create: `src/lib/ingest/yachtSim.ts`
- Test: `src/lib/ingest/yachtSim.test.ts`

- [ ] **Step 1: Write failing tests**

```ts
// src/lib/ingest/yachtSim.test.ts
import { describe, expect, it } from 'vitest';
import { yachtPositionAt, MARINAS } from '@/lib/ingest/yachtSim';

const T = new Date('2026-06-10T12:00:00Z');

describe('yachtPositionAt', () => {
  it('is deterministic', () => {
    expect(yachtPositionAt(7, T)).toEqual(yachtPositionAt(7, T));
  });
  it('differs across vehicles', () => {
    expect(yachtPositionAt(7, T)).not.toEqual(yachtPositionAt(8, T));
  });
  it('returns coordinates within marina bounding region', () => {
    const p = yachtPositionAt(7, T);
    expect(p.lat).toBeGreaterThan(-60);
    expect(p.lat).toBeLessThan(70);
  });
  it('has both moving and moored phases across a week', () => {
    const states = Array.from({ length: 14 }, (_, i) =>
      yachtPositionAt(7, new Date(T.getTime() + i * 12 * 3600_000)).isMoving);
    expect(new Set(states).size).toBe(2);
  });
});

describe('MARINAS', () => {
  it('ships at least 12 destinations', () => {
    expect(MARINAS.length).toBeGreaterThanOrEqual(12);
  });
});
```

- [ ] **Step 2: Run tests, verify FAIL.**

- [ ] **Step 3: Implement `src/lib/ingest/yachtSim.ts`**

```ts
export const MARINAS: { name: string; lat: number; lng: number }[] = [
  { name: 'Monaco', lat: 43.735, lng: 7.421 },
  { name: 'Porto Cervo', lat: 41.136, lng: 9.535 },
  { name: 'Ibiza', lat: 38.910, lng: 1.435 },
  { name: 'St. Tropez', lat: 43.272, lng: 6.640 },
  { name: 'Mykonos', lat: 37.451, lng: 25.330 },
  { name: 'Dubrovnik', lat: 42.640, lng: 18.108 },
  { name: 'St. Barts', lat: 17.897, lng: -62.850 },
  { name: 'Nassau', lat: 25.078, lng: -77.338 },
  { name: 'Miami', lat: 25.772, lng: -80.190 },
  { name: 'Antigua', lat: 17.117, lng: -61.845 },
  { name: 'Dubai Marina', lat: 25.076, lng: 55.133 },
  { name: 'Auckland', lat: -36.843, lng: 174.766 },
  { name: 'Palma de Mallorca', lat: 39.567, lng: 2.633 },
  { name: 'Cannes', lat: 43.549, lng: 7.017 },
];

/** mulberry32 — tiny seeded PRNG, good enough for satire. */
const prng = (seed: number) => () => {
  seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

export type SimPosition = {
  lat: number; lng: number; heading: number; isMoving: boolean;
  from: string; to: string;
};

const WEEK_MS = 7 * 24 * 3600_000;
/** Fraction of each week spent sailing (rest = moored). */
const SAIL_FRACTION = 0.35;

export const yachtPositionAt = (vehicleId: number, at: Date): SimPosition => {
  const week = Math.floor(at.getTime() / WEEK_MS);
  const rand = prng(vehicleId * 7919 + week);
  const fromIdx = Math.floor(rand() * MARINAS.length);
  let toIdx = Math.floor(rand() * MARINAS.length);
  if (toIdx === fromIdx) toIdx = (toIdx + 1) % MARINAS.length;
  const from = MARINAS[fromIdx]!;
  const to = MARINAS[toIdx]!;

  const weekProgress = (at.getTime() % WEEK_MS) / WEEK_MS;
  const isMoving = weekProgress < SAIL_FRACTION;
  const t = isMoving ? weekProgress / SAIL_FRACTION : 1;
  const lat = from.lat + (to.lat - from.lat) * t;
  const lng = from.lng + (to.lng - from.lng) * t;
  const heading = (Math.atan2(to.lng - from.lng, to.lat - from.lat) * 180) / Math.PI;
  return { lat, lng, heading: (heading + 360) % 360, isMoving, from: from.name, to: to.name };
};
```

- [ ] **Step 4: Run tests, verify PASS.**

- [ ] **Step 5: Commit** — `git commit -am "feat: deterministic seeded yacht voyage simulation"`

### Task 14: Pipeline orchestrators

**Files:**
- Create: `src/lib/ingest/pipeline.ts`

- [ ] **Step 1: Write `src/lib/ingest/pipeline.ts`** (I/O orchestration over the tested pure cores; no unit tests — verified end-to-end in Task 15)

```ts
import { and, eq, gte, sql } from 'drizzle-orm';
import { db } from '@/lib/db/client';
import { events, positions, scoreSnapshots, trips, vehicles, persons } from '@/lib/db/schema';
import { getTopNPersonIds, getVehiclesForPersons } from '@/lib/db/queries';
import { fetchJetStates } from './adsb';
import { nextTripState, type TripState } from './trips';
import { yachtPositionAt } from './yachtSim';
import { tripCo2Kg, co2RatePerSecond } from '@/lib/score/co2';
import { advocacyMultiplier, hypocrisyScore, rankPersons } from '@/lib/score/hypocrisy';
import { CONFIG } from '@/config';

type VehicleRow = typeof vehicles.$inferSelect;

const recordObservation = async (
  vehicle: VehicleRow,
  obs: { lat: number; lng: number; isMoving: boolean; heading: number | null; altitudeM: number | null },
  source: 'adsb' | 'sim',
  now: Date,
) => {
  await db.insert(positions).values({
    vehicleId: vehicle.id, lat: obs.lat, lng: obs.lng,
    altitudeM: obs.altitudeM, heading: obs.heading,
    isMoving: obs.isMoving, source, recordedAt: now,
  });

  const [activeRow] = await db.select().from(trips)
    .where(and(eq(trips.vehicleId, vehicle.id), eq(trips.status, 'active'))).limit(1);
  const active: TripState | null = activeRow
    ? { startLat: activeRow.startLat, startLng: activeRow.startLng,
        lastLat: activeRow.lastLat, lastLng: activeRow.lastLng,
        distanceKm: activeRow.distanceKm, startedAt: activeRow.startedAt }
    : null;

  const transition = nextTripState(active, obs, now);
  if (transition.action === 'open') {
    await db.insert(trips).values({
      vehicleId: vehicle.id, status: 'active',
      startLat: transition.startLat, startLng: transition.startLng,
      lastLat: transition.startLat, lastLng: transition.startLng,
      startedAt: transition.startedAt,
    });
  } else if (transition.action === 'extend' && activeRow) {
    await db.update(trips).set({
      lastLat: transition.lastLat, lastLng: transition.lastLng, distanceKm: transition.distanceKm,
    }).where(eq(trips.id, activeRow.id));
  } else if (transition.action === 'close' && activeRow) {
    const co2Kg = tripCo2Kg(transition.totalKm, vehicle.co2KgPerKm);
    await db.update(trips).set({
      status: 'completed', endedAt: transition.endedAt,
      lastLat: transition.endLat, lastLng: transition.endLng, distanceKm: transition.totalKm,
    }).where(eq(trips.id, activeRow.id));
    if (transition.totalKm >= 50) { // ignore repositioning hops
      const isJet = vehicle.type === 'jet';
      await db.insert(events).values({
        personId: vehicle.personId,
        kind: 'negative',
        type: isJet ? 'flight' : 'yacht_trip',
        title: `${isJet ? 'Flight' : 'Yacht trip'} — ${Math.round(transition.totalKm)} km (${vehicle.name})`,
        description: source === 'sim'
          ? 'Simulated voyage (estimated, see methodology).'
          : 'Tracked via public ADS-B data.',
        sourceUrl: source === 'adsb' && vehicle.icao24
          ? `https://globe.adsb.lol/?icao=${vehicle.icao24}`
          : 'https://greenwash-index.example/methodology#simulated',
        occurredAt: now,
        co2Kg,
        autoClassified: true,
      });
    }
  }
};

/** Live tick: refresh positions for the current top N. */
export const runLiveIngest = async (now = new Date()) => {
  const topIds = await getTopNPersonIds(CONFIG.live.topN);
  const vehicleRows = await getVehiclesForPersons(topIds);
  const liveJets = vehicleRows.filter((v) => v.trackingMode === 'live' && v.icao24);
  const simulated = vehicleRows.filter((v) => v.trackingMode === 'simulated');

  const states = await fetchJetStates(liveJets.map((v) => v.icao24!));
  for (const jet of liveJets) {
    const s = states.get(jet.icao24!);
    if (!s) continue; // no signal → keep last known position (graceful degradation)
    await recordObservation(jet, { ...s, lng: s.lng, isMoving: s.isAirborne }, 'adsb', now);
  }
  for (const v of simulated) {
    const p = v.type === 'yacht'
      ? yachtPositionAt(v.id, now)
      : { ...yachtPositionAt(v.id + 100_000, now), isMoving: false }; // unverified jets: parked, no fake flights
    await recordObservation(v, { lat: p.lat, lng: p.lng, isMoving: v.type === 'yacht' && p.isMoving, heading: p.heading, altitudeM: null }, 'sim', now);
  }
  return { liveJets: liveJets.length, simulated: simulated.length };
};

/** Daily run: positions for EVERYONE + recompute all scores. */
export const runDailyPipeline = async (now = new Date()) => {
  const allPersons = await db.select().from(persons);
  const allVehicles = await db.select().from(vehicles);

  // 1) position tick for all vehicles (live jets via ADS-B, rest simulated)
  const liveJets = allVehicles.filter((v) => v.trackingMode === 'live' && v.icao24);
  const states = await fetchJetStates(liveJets.map((v) => v.icao24!));
  for (const jet of liveJets) {
    const s = states.get(jet.icao24!);
    if (s) await recordObservation(jet, { ...s, isMoving: s.isAirborne }, 'adsb', now);
  }
  for (const v of allVehicles.filter((x) => x.trackingMode === 'simulated')) {
    const p = yachtPositionAt(v.id, now);
    await recordObservation(v, { lat: p.lat, lng: p.lng, isMoving: v.type === 'yacht' && p.isMoving, heading: p.heading, altitudeM: null }, 'sim', now);
  }

  // 2) score snapshot per person
  const windowStart = new Date(now.getTime() - CONFIG.co2.windowDays * 86_400_000);
  const dayStart = new Date(now.getTime() - 86_400_000);
  const scored = [] as { personId: number; co2Kg12m: number; co2KgTotal: number; multiplier: number; score: number; co2RatePerSec: number }[];
  for (const p of allPersons) {
    const sums = await db.select({
      kg12m: sql<number>`coalesce(sum(${events.co2Kg}) filter (where ${events.occurredAt} >= ${windowStart}), 0)`,
      kgTotal: sql<number>`coalesce(sum(${events.co2Kg}), 0)`,
      kg24h: sql<number>`coalesce(sum(${events.co2Kg}) filter (where ${events.occurredAt} >= ${dayStart}), 0)`,
    }).from(events).where(and(eq(events.personId, p.id), eq(events.kind, 'negative')));
    const advocacy = await db.select({
      weight: events.advocacyWeight, occurredAt: events.occurredAt,
    }).from(events).where(and(eq(events.personId, p.id), eq(events.kind, 'positive')));

    const m = advocacyMultiplier(
      advocacy.map((a) => ({ weight: a.weight ?? 1, occurredAt: a.occurredAt })), now);
    const co2Kg12m = sums[0]?.kg12m ?? 0;
    scored.push({
      personId: p.id,
      co2Kg12m,
      co2KgTotal: sums[0]?.kgTotal ?? 0,
      multiplier: m,
      score: hypocrisyScore(co2Kg12m / 1000, m),
      co2RatePerSec: co2RatePerSecond(sums[0]?.kg24h ?? 0),
    });
  }
  const ranked = rankPersons(scored);
  const today = now.toISOString().slice(0, 10);
  for (const r of ranked) {
    await db.insert(scoreSnapshots).values({ ...r, snapshotDate: today });
  }
  return { persons: ranked.length };
};
```

- [ ] **Step 2: Typecheck** — `npx tsc --noEmit` → clean.

- [ ] **Step 3: Commit** — `git commit -am "feat: daily + live ingest orchestrators"`

### Task 15: Ingest API routes (secured)

**Files:**
- Create: `src/app/api/ingest/daily/route.ts`, `src/app/api/ingest/live/route.ts`

- [ ] **Step 0: Write `src/lib/auth.ts`** — timing-safe comparison (security addendum #3):

```ts
import { timingSafeEqual } from 'node:crypto';

/** Constant-time check of "Bearer <INGEST_SECRET>" — never compare secrets with ===. */
export const isAuthorized = (authHeader: string | null): boolean => {
  const secret = process.env.INGEST_SECRET;
  if (!secret || !authHeader) return false;
  const expected = Buffer.from(`Bearer ${secret}`);
  const received = Buffer.from(authHeader);
  return expected.length === received.length && timingSafeEqual(expected, received);
};
```

- [ ] **Step 1: Write `src/app/api/ingest/daily/route.ts`**

```ts
import { runDailyPipeline } from '@/lib/ingest/pipeline';
import { runNewsScan } from '@/lib/ingest/classify'; // added in Task 18 — stub `export const runNewsScan = async () => ({ scanned: 0 });` in classify.ts NOW so this compiles
import { isAuthorized } from '@/lib/auth';
import { NextRequest, NextResponse } from 'next/server';

export const maxDuration = 300;

// Vercel cron sends Authorization: Bearer <CRON_SECRET> — set CRON_SECRET = INGEST_SECRET
export const GET = async (req: NextRequest) => {
  if (!isAuthorized(req.headers.get('authorization')))
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const pipeline = await runDailyPipeline();
  const news = await runNewsScan();
  return NextResponse.json({ ok: true, pipeline, news });
};
```

- [ ] **Step 2: Write `src/app/api/ingest/live/route.ts`**

```ts
import { runLiveIngest } from '@/lib/ingest/pipeline';
import { isAuthorized } from '@/lib/auth';
import { NextRequest, NextResponse } from 'next/server';

export const maxDuration = 120;

export const POST = async (req: NextRequest) => {
  if (!isAuthorized(req.headers.get('authorization')))
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  return NextResponse.json({ ok: true, ...(await runLiveIngest()) });
};
```

- [ ] **Step 3: Create the stub in `src/lib/ingest/classify.ts`** (replaced in Task 18):

```ts
export const runNewsScan = async (): Promise<{ scanned: number }> => ({ scanned: 0 });
```

- [ ] **Step 4: Set `INGEST_SECRET` in `.env.local`** (generate: `node -e "console.log(crypto.randomBytes(32).toString('hex'))"`).

- [ ] **Step 5: End-to-end check** — `npm run dev`, then:

```powershell
curl -X POST http://localhost:3000/api/ingest/live -H "Authorization: Bearer <secret>"
curl http://localhost:3000/api/ingest/daily -H "Authorization: Bearer <secret>"
```

Expected: `{"ok":true,...}` and rows in `positions` / `score_snapshots`. Without the header: 401.

- [ ] **Step 6: Commit** — `git commit -am "feat: secured ingest routes (daily cron + live tick)"`

### Task 16: Cron wiring (vercel.ts + GitHub Actions)

**Files:**
- Create: `vercel.ts`, `.github/workflows/live-ingest.yml`

- [ ] **Step 1: Install typed config + write `vercel.ts`**

```powershell
npm i -D @vercel/config
```

```ts
// vercel.ts
import type { VercelConfig } from '@vercel/config/v1';

export const config: VercelConfig = {
  crons: [{ path: '/api/ingest/daily', schedule: '0 4 * * *' }],
};
```

Note: Vercel sends `Authorization: Bearer $CRON_SECRET` to cron endpoints — set the Vercel env var `CRON_SECRET` **and** `INGEST_SECRET` to the same value so the daily route's check passes.

- [ ] **Step 2: Write `.github/workflows/live-ingest.yml`**

```yaml
name: live-ingest
on:
  schedule:
    - cron: '*/15 * * * *'   # keep in sync with CONFIG.live.intervalMinutes
  workflow_dispatch: {}
permissions:
  contents: read
jobs:
  tick:
    runs-on: ubuntu-latest
    steps:
      - name: Trigger live ingest
        run: |
          curl -fsS -X POST "${{ secrets.APP_URL }}/api/ingest/live" \
            -H "Authorization: Bearer ${{ secrets.INGEST_SECRET }}" \
            --max-time 110
```

- [ ] **Step 3: Commit** — `git add vercel.ts .github; git commit -m "feat: daily vercel cron + 15-min github actions live tick"`

(GH secrets `APP_URL` + `INGEST_SECRET` are set in Task 32 when the repo goes public.)

---

# Phase 4 — Self-Maintaining Advocacy Pipeline

Produces: news scanning + LLM classification with guardrails, one-time historical backfill.

### Task 17: News fetchers (Google News RSS + GDELT)

**Files:**
- Create: `src/lib/ingest/news.ts`
- Test: `src/lib/ingest/news.test.ts`

- [ ] **Step 1: Write failing tests (pure parsing)**

```ts
// src/lib/ingest/news.test.ts
import { describe, expect, it } from 'vitest';
import { parseGoogleNewsRss, parseGdelt, dedupeArticles } from '@/lib/ingest/news';

const rss = `<?xml version="1.0"?><rss><channel>
<item><title>Musk speaks on climate</title><link>https://example.com/a</link><pubDate>Tue, 09 Jun 2026 10:00:00 GMT</pubDate><source url="https://example.com">Example</source></item>
<item><title>Second item</title><link>https://example.com/b</link><pubDate>Mon, 08 Jun 2026 10:00:00 GMT</pubDate></item>
</channel></rss>`;

describe('parseGoogleNewsRss', () => {
  it('extracts title/url/date', () => {
    const items = parseGoogleNewsRss(rss);
    expect(items).toHaveLength(2);
    expect(items[0]).toMatchObject({ title: 'Musk speaks on climate', url: 'https://example.com/a' });
    expect(items[0]!.publishedAt.getUTCDate()).toBe(9);
  });
  it('returns [] on garbage', () => {
    expect(parseGoogleNewsRss('not xml at all')).toEqual([]);
  });
});

describe('parseGdelt', () => {
  it('maps articles', () => {
    const json = { articles: [{ title: 'T', url: 'https://x.com/1', seendate: '20260609T100000Z' }] };
    expect(parseGdelt(json)[0]).toMatchObject({ title: 'T', url: 'https://x.com/1' });
  });
});

describe('dedupeArticles', () => {
  it('drops duplicate URLs', () => {
    const a = { title: 'a', url: 'https://x.com/1', publishedAt: new Date() };
    expect(dedupeArticles([a, { ...a, title: 'b' }])).toHaveLength(1);
  });
});
```

- [ ] **Step 2: Run tests, verify FAIL.**

- [ ] **Step 3: Implement `src/lib/ingest/news.ts`**

```ts
import { XMLParser } from 'fast-xml-parser';

export type Article = { title: string; url: string; publishedAt: Date };

export const parseGoogleNewsRss = (xml: string): Article[] => {
  try {
    const doc = new XMLParser().parse(xml);
    const items = doc?.rss?.channel?.item;
    const list = Array.isArray(items) ? items : items ? [items] : [];
    return list
      .filter((i: Record<string, unknown>) => typeof i.link === 'string' && typeof i.title === 'string')
      .map((i: { title: string; link: string; pubDate?: string }) => ({
        title: i.title,
        url: i.link,
        publishedAt: i.pubDate ? new Date(i.pubDate) : new Date(),
      }));
  } catch {
    return [];
  }
};

export const parseGdelt = (json: unknown): Article[] => {
  const articles = (json as { articles?: { title?: string; url?: string; seendate?: string }[] })?.articles ?? [];
  return articles
    .filter((a) => a.title && a.url)
    .map((a) => ({
      title: a.title!,
      url: a.url!,
      publishedAt: a.seendate
        ? new Date(a.seendate.replace(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z?$/, '$1-$2-$3T$4:$5:$6Z'))
        : new Date(),
    }));
};

export const dedupeArticles = (articles: Article[]): Article[] => {
  const seen = new Set<string>();
  return articles.filter((a) => (seen.has(a.url) ? false : (seen.add(a.url), true)));
};

const CLIMATE_TERMS = '(climate OR emissions OR sustainability OR "private jet" OR yacht OR donation)';

export const fetchArticlesFor = async (personName: string): Promise<Article[]> => {
  const out: Article[] = [];
  try {
    const q = encodeURIComponent(`"${personName}" ${CLIMATE_TERMS}`);
    const res = await fetch(`https://news.google.com/rss/search?q=${q}&hl=en-US&gl=US&ceid=US:en`, {
      signal: AbortSignal.timeout(10_000),
    });
    if (res.ok) out.push(...parseGoogleNewsRss(await res.text()));
  } catch { /* degrade */ }
  try {
    const q = encodeURIComponent(`"${personName}" climate`);
    const res = await fetch(
      `https://api.gdeltproject.org/api/v2/doc/doc?query=${q}&mode=artlist&maxrecords=25&format=json&timespan=2d`,
      { signal: AbortSignal.timeout(10_000) },
    );
    if (res.ok) out.push(...parseGdelt(await res.json()));
  } catch { /* degrade */ }
  return dedupeArticles(out);
};
```

- [ ] **Step 4: Run tests, verify PASS.**

- [ ] **Step 5: Commit** — `git commit -am "feat: google news rss + gdelt fetchers with pure parsers"`

### Task 18: LLM classification with guardrails

Replaces the Task-15 stub. Guardrails (decision 8): resolvable sourceUrl, confidence ≥ `CONFIG.score.confidenceThreshold`, `autoClassified: true` always set, URL-hash dedupe via `seen_articles`.

**Files:**
- Modify: `src/lib/ingest/classify.ts` (replace stub)
- Test: `src/lib/ingest/classify.test.ts`

- [ ] **Step 1: Write failing tests (guardrail logic is pure)**

```ts
// src/lib/ingest/classify.test.ts
import { describe, expect, it } from 'vitest';
import { passesGuardrails, classificationSchema } from '@/lib/ingest/classify';

const base = {
  relevant: true, kind: 'positive' as const, type: 'speech' as const,
  title: 'Gave climate speech', summary: 'Spoke at summit', confidence: 0.9,
  eventDate: '2026-06-08',
};

describe('passesGuardrails', () => {
  it('accepts a confident, sourced, relevant event', () => {
    expect(passesGuardrails(base, 'https://example.com/article')).toBe(true);
  });
  it('rejects below confidence threshold', () => {
    expect(passesGuardrails({ ...base, confidence: 0.5 }, 'https://example.com/a')).toBe(false);
  });
  it('rejects irrelevant', () => {
    expect(passesGuardrails({ ...base, relevant: false }, 'https://example.com/a')).toBe(false);
  });
  it('rejects non-http sources', () => {
    expect(passesGuardrails(base, 'ftp://nope')).toBe(false);
  });
});

describe('classificationSchema', () => {
  it('rejects invalid advocacy types', () => {
    expect(classificationSchema.safeParse({ ...base, type: 'sorcery' }).success).toBe(false);
  });
});
```

- [ ] **Step 2: Run tests, verify FAIL.**

- [ ] **Step 3: Implement `src/lib/ingest/classify.ts`**

```ts
import { createHash } from 'node:crypto';
import { generateObject } from 'ai';
import { z } from 'zod';
import { db } from '@/lib/db/client';
import { events, persons, seenArticles } from '@/lib/db/schema';
import { fetchArticlesFor, type Article } from './news';
import { CONFIG } from '@/config';

export const classificationSchema = z.object({
  relevant: z.boolean(),
  kind: z.enum(['positive', 'negative']),
  type: z.enum(['post', 'donation', 'investment', 'interview', 'speech', 'preaching', 'flight', 'yacht_trip', 'asset']),
  title: z.string().max(140),
  summary: z.string().max(400),
  confidence: z.number().min(0).max(1),
  eventDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});
export type Classification = z.infer<typeof classificationSchema>;

export const passesGuardrails = (c: Classification, sourceUrl: string): boolean =>
  c.relevant &&
  c.confidence >= CONFIG.score.confidenceThreshold &&
  /^https?:\/\//.test(sourceUrl);

const urlHash = (url: string): string => createHash('sha256').update(url).digest('hex');

const SYSTEM = `You classify news articles about a public figure for a satirical but factually rigorous climate-accountability index.
Classify ONLY what the article headline explicitly supports. Rules:
- "positive" = verifiable pro-climate act: donation, green investment, interview, speech, social post — type "preaching" ONLY if they publicly urge OTHERS to fly less / eat less meat / live greener.
- "negative" = documented high-emission act (charter flight reported, new yacht, mansion purchase).
- relevant=false for gossip, unrelated business news, or speculation.
- NEVER infer beyond the headline. Low information ⇒ low confidence.`;

export const classifyArticle = async (
  personName: string,
  article: Article,
): Promise<Classification | null> => {
  try {
    const { object } = await generateObject({
      model: 'anthropic/claude-haiku-4-5',
      schema: classificationSchema,
      system: SYSTEM,
      prompt: `Person: ${personName}\nHeadline: ${article.title}\nPublished: ${article.publishedAt.toISOString()}`,
    });
    return object;
  } catch {
    return null;
  }
};

export const advocacyWeightFor = (type: Classification['type']): number =>
  CONFIG.score.advocacyWeights[type as keyof typeof CONFIG.score.advocacyWeights] ?? 1;

/** Daily scan: new articles for every person → classified, guarded, stored. */
export const runNewsScan = async (): Promise<{ scanned: number; stored: number }> => {
  const allPersons = await db.select().from(persons);
  let scanned = 0;
  let stored = 0;
  for (const p of allPersons) {
    const articles = await fetchArticlesFor(p.name);
    for (const article of articles) {
      scanned++;
      const hash = urlHash(article.url);
      const inserted = await db.insert(seenArticles).values({ urlHash: hash })
        .onConflictDoNothing().returning();
      if (inserted.length === 0) continue; // already processed
      const c = await classifyArticle(p.name, article);
      if (!c || !passesGuardrails(c, article.url)) continue;
      await db.insert(events).values({
        personId: p.id,
        kind: c.kind,
        type: c.type,
        title: c.title,
        description: c.summary,
        sourceUrl: article.url,
        occurredAt: new Date(`${c.eventDate}T12:00:00Z`),
        advocacyWeight: c.kind === 'positive' ? advocacyWeightFor(c.type) : null,
        confidence: c.confidence,
        autoClassified: true,
      });
      stored++;
    }
    await new Promise((r) => setTimeout(r, 500)); // politeness between persons
  }
  return { scanned, stored };
};
```

- [ ] **Step 4: Run tests, verify PASS.** Also `npx tsc --noEmit` (the Task-15 import now resolves to the real implementation).

- [ ] **Step 5: Set `AI_GATEWAY_API_KEY` in `.env.local`** (Vercel dashboard → AI Gateway → API key).

- [ ] **Step 6: Commit** — `git commit -am "feat: llm news classification with guardrails and url dedupe"`

### Task 19: One-time historical backfill

**Files:**
- Create: `scripts/backfill.ts`

- [ ] **Step 1: Write `scripts/backfill.ts`** — same pipeline, wider time horizon, stronger model:

```ts
import { db } from '../src/lib/db/client';
import { persons, events, seenArticles } from '../src/lib/db/schema';
import { parseGdelt, dedupeArticles, type Article } from '../src/lib/ingest/news';
import { classifyArticle, passesGuardrails, advocacyWeightFor } from '../src/lib/ingest/classify';
import { createHash } from 'node:crypto';

/** GDELT full-text archive reaches back years — query in 6-month windows. */
const fetchHistorical = async (name: string): Promise<Article[]> => {
  const out: Article[] = [];
  const windows = ['2020-2021', '2021-2022', '2022-2023', '2023-2024', '2024-2025', '2025-2026'];
  for (const w of windows) {
    const [from, to] = w.split('-');
    const q = encodeURIComponent(`"${name}" (climate OR "private jet" OR yacht OR donation)`);
    try {
      const res = await fetch(
        `https://api.gdeltproject.org/api/v2/doc/doc?query=${q}&mode=artlist&maxrecords=50&format=json&startdatetime=${from}0101000000&enddatetime=${to}0101000000`,
        { signal: AbortSignal.timeout(15_000) },
      );
      if (res.ok) out.push(...parseGdelt(await res.json()));
    } catch { /* skip window */ }
    await new Promise((r) => setTimeout(r, 1_000));
  }
  return dedupeArticles(out);
};

const run = async () => {
  const allPersons = await db.select().from(persons);
  for (const p of allPersons) {
    console.log(`\n=== ${p.name} ===`);
    const articles = await fetchHistorical(p.name);
    console.log(`  ${articles.length} candidate articles`);
    for (const article of articles) {
      const hash = createHash('sha256').update(article.url).digest('hex');
      const fresh = await db.insert(seenArticles).values({ urlHash: hash })
        .onConflictDoNothing().returning();
      if (fresh.length === 0) continue;
      const c = await classifyArticle(p.name, article);
      if (!c || !passesGuardrails(c, article.url)) continue;
      await db.insert(events).values({
        personId: p.id, kind: c.kind, type: c.type, title: c.title,
        description: c.summary, sourceUrl: article.url,
        occurredAt: new Date(`${c.eventDate}T12:00:00Z`),
        advocacyWeight: c.kind === 'positive' ? advocacyWeightFor(c.type) : null,
        confidence: c.confidence, autoClassified: true,
      });
      console.log(`  + [${c.kind}/${c.type}] ${c.title}`);
    }
  }
};

run().then(() => process.exit(0));
```

- [ ] **Step 2: Dry-run on ONE person first** (temporarily slice `allPersons.slice(0, 1)`), inspect inserted rows for quality, then run the full backfill: `npx dotenv -e .env.local -- tsx scripts/backfill.ts` (takes ~30–60 min, ~50 persons × 6 windows; cost: a few EUR of Haiku calls).

- [ ] **Step 3: Run the daily pipeline once** so snapshots exist: `curl http://localhost:3000/api/ingest/daily -H "Authorization: Bearer <secret>"`.

- [ ] **Step 4: Commit** — `git add scripts/backfill.ts; git commit -m "feat: one-time historical event backfill via gdelt archive"`

---

# Phase 5 — Public API Routes (cached)

Produces: the three read endpoints the frontend consumes, with CDN caching.

### Task 20: Leaderboard + person + positions routes

**Files:**
- Create: `src/app/api/leaderboard/route.ts`, `src/app/api/persons/[slug]/route.ts`, `src/app/api/positions/route.ts`

- [ ] **Step 1: Write `src/app/api/leaderboard/route.ts`**

```ts
import { NextResponse } from 'next/server';
import { getLeaderboard, getRecentEvents } from '@/lib/db/queries';
import { CONFIG } from '@/config';

export const GET = async () => {
  const [leaderboard, recentEvents] = await Promise.all([getLeaderboard(), getRecentEvents(20)]);
  return NextResponse.json(
    { leaderboard, recentEvents, generatedAt: new Date().toISOString() },
    { headers: { 'Cache-Control': `public, s-maxage=${CONFIG.cache.leaderboardSMaxAge}, stale-while-revalidate=${CONFIG.cache.staleWhileRevalidate}` } },
  );
};
```

- [ ] **Step 2: Write `src/app/api/persons/[slug]/route.ts`**

```ts
import { NextRequest, NextResponse } from 'next/server';
import { getPersonDetail } from '@/lib/db/queries';
import { CONFIG } from '@/config';

export const GET = async (
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) => {
  const { slug } = await params;
  const detail = await getPersonDetail(slug);
  if (!detail) return NextResponse.json({ error: 'not found' }, { status: 404 });
  return NextResponse.json(detail, {
    headers: { 'Cache-Control': `public, s-maxage=${CONFIG.cache.personSMaxAge}, stale-while-revalidate=${CONFIG.cache.staleWhileRevalidate}` },
  });
};
```

- [ ] **Step 3: Write `src/app/api/positions/route.ts`**

```ts
import { NextResponse } from 'next/server';
import { getCurrentPositions } from '@/lib/db/queries';
import { CONFIG } from '@/config';

export const GET = async () => {
  const data = await getCurrentPositions();
  return NextResponse.json(data, {
    headers: { 'Cache-Control': `public, s-maxage=${CONFIG.cache.positionsSMaxAge}, stale-while-revalidate=${CONFIG.cache.staleWhileRevalidate}` },
  });
};
```

- [ ] **Step 4: Verify** — `npm run dev`; `curl http://localhost:3000/api/leaderboard` returns ranked persons; `curl http://localhost:3000/api/positions` returns latest positions; `curl http://localhost:3000/api/persons/elon-musk` returns events. Check `Cache-Control` headers present.

- [ ] **Step 5: Commit** — `git commit -am "feat: cached public api (leaderboard, person detail, positions)"`

### Task 21: Shared API types for the frontend

**Files:**
- Create: `src/lib/api-types.ts`

- [ ] **Step 1: Write `src/lib/api-types.ts`** — derive types from queries so client components don't import server code:

```ts
import type { getLeaderboard, getPersonDetail, getCurrentPositions, getRecentEvents } from '@/lib/db/queries';

export type LeaderboardEntry = Awaited<ReturnType<typeof getLeaderboard>>[number];
export type PersonDetail = NonNullable<Awaited<ReturnType<typeof getPersonDetail>>>;
export type PositionsPayload = Awaited<ReturnType<typeof getCurrentPositions>>;
export type RecentEvent = Awaited<ReturnType<typeof getRecentEvents>>[number];

export type LeaderboardPayload = {
  leaderboard: LeaderboardEntry[];
  recentEvents: RecentEvent[];
  generatedAt: string;
};
```

- [ ] **Step 2: Typecheck + commit** — `npx tsc --noEmit; git commit -am "feat: shared api types"`

---

# Phase 6 — Frontend Foundation

> **REQUIRED SUB-SKILL before any UI code in Phases 6–8:** invoke `ui-ux-pro-max:ui-ux-pro-max` with the design brief: *"dark mission-control / cyberpunk data-viz dashboard, near-black blue-tinted background, neon green (#22ff88) for positive / neon red (#ff3b5c) for negative accents, mono font for all numbers, glow effects on interactive elements, English UI"*. Where its output conflicts with exact class names below, the skill's design system wins — the component structure, props and behavior in this plan stay binding.

Produces: app shell, theme tokens, Zustand store with persisted favorites, sidebar with search + leaderboard, CO2 ticker.

### Task 22: Theme + layout + store

**Files:**
- Modify: `src/app/globals.css`, `src/app/layout.tsx`
- Create: `src/lib/store.ts`, `src/lib/format.ts`
- Test: `src/lib/format.test.ts`

- [ ] **Step 1: Define theme tokens in `src/app/globals.css`** (Tailwind v4 `@theme`)

```css
@import "tailwindcss";

@theme {
  --color-abyss: #05080f;        /* page background */
  --color-panel: #0a1020;        /* cards/sidebar */
  --color-panel-edge: #1a2a45;   /* borders */
  --color-grid: #0f1830;
  --color-pos: #22ff88;          /* positive / green */
  --color-neg: #ff3b5c;          /* negative / red */
  --color-accent: #38bdf8;       /* cyan highlights, routes */
  --color-dim: #7d8db1;          /* secondary text */
  --font-mono-num: var(--font-geist-mono), ui-monospace, monospace;
}

body {
  background: var(--color-abyss);
  color: #e2e8f0;
}
```

- [ ] **Step 2: Write `src/lib/format.ts` + failing tests first**

```ts
// src/lib/format.test.ts
import { describe, expect, it } from 'vitest';
import { formatCo2Kg, formatScore } from '@/lib/format';

describe('formatCo2Kg', () => {
  it('formats tons above 1000 kg', () => expect(formatCo2Kg(1_234_500)).toBe('1,234.5 t'));
  it('formats kg below 1000', () => expect(formatCo2Kg(420)).toBe('420 kg'));
});
describe('formatScore', () => {
  it('rounds to integer with separators', () => expect(formatScore(15040.7)).toBe('15,041'));
});
```

```ts
// src/lib/format.ts
export const formatCo2Kg = (kg: number): string =>
  kg >= 1000
    ? `${(kg / 1000).toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} t`
    : `${Math.round(kg).toLocaleString('en-US')} kg`;

export const formatScore = (score: number): string =>
  Math.round(score).toLocaleString('en-US');
```

Run `npm test` (fail → implement → pass).

- [ ] **Step 3: Write `src/lib/store.ts`**

```ts
'use client';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type SelectionState = {
  selectedPersonId: number | null;
  selectedVehicleId: number | null;
  select: (personId: number | null, vehicleId?: number | null) => void;
  favorites: number[]; // person ids, persisted to localStorage
  toggleFavorite: (personId: number) => void;
  search: string;
  setSearch: (q: string) => void;
};

export const useAppStore = create<SelectionState>()(
  persist(
    (set, get) => ({
      selectedPersonId: null,
      selectedVehicleId: null,
      select: (personId, vehicleId = null) =>
        set({ selectedPersonId: personId, selectedVehicleId: vehicleId }),
      favorites: [],
      toggleFavorite: (personId) =>
        set({
          favorites: get().favorites.includes(personId)
            ? get().favorites.filter((id) => id !== personId)
            : [...get().favorites, personId],
        }),
      search: '',
      setSearch: (q) => set({ search: q }),
    }),
    {
      name: 'greenwash-index', // localStorage key — functional only, no consent needed
      partialize: (s) => ({ favorites: s.favorites }),
    },
  ),
);
```

- [ ] **Step 4: Update `src/app/layout.tsx`** (metadata + fonts; ConsentLoader added in Task 30)

```tsx
import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';

const geist = Geist({ subsets: ['latin'], variable: '--font-geist-sans' });
const geistMono = Geist_Mono({ subsets: ['latin'], variable: '--font-geist-mono' });

export const metadata: Metadata = {
  title: 'Greenwash Index — who preaches water and flies kerosene',
  description:
    'Satirical data visualization ranking public figures by the gap between their climate advocacy and their documented private-jet and yacht emissions.',
};

const RootLayout = ({ children }: { children: React.ReactNode }) => (
  <html lang="en" className={`${geist.variable} ${geistMono.variable}`}>
    <body className="antialiased">{children}</body>
  </html>
);

export default RootLayout;
```

- [ ] **Step 5: Commit** — `git commit -am "feat: theme tokens, app shell, persisted store, formatters"`

### Task 23: CO2 ticker + badges + texture asset

**Files:**
- Create: `src/components/ui/Co2Ticker.tsx`, `src/components/ui/SourceBadge.tsx`, `public/textures/earth-night.jpg`

- [ ] **Step 1: Download the earth texture**

```powershell
curl -L -o public/textures/earth-night.jpg "https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/textures/planets/earth_lights_2048.png"
```

(If the three.js example texture moved, NASA Black Marble 2016 grayscale from `https://visibleearth.nasa.gov/images/144898` works — any 2k equirectangular night-lights image, public domain. Keep < 1 MB, convert to .jpg q80.)

- [ ] **Step 2: Write `src/components/ui/Co2Ticker.tsx`** — interpolates from snapshot base + rate (decision 5):

```tsx
'use client';
import { useEffect, useRef, useState } from 'react';
import { formatCo2Kg } from '@/lib/format';

type Props = {
  baseKg: number;          // co2Kg12m or co2KgTotal at snapshot time
  ratePerSec: number;      // co2RatePerSec from snapshot
  snapshotAt: string;      // ISO date of snapshot
  className?: string;
};

export const Co2Ticker = ({ baseKg, ratePerSec, snapshotAt, className }: Props) => {
  const [display, setDisplay] = useState(baseKg);
  const raf = useRef(0);

  useEffect(() => {
    const t0 = new Date(snapshotAt).getTime();
    const tick = () => {
      const elapsedSec = (Date.now() - t0) / 1000;
      setDisplay(baseKg + Math.max(0, elapsedSec) * ratePerSec);
      raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current);
  }, [baseKg, ratePerSec, snapshotAt]);

  return (
    <span className={`font-[family-name:var(--font-mono-num)] tabular-nums ${className ?? ''}`}
      title="Estimated — interpolated from the last data refresh">
      {formatCo2Kg(display)}
    </span>
  );
};
```

- [ ] **Step 3: Write `src/components/ui/SourceBadge.tsx`** — provenance labels (decisions 1 & 8):

```tsx
const STYLES: Record<string, { label: string; cls: string; title: string }> = {
  adsb: { label: 'LIVE', cls: 'text-pos border-pos/40', title: 'Tracked via public ADS-B data' },
  sim: { label: 'SIMULATED', cls: 'text-dim border-panel-edge', title: 'Simulated plausible route — see methodology' },
  auto: { label: 'AI-CLASSIFIED', cls: 'text-accent border-accent/40', title: 'Auto-classified from a news source — click source to verify' },
  estimated: { label: 'ESTIMATED', cls: 'text-amber-400 border-amber-400/40', title: 'Computed estimate — see methodology' },
};

export const SourceBadge = ({ kind }: { kind: keyof typeof STYLES }) => {
  const s = STYLES[kind]!;
  return (
    <span title={s.title}
      className={`rounded border px-1 py-px text-[9px] font-semibold tracking-widest ${s.cls}`}>
      {s.label}
    </span>
  );
};
```

- [ ] **Step 4: Commit** — `git commit -am "feat: co2 ticker, provenance badges, earth texture"`

### Task 24: Sidebar (search + leaderboard + bottom sheet)

**Files:**
- Create: `src/components/sidebar/Sidebar.tsx`, `src/components/sidebar/LeaderboardRow.tsx`, `src/components/ui/FavoriteButton.tsx`

- [ ] **Step 1: Write `src/components/ui/FavoriteButton.tsx`**

```tsx
'use client';
import { useAppStore } from '@/lib/store';

export const FavoriteButton = ({ personId }: { personId: number }) => {
  const isFav = useAppStore((s) => s.favorites.includes(personId));
  const toggle = useAppStore((s) => s.toggleFavorite);
  return (
    <button
      aria-label={isFav ? 'Remove from favorites' : 'Add to favorites'}
      onClick={(e) => { e.stopPropagation(); toggle(personId); }}
      className={`text-sm transition ${isFav ? 'text-pos' : 'text-dim hover:text-pos/70'}`}
    >
      {isFav ? '★' : '☆'}
    </button>
  );
};
```

- [ ] **Step 2: Write `src/components/sidebar/LeaderboardRow.tsx`**

```tsx
'use client';
import Link from 'next/link';
import type { LeaderboardEntry } from '@/lib/api-types';
import { Co2Ticker } from '@/components/ui/Co2Ticker';
import { FavoriteButton } from '@/components/ui/FavoriteButton';
import { useAppStore } from '@/lib/store';

export const LeaderboardRow = ({ entry }: { entry: LeaderboardEntry }) => {
  const select = useAppStore((s) => s.select);
  const isSelected = useAppStore((s) => s.selectedPersonId === entry.personId);
  return (
    <li>
      <button
        onClick={() => select(entry.personId)}
        className={`flex w-full items-center gap-3 border-l-2 px-3 py-2 text-left transition
          ${isSelected ? 'border-accent bg-panel-edge/40' : 'border-transparent hover:bg-panel-edge/20'}`}
      >
        <span className="w-7 shrink-0 font-[family-name:var(--font-mono-num)] text-xs text-dim">
          #{entry.rank}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-medium">{entry.name}</span>
          <span className="block text-[11px] text-dim">
            ×{entry.multiplier.toFixed(1)} hypocrisy ·{' '}
            <Co2Ticker baseKg={entry.co2Kg12m} ratePerSec={entry.co2RatePerSec}
              snapshotAt={entry.snapshotDate} className="text-neg" /> / yr
          </span>
        </span>
        <FavoriteButton personId={entry.personId} />
        <Link href={`/person/${entry.slug}`} onClick={(e) => e.stopPropagation()}
          aria-label={`Open ${entry.name} profile`}
          className="text-dim transition hover:text-accent">→</Link>
      </button>
    </li>
  );
};
```

- [ ] **Step 3: Write `src/components/sidebar/Sidebar.tsx`** — desktop panel / mobile bottom sheet:

```tsx
'use client';
import { useMemo, useState } from 'react';
import type { LeaderboardEntry } from '@/lib/api-types';
import { LeaderboardRow } from './LeaderboardRow';
import { useAppStore } from '@/lib/store';

export const Sidebar = ({ entries }: { entries: LeaderboardEntry[] }) => {
  const search = useAppStore((s) => s.search);
  const setSearch = useAppStore((s) => s.setSearch);
  const favorites = useAppStore((s) => s.favorites);
  const [expanded, setExpanded] = useState(false); // mobile sheet state

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const matched = q ? entries.filter((e) => e.name.toLowerCase().includes(q)) : entries;
    return [...matched].sort((a, b) => {
      const favDelta = Number(favorites.includes(b.personId)) - Number(favorites.includes(a.personId));
      return favDelta !== 0 ? favDelta : a.rank - b.rank;
    });
  }, [entries, search, favorites]);

  return (
    <aside
      className={`absolute inset-x-0 bottom-0 z-20 flex flex-col rounded-t-2xl border border-panel-edge bg-panel/90 backdrop-blur
        transition-[height] duration-300 md:inset-y-0 md:left-0 md:right-auto md:h-full md:w-80 md:rounded-none md:border-y-0 md:border-l-0
        ${expanded ? 'h-[70dvh]' : 'h-36'} md:h-full`}
    >
      <button className="py-2 md:hidden" aria-label="Toggle leaderboard"
        onClick={() => setExpanded((v) => !v)}>
        <span className="mx-auto block h-1 w-10 rounded bg-panel-edge" />
      </button>
      <div className="px-3 pb-2">
        <h1 className="text-xs font-semibold uppercase tracking-[0.2em] text-dim">
          Greenwash Index
        </h1>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search persons of interest…"
          className="mt-2 w-full rounded border border-panel-edge bg-abyss px-2 py-1.5 text-sm
            placeholder:text-dim focus:border-accent focus:outline-none"
        />
      </div>
      <ul className="min-h-0 flex-1 overflow-y-auto">
        {filtered.map((e) => <LeaderboardRow key={e.personId} entry={e} />)}
      </ul>
    </aside>
  );
};
```

- [ ] **Step 4: Commit** — `git commit -am "feat: searchable leaderboard sidebar with favorites and mobile bottom sheet"`

---

# Phase 7 — The Globe

Produces: interactive night-lights globe with markers, animated arcs, GSAP fly-to camera, adaptive quality, selection popup — the complete main view.

### Task 25: Canvas, Earth, quality tiers

**Files:**
- Create: `src/components/globe/GlobeCanvas.tsx`, `src/components/globe/Earth.tsx`

- [ ] **Step 1: Write `src/components/globe/Earth.tsx`**

```tsx
'use client';
import { useRef } from 'react';
import { useLoader } from '@react-three/fiber';
import { BackSide, Mesh, TextureLoader } from 'three';
import { CONFIG } from '@/config';

export const Earth = ({ segments = 64 }: { segments?: number }) => {
  const mesh = useRef<Mesh>(null);
  const nightMap = useLoader(TextureLoader, '/textures/earth-night.jpg');
  const r = CONFIG.globe.radius;
  return (
    <group>
      <mesh ref={mesh}>
        <sphereGeometry args={[r, segments, segments]} />
        <meshStandardMaterial
          map={nightMap}
          emissiveMap={nightMap}
          emissive="#ffd9a0"
          emissiveIntensity={1.2}
          color="#0a1428"
          roughness={1}
        />
      </mesh>
      {/* atmosphere glow: slightly larger back-side sphere */}
      <mesh>
        <sphereGeometry args={[r * 1.04, segments, segments]} />
        <meshBasicMaterial color="#1e90ff" transparent opacity={0.08} side={BackSide} />
      </mesh>
    </group>
  );
};
```

- [ ] **Step 2: Write `src/components/globe/GlobeCanvas.tsx`** — quality tiers via `PerformanceMonitor` (decision 12):

```tsx
'use client';
import { Suspense, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, PerformanceMonitor } from '@react-three/drei';
import { Earth } from './Earth';
import { VehicleMarkers } from './VehicleMarkers';
import { RouteArcs } from './RouteArcs';
import { CameraRig } from './CameraRig';
import type { PositionsPayload } from '@/lib/api-types';

export const GlobeCanvas = ({ data }: { data: PositionsPayload }) => {
  const [dpr, setDpr] = useState(1.5);
  const [segments, setSegments] = useState(64);
  return (
    <Canvas
      dpr={dpr}
      camera={{ position: [0, 0, 2.6], fov: 45 }}
      className="touch-none"
      gl={{ antialias: true, powerPreference: 'high-performance' }}
    >
      <PerformanceMonitor
        onDecline={() => { setDpr(1); setSegments(32); }}
        onIncline={() => setDpr(Math.min(2, window.devicePixelRatio))}
      />
      <ambientLight intensity={0.4} />
      <Suspense fallback={null}>
        <Earth segments={segments} />
        <VehicleMarkers positions={data.positions} />
        <RouteArcs trips={data.activeTrips} positions={data.positions} />
      </Suspense>
      <CameraRig positions={data.positions} />
      <OrbitControls
        enablePan={false}
        enableDamping
        dampingFactor={0.08}
        minDistance={1.3}
        maxDistance={4}
        rotateSpeed={0.5}
        zoomSpeed={0.6}
      />
    </Canvas>
  );
};
```

- [ ] **Step 3: Commit** — `git commit -am "feat: globe canvas with night earth, atmosphere, adaptive quality"`

### Task 26: Markers, arcs, camera rig

**Files:**
- Create: `src/components/globe/VehicleMarkers.tsx`, `src/components/globe/RouteArcs.tsx`, `src/components/globe/CameraRig.tsx`

- [ ] **Step 1: Write `src/components/globe/VehicleMarkers.tsx`**

```tsx
'use client';
import { useMemo } from 'react';
import { latLngToVector3 } from '@/lib/geo';
import { useAppStore } from '@/lib/store';
import { CONFIG } from '@/config';
import type { PositionsPayload } from '@/lib/api-types';

const MARKER_COLORS = { jet: '#38bdf8', yacht: '#22ff88' } as const;

export const VehicleMarkers = ({ positions }: { positions: PositionsPayload['positions'] }) => {
  const select = useAppStore((s) => s.select);
  const selectedVehicleId = useAppStore((s) => s.selectedVehicleId);

  const markers = useMemo(
    () => positions.map((p) => ({
      ...p,
      vec: latLngToVector3(p.lat, p.lng, CONFIG.globe.markerAltitude),
    })),
    [positions],
  );

  return (
    <group>
      {markers.map((m) => {
        const isSelected = m.vehicleId === selectedVehicleId;
        const color = MARKER_COLORS[m.type as keyof typeof MARKER_COLORS] ?? '#ffffff';
        return (
          <mesh
            key={m.vehicleId}
            position={m.vec}
            onClick={(e) => { e.stopPropagation(); select(m.personId, m.vehicleId); }}
            onPointerOver={() => { document.body.style.cursor = 'pointer'; }}
            onPointerOut={() => { document.body.style.cursor = 'auto'; }}
          >
            <sphereGeometry args={[isSelected ? 0.016 : 0.01, 12, 12]} />
            <meshBasicMaterial color={isSelected ? '#ffffff' : color} />
            {m.isMoving && (
              <mesh>
                <ringGeometry args={[0.018, 0.024, 24]} />
                <meshBasicMaterial color={color} transparent opacity={0.5} />
              </mesh>
            )}
          </mesh>
        );
      })}
    </group>
  );
};
```

- [ ] **Step 2: Write `src/components/globe/RouteArcs.tsx`** — animated arc from trip start to current position:

```tsx
'use client';
import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Line, Line2 } from '@react-three/drei';
import { arcPoints, latLngToVector3 } from '@/lib/geo';
import type { PositionsPayload } from '@/lib/api-types';

type ArcProps = { startLat: number; startLng: number; endLat: number; endLng: number; color: string };

const AnimatedArc = ({ startLat, startLng, endLat, endLng, color }: ArcProps) => {
  const ref = useRef<Line2>(null);
  const points = useMemo(
    () => arcPoints(latLngToVector3(startLat, startLng), latLngToVector3(endLat, endLng)),
    [startLat, startLng, endLat, endLng],
  );
  useFrame((_, delta) => {
    const mat = ref.current?.material;
    if (mat) mat.dashOffset -= delta * 0.15; // marching dashes = direction of travel
  });
  return (
    <Line ref={ref} points={points} color={color} lineWidth={1.5}
      dashed dashScale={20} dashSize={0.5} gapSize={0.3} transparent opacity={0.9} />
  );
};

export const RouteArcs = ({ trips, positions }: {
  trips: PositionsPayload['activeTrips'];
  positions: PositionsPayload['positions'];
}) => {
  const byVehicle = useMemo(
    () => new Map(positions.map((p) => [p.vehicleId, p])),
    [positions],
  );
  return (
    <group>
      {trips.map((t) => {
        const current = byVehicle.get(t.vehicleId);
        if (!current) return null;
        return (
          <AnimatedArc key={t.id}
            startLat={t.startLat} startLng={t.startLng}
            endLat={current.lat} endLng={current.lng}
            color={current.type === 'jet' ? '#38bdf8' : '#22ff88'} />
        );
      })}
    </group>
  );
};
```

- [ ] **Step 3: Write `src/components/globe/CameraRig.tsx`** — GSAP fly-to on selection (decision: GSAP for camera transitions):

```tsx
'use client';
import { useEffect } from 'react';
import { useThree } from '@react-three/fiber';
import gsap from 'gsap';
import { latLngToVector3 } from '@/lib/geo';
import { useAppStore } from '@/lib/store';
import type { PositionsPayload } from '@/lib/api-types';

export const CameraRig = ({ positions }: { positions: PositionsPayload['positions'] }) => {
  const camera = useThree((s) => s.camera);
  const selectedVehicleId = useAppStore((s) => s.selectedVehicleId);
  const selectedPersonId = useAppStore((s) => s.selectedPersonId);

  useEffect(() => {
    const target =
      positions.find((p) => p.vehicleId === selectedVehicleId) ??
      positions.find((p) => p.personId === selectedPersonId);
    if (!target) return;
    const destination = latLngToVector3(target.lat, target.lng, 1).multiplyScalar(1.9);
    gsap.to(camera.position, {
      x: destination.x, y: destination.y, z: destination.z,
      duration: 1.4,
      ease: 'power3.inOut',
      onUpdate: () => camera.lookAt(0, 0, 0),
    });
  }, [selectedVehicleId, selectedPersonId, positions, camera]);

  return null;
};
```

(OrbitControls keeps target at origin, so animating only the camera position gives the Google-Maps-like fly-to; controls damping takes over after the tween.)

- [ ] **Step 4: Commit** — `git commit -am "feat: vehicle markers, animated route arcs, gsap camera fly-to"`

### Task 27: Main page assembly + info popup + live feed

**Files:**
- Modify: `src/app/page.tsx` (replace scaffold content)
- Create: `src/components/ui/InfoPopup.tsx`, `src/components/ui/LiveFeed.tsx`, `src/components/HomeClient.tsx`

- [ ] **Step 1: Write `src/components/ui/InfoPopup.tsx`**

```tsx
'use client';
import Link from 'next/link';
import type { LeaderboardEntry, PositionsPayload } from '@/lib/api-types';
import { Co2Ticker } from './Co2Ticker';
import { SourceBadge } from './SourceBadge';
import { useAppStore } from '@/lib/store';

export const InfoPopup = ({ entries, positions }: {
  entries: LeaderboardEntry[];
  positions: PositionsPayload['positions'];
}) => {
  const selectedPersonId = useAppStore((s) => s.selectedPersonId);
  const selectedVehicleId = useAppStore((s) => s.selectedVehicleId);
  const select = useAppStore((s) => s.select);
  const entry = entries.find((e) => e.personId === selectedPersonId);
  if (!entry) return null;
  const vehicle = positions.find((p) => p.vehicleId === selectedVehicleId)
    ?? positions.find((p) => p.personId === selectedPersonId);

  return (
    <div className="absolute right-4 top-4 z-20 w-80 max-w-[calc(100vw-2rem)] rounded-xl border border-panel-edge bg-panel/95 p-4 shadow-2xl backdrop-blur">
      <button onClick={() => select(null)} aria-label="Close"
        className="absolute right-3 top-2 text-dim hover:text-white">✕</button>
      <p className="text-[10px] uppercase tracking-[0.2em] text-dim">Rank #{entry.rank}</p>
      <h2 className="text-lg font-semibold">{entry.name}</h2>
      {vehicle && (
        <p className="mt-1 flex items-center gap-2 text-xs text-dim">
          {vehicle.vehicleName}
          <SourceBadge kind={vehicle.source === 'adsb' ? 'adsb' : 'sim'} />
          {vehicle.isMoving && <span className="text-accent">● en route</span>}
        </p>
      )}
      <dl className="mt-3 grid grid-cols-2 gap-2 text-sm">
        <div>
          <dt className="text-[10px] uppercase text-dim">CO2 / 12 months</dt>
          <dd><Co2Ticker baseKg={entry.co2Kg12m} ratePerSec={entry.co2RatePerSec}
            snapshotAt={entry.snapshotDate} className="text-neg" /></dd>
        </div>
        <div>
          <dt className="text-[10px] uppercase text-dim">Hypocrisy ×</dt>
          <dd className="font-[family-name:var(--font-mono-num)]">{entry.multiplier.toFixed(1)}</dd>
        </div>
      </dl>
      <Link href={`/person/${entry.slug}`}
        className="mt-3 block rounded border border-accent/40 py-1.5 text-center text-sm text-accent transition hover:bg-accent/10">
        Full hypocrisy report →
      </Link>
    </div>
  );
};
```

- [ ] **Step 2: Write `src/components/ui/LiveFeed.tsx`**

```tsx
'use client';
import type { RecentEvent } from '@/lib/api-types';
import { SourceBadge } from './SourceBadge';

export const LiveFeed = ({ events }: { events: RecentEvent[] }) => (
  <div className="absolute bottom-40 left-1/2 z-10 w-[min(40rem,90vw)] -translate-x-1/2 md:bottom-4 md:left-auto md:right-4 md:w-96 md:translate-x-0">
    <div className="max-h-40 overflow-y-auto rounded-lg border border-panel-edge bg-panel/80 p-2 backdrop-blur">
      <p className="px-1 text-[10px] uppercase tracking-[0.2em] text-dim">Latest activity</p>
      <ul className="mt-1 space-y-1">
        {events.map((e) => (
          <li key={e.id} className="flex items-baseline gap-2 px-1 text-xs">
            <span className={e.kind === 'positive' ? 'text-pos' : 'text-neg'}>
              {e.kind === 'positive' ? '▲' : '▼'}
            </span>
            <a href={e.sourceUrl} target="_blank" rel="noopener noreferrer"
              className="min-w-0 flex-1 truncate text-slate-300 hover:text-white">
              <span className="text-dim">{e.name}:</span> {e.title}
            </a>
            {e.autoClassified && <SourceBadge kind="auto" />}
          </li>
        ))}
      </ul>
    </div>
  </div>
);
```

- [ ] **Step 3: Write `src/components/HomeClient.tsx`** (client wrapper polling positions at the cache cadence) and `src/app/page.tsx`:

```tsx
// src/components/HomeClient.tsx
'use client';
import dynamic from 'next/dynamic';
import { useEffect, useState } from 'react';
import type { LeaderboardPayload, PositionsPayload } from '@/lib/api-types';
import { Sidebar } from '@/components/sidebar/Sidebar';
import { InfoPopup } from '@/components/ui/InfoPopup';
import { LiveFeed } from '@/components/ui/LiveFeed';
import { CONFIG } from '@/config';

const GlobeCanvas = dynamic(
  () => import('@/components/globe/GlobeCanvas').then((m) => m.GlobeCanvas),
  { ssr: false, loading: () => <div className="grid h-full place-items-center text-dim">Spinning up the globe…</div> },
);

export const HomeClient = ({ initial }: { initial: { board: LeaderboardPayload; positions: PositionsPayload } }) => {
  const [positions, setPositions] = useState(initial.positions);
  useEffect(() => {
    const id = setInterval(async () => {
      try {
        const res = await fetch('/api/positions');
        if (res.ok) setPositions(await res.json());
      } catch { /* keep last state */ }
    }, CONFIG.cache.positionsSMaxAge * 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <main className="relative h-dvh overflow-hidden">
      <div className="absolute inset-0 md:left-80">
        <GlobeCanvas data={positions} />
      </div>
      <Sidebar entries={initial.board.leaderboard} />
      <InfoPopup entries={initial.board.leaderboard} positions={positions.positions} />
      <LiveFeed events={initial.board.recentEvents} />
    </main>
  );
};
```

```tsx
// src/app/page.tsx
import { getCurrentPositions, getLeaderboard, getRecentEvents } from '@/lib/db/queries';
import { HomeClient } from '@/components/HomeClient';

export const revalidate = 300;

const HomePage = async () => {
  const [leaderboard, recentEvents, positions] = await Promise.all([
    getLeaderboard(), getRecentEvents(20), getCurrentPositions(),
  ]);
  return (
    <HomeClient initial={{
      board: { leaderboard, recentEvents, generatedAt: new Date().toISOString() },
      positions,
    }} />
  );
};

export default HomePage;
```

- [ ] **Step 4: Verify in browser** — `npm run dev`; globe renders, markers clickable (camera flies, popup opens), sidebar search filters, mobile viewport (devtools) shows bottom sheet. Fix console errors before committing.

- [ ] **Step 5: Commit** — `git commit -am "feat: main view — globe + sidebar + popup + live feed"`

---

# Phase 8 — Detail Dashboard & Content Pages

> Reminder: `ui-ux-pro-max:ui-ux-pro-max` design system governs styling here too.

Produces: the side-by-side good-vs-bad profile page, methodology, imprint, privacy.

### Task 28: Person detail page (the heart of the satire)

**Files:**
- Create: `src/app/person/[slug]/page.tsx`, `src/components/person/ActionColumns.tsx`, `src/components/person/ActionItem.tsx`, `src/components/person/ScoreBreakdown.tsx`

- [ ] **Step 1: Write `src/components/person/ActionItem.tsx`**

```tsx
import type { PersonDetail } from '@/lib/api-types';
import { SourceBadge } from '@/components/ui/SourceBadge';
import { formatCo2Kg } from '@/lib/format';

export const ActionItem = ({ event }: { event: PersonDetail['events'][number] }) => {
  const positive = event.kind === 'positive';
  return (
    <li className={`rounded-lg border p-3 ${positive ? 'border-pos/25 bg-pos/5' : 'border-neg/25 bg-neg/5'}`}>
      <div className="flex items-baseline justify-between gap-2">
        <time className="shrink-0 font-[family-name:var(--font-mono-num)] text-[11px] text-dim">
          {new Date(event.occurredAt).toISOString().slice(0, 10)}
        </time>
        <span className="flex gap-1">
          {event.autoClassified && <SourceBadge kind="auto" />}
          {event.co2Kg != null && <SourceBadge kind="estimated" />}
        </span>
      </div>
      <p className="mt-1 text-sm font-medium">{event.title}</p>
      {event.description && <p className="mt-0.5 text-xs text-dim">{event.description}</p>}
      <div className="mt-2 flex items-center justify-between text-xs">
        <a href={event.sourceUrl} target="_blank" rel="noopener noreferrer"
          className="text-accent underline-offset-2 hover:underline">source ↗</a>
        {event.co2Kg != null && (
          <span className="font-[family-name:var(--font-mono-num)] text-neg">
            +{formatCo2Kg(event.co2Kg)} CO2
          </span>
        )}
        {event.advocacyWeight != null && (
          <span className="font-[family-name:var(--font-mono-num)] text-pos"
            title="Advocacy weight feeding the hypocrisy multiplier">
            +{event.advocacyWeight} advocacy
          </span>
        )}
      </div>
    </li>
  );
};
```

- [ ] **Step 2: Write `src/components/person/ActionColumns.tsx`**

```tsx
import type { PersonDetail } from '@/lib/api-types';
import { ActionItem } from './ActionItem';

export const ActionColumns = ({ events }: { events: PersonDetail['events'] }) => {
  const positive = events.filter((e) => e.kind === 'positive');
  const negative = events.filter((e) => e.kind === 'negative');
  return (
    <div className="grid gap-6 md:grid-cols-2">
      <section aria-labelledby="positive-heading">
        <h2 id="positive-heading"
          className="mb-3 border-b border-pos/30 pb-2 text-sm font-semibold uppercase tracking-[0.2em] text-pos">
          What they say ({positive.length})
        </h2>
        <ul className="space-y-3">
          {positive.map((e) => <ActionItem key={e.id} event={e} />)}
          {positive.length === 0 && (
            <li className="text-sm text-dim">Radio silence. Not one documented green word. (At least they're consistent — multiplier stays at 1×.)</li>
          )}
        </ul>
      </section>
      <section aria-labelledby="negative-heading">
        <h2 id="negative-heading"
          className="mb-3 border-b border-neg/30 pb-2 text-sm font-semibold uppercase tracking-[0.2em] text-neg">
          What they do ({negative.length})
        </h2>
        <ul className="space-y-3">
          {negative.map((e) => <ActionItem key={e.id} event={e} />)}
          {negative.length === 0 && (
            <li className="text-sm text-dim">No documented emissions yet — either a saint or a very good transponder switch.</li>
          )}
        </ul>
      </section>
    </div>
  );
};
```

- [ ] **Step 3: Write `src/components/person/ScoreBreakdown.tsx`** — the transparent formula (decision 6):

```tsx
import type { PersonDetail } from '@/lib/api-types';
import { formatScore } from '@/lib/format';

export const ScoreBreakdown = ({ snapshot }: { snapshot: NonNullable<PersonDetail['snapshot']> }) => (
  <div className="rounded-xl border border-panel-edge bg-panel p-4">
    <p className="text-[10px] uppercase tracking-[0.2em] text-dim">Hypocrisy Score — full math, no magic</p>
    <p className="mt-2 font-[family-name:var(--font-mono-num)] text-lg">
      <span className="text-neg">{(snapshot.co2Kg12m / 1000).toFixed(1)} t CO2</span>
      <span className="text-dim"> × </span>
      <span className="text-pos">{snapshot.multiplier.toFixed(2)}</span>
      <span className="text-dim"> = </span>
      <span className="text-white">{formatScore(snapshot.score)}</span>
    </p>
    <p className="mt-1 text-xs text-dim">
      Emissions (rolling 12 months, vehicles only) × advocacy multiplier (1–10, decaying over 24 months).{' '}
      <a href="/methodology" className="text-accent hover:underline">Methodology</a> — this score is a
      satirical editorial assessment based on the sourced events below.
    </p>
  </div>
);
```

- [ ] **Step 4: Write `src/app/person/[slug]/page.tsx`**

```tsx
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getPersonDetail } from '@/lib/db/queries';
import { ActionColumns } from '@/components/person/ActionColumns';
import { ScoreBreakdown } from '@/components/person/ScoreBreakdown';
import { Co2Ticker } from '@/components/ui/Co2Ticker';
import { AdSlot } from '@/components/ui/AdSlot';

export const revalidate = 300;

const PersonPage = async ({ params }: { params: Promise<{ slug: string }> }) => {
  const { slug } = await params;
  const detail = await getPersonDetail(slug);
  if (!detail) notFound();
  const { person, snapshot, events, vehicles } = detail;

  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      <Link href="/" className="text-sm text-dim hover:text-accent">← back to the globe</Link>
      <header className="mt-4 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[10px] uppercase tracking-[0.2em] text-dim">
            {snapshot ? `Rank #${snapshot.rank}` : 'Unranked'} · {person.category}
          </p>
          <h1 className="text-3xl font-semibold">{person.name}</h1>
          <p className="mt-1 text-sm text-dim">
            {vehicles.map((v) => v.name).join(' · ') || 'No tracked vehicles'}
          </p>
        </div>
        {snapshot && (
          <p className="text-right">
            <span className="block text-[10px] uppercase tracking-[0.2em] text-dim">CO2 since snapshot, ticking</span>
            <Co2Ticker baseKg={snapshot.co2KgTotal} ratePerSec={snapshot.co2RatePerSec}
              snapshotAt={snapshot.snapshotDate} className="text-2xl text-neg" />
          </p>
        )}
      </header>
      {snapshot && <div className="mt-6"><ScoreBreakdown snapshot={snapshot} /></div>}
      <div className="mt-8"><ActionColumns events={events} /></div>
      <div className="mt-10"><AdSlot slot="person-footer" /></div>
    </main>
  );
};

export default PersonPage;
```

(`AdSlot` is created in Task 30 — create it first if executing out of order; it renders `null` without env config.)

- [ ] **Step 5: Verify** — `npm run dev`, open `/person/elon-musk`: breakdown shows `E × M = Score`, two colored columns render with source links and badges.

- [ ] **Step 6: Commit** — `git commit -am "feat: person detail dashboard with side-by-side action columns"`

### Task 29: Methodology, imprint, privacy pages

**Files:**
- Create: `src/app/methodology/page.tsx`, `src/app/imprint/page.tsx`, `src/app/privacy/page.tsx`

- [ ] **Step 1: Write `src/app/methodology/page.tsx`** — the legal backbone (decision 2). Content must cover, in English, in this order:
  1. *What this site is*: satirical editorial project; scores are opinions derived from sourced facts.
  2. *The formula*: `score = co2Tons12m × multiplier`, the multiplier definition with the exact weights table from `CONFIG.score.advocacyWeights`, half-life 730 days, cap 10.
  3. *Emission estimates*: jet kg-CO2/km table from `JET_MODEL_KG_PER_KM`, yacht default 90 kg/km, ×3.16 Jet-A factor, "estimates, not measurements".
  4. *Data provenance*: ADS-B (live, public transponder data), simulated voyages (clearly labeled, never used for real-world claims about a specific trip), AI-classified news events (badge, source link, confidence threshold 0.75).
  5. *Corrections*: contact address for disputes; commitment to remove/correct events whose source doesn't support them.

Implementation: static page, prose styled with the theme, tables rendered from the actual `CONFIG` and `JET_MODEL_KG_PER_KM` imports so page and code can never drift:

```tsx
import { CONFIG } from '@/config';
import { JET_MODEL_KG_PER_KM } from '@/lib/score/co2';

const MethodologyPage = () => (
  <main className="mx-auto max-w-3xl px-4 py-10 text-sm leading-6">
    <h1 className="text-2xl font-semibold">Methodology</h1>
    <p className="mt-3 text-dim">
      The Greenwash Index is a satirical, editorial data project. Every ranking is an opinion
      computed from publicly sourced facts via the open formula below. The code is open source.
    </p>
    <h2 className="mt-8 text-lg font-medium">The Hypocrisy Score</h2>
    <pre className="mt-2 rounded bg-panel p-3 font-[family-name:var(--font-mono-num)] text-xs">
{`score      = co2Tons12m × multiplier
multiplier = 1 + min(${CONFIG.score.multiplierCap - 1}, Σ weight × 0.5^(ageDays / ${CONFIG.score.halfLifeDays}))`}
    </pre>
    <table className="mt-4 w-full text-left text-xs">
      <thead><tr className="text-dim"><th className="py-1">Advocacy event</th><th>Weight</th></tr></thead>
      <tbody>
        {Object.entries(CONFIG.score.advocacyWeights).map(([type, weight]) => (
          <tr key={type} className="border-t border-panel-edge">
            <td className="py-1 capitalize">{type}</td>
            <td className="font-[family-name:var(--font-mono-num)]">{weight}</td>
          </tr>
        ))}
      </tbody>
    </table>
    <h2 className="mt-8 text-lg font-medium">Emission factors (kg CO2 per km)</h2>
    <table className="mt-2 w-full text-left text-xs">
      <tbody>
        {Object.entries(JET_MODEL_KG_PER_KM).map(([model, kg]) => (
          <tr key={model} className="border-t border-panel-edge">
            <td className="py-1">{model}</td>
            <td className="font-[family-name:var(--font-mono-num)]">{kg}</td>
          </tr>
        ))}
      </tbody>
    </table>
    <p className="mt-2 text-xs text-dim">
      Derived from published fuel-burn figures × 3.16 kg CO2 per kg Jet-A. Yachts default to 90 kg/km.
      All figures are estimates, not measurements.
    </p>
    <h2 className="mt-8 text-lg font-medium">Data provenance & labels</h2>
    <ul className="mt-2 list-disc space-y-1 pl-5 text-dim">
      <li><b className="text-pos">LIVE</b> — public ADS-B transponder data (adsb.lol).</li>
      <li><b>SIMULATED</b> — plausible fictional voyages for vehicles without public tracking. Never the basis for claims about a real trip.</li>
      <li><b className="text-accent">AI-CLASSIFIED</b> — events extracted from news articles by a language model
        (confidence ≥ {CONFIG.score.confidenceThreshold}); the linked source is authoritative, our classification is editorial.</li>
    </ul>
    <h2 className="mt-8 text-lg font-medium">Corrections</h2>
    <p className="mt-2 text-dim">
      Spotted an event whose source doesn't support it? Open an issue on GitHub or write to the
      address in the imprint — substantiated complaints lead to correction or removal.
    </p>
  </main>
);

export default MethodologyPage;
```

- [ ] **Step 2: Write `src/app/imprint/page.tsx` and `src/app/privacy/page.tsx`** — static pages with the theme styling. Imprint: operator name/address placeholder constants at the top of the file marked `// FILL BEFORE LAUNCH (legal requirement §5 TMG/DDG)` — the build must not ship to production until filled (add a `TODO:` lint note in README launch checklist, Task 32). Privacy policy sections: hosting (Vercel, server logs), localStorage favorites (functional, no consent required), consent management + Google AdSense (cookies, profiling, opt-out via CMP re-open link `<button onClick={() => window.googlefc?.showRevocationMessage?.()}>`), data subject rights (GDPR Art. 15–21), no accounts/no tracking beyond ads.

- [ ] **Step 3: Add footer links** — extend `src/app/layout.tsx` body with a fixed-bottom-right minimal footer: `<footer className="pointer-events-auto fixed bottom-1 right-2 z-30 text-[10px] text-dim"><a href="/methodology">methodology</a> · <a href="/imprint">imprint</a> · <a href="/privacy">privacy</a></footer>`.

- [ ] **Step 4: Commit** — `git commit -am "feat: methodology, imprint, privacy pages"`

---

# Phase 9 — Consent, Ads, Deploy

Produces: consent-gated AdSense integration, public GitHub repo with working schedules, production deployment on Vercel.

### Task 30: Google CMP + consent-gated ad slots

Per decision 10/11: Google's certified CMP ("Privacy & messaging", configured inside the AdSense account) ships bundled with the AdSense tag — we do NOT build a banner. Everything is inert until `NEXT_PUBLIC_ADSENSE_CLIENT` is set (AdSense approval requires the live site first — chicken-and-egg is handled by deploying without the env var, applying, then setting it).

**Files:**
- Create: `src/components/ui/ConsentLoader.tsx`, `src/components/ui/AdSlot.tsx`
- Modify: `src/app/layout.tsx`

- [ ] **Step 1: Write `src/components/ui/ConsentLoader.tsx`**

```tsx
'use client';
import Script from 'next/script';

/**
 * Loads the AdSense tag, which bootstraps Google's TCF-2.2-certified CMP
 * (configured under AdSense → Privacy & messaging → GDPR message).
 * Renders nothing until NEXT_PUBLIC_ADSENSE_CLIENT exists.
 */
export const ConsentLoader = () => {
  const client = process.env.NEXT_PUBLIC_ADSENSE_CLIENT;
  if (!client) return null;
  return (
    <Script
      id="adsense-cmp"
      strategy="afterInteractive"
      src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${client}`}
      crossOrigin="anonymous"
    />
  );
};
```

- [ ] **Step 2: Write `src/components/ui/AdSlot.tsx`**

```tsx
'use client';
import { useEffect, useRef } from 'react';

declare global {
  interface Window { adsbygoogle?: unknown[]; googlefc?: { showRevocationMessage?: () => void } }
}

export const AdSlot = ({ slot }: { slot: string }) => {
  const client = process.env.NEXT_PUBLIC_ADSENSE_CLIENT;
  const pushed = useRef(false);
  useEffect(() => {
    if (!client || pushed.current) return;
    pushed.current = true;
    (window.adsbygoogle = window.adsbygoogle ?? []).push({});
  }, [client]);
  if (!client) return null; // pre-approval builds: no ad markup at all
  return (
    <ins
      className="adsbygoogle block min-h-24 rounded border border-panel-edge/50"
      data-ad-client={client}
      data-ad-slot={slot}
      data-ad-format="auto"
      data-full-width-responsive="true"
    />
  );
};
```

(Google's CMP gates ad personalization/serving on the consent signal itself — TCF consent is enforced by the ad tag, so no extra gating code is needed; the CMP message appears automatically for EEA visitors once configured in AdSense.)

- [ ] **Step 3: Mount `<ConsentLoader />` in `src/app/layout.tsx`** inside `<body>` before `{children}`. Add a second `<AdSlot slot="sidebar-bottom" />` at the bottom of `Sidebar.tsx`'s scroll list.

- [ ] **Step 4: Verify** — without the env var: no script tag, no ad markup (view source). With a dummy `NEXT_PUBLIC_ADSENSE_CLIENT=ca-pub-0000000000000000`: script tag present, slot renders (errors from Google are expected with the dummy id).

- [ ] **Step 5: Commit** — `git commit -am "feat: consent-gated adsense integration via google certified cmp"`

### Task 31: README + launch checklist

**Files:**
- Create: `README.md`

- [ ] **Step 1: Write `README.md`** with: project description (satirical data project, English), architecture diagram (text), local setup (`npm i`, `.env.local` vars table from the plan header, `npm run db:push && npm run db:seed`, research + backfill scripts, `npm run dev`), the provenance-label glossary, and this launch checklist:

```markdown
## Launch checklist
- [ ] Imprint filled with real operator data (legal requirement)
- [ ] All `verified: false` jets confirmed or left simulated
- [ ] Backfill run; spot-check 20 random events against their sources
- [ ] Daily cron ran twice without errors (Vercel logs)
- [ ] GitHub Actions live tick green for 24h
- [ ] AdSense: apply only after content is stable; then set NEXT_PUBLIC_ADSENSE_CLIENT
      and configure the GDPR message under Privacy & messaging
- [ ] Lighthouse: mobile performance ≥ 80, no console errors on mid-range phone
```

- [ ] **Step 2: Commit** — `git add README.md; git commit -m "docs: readme with setup and launch checklist"`

### Task 32: GitHub + Vercel deployment

**Files:** none (operational task)

- [ ] **Step 1: Push branches** — the public repo already exists (created at project start). Push `develop`, then merge develop→main for the release and push both:

```powershell
git push -u origin develop
git checkout main
git merge --no-ff develop -m "release: v0.1.0"
git push origin main
git checkout develop
```

- [ ] **Step 2: Set GitHub Actions secrets**

```powershell
gh secret set INGEST_SECRET --body "<same value as .env.local>"
gh secret set APP_URL --body "https://<project>.vercel.app"   # update after Step 3 if needed
```

- [ ] **Step 3: Create the Vercel project** — `npx vercel link` (new project), then set env vars for Production+Preview: `DATABASE_URL`, `INGEST_SECRET`, `CRON_SECRET` (= INGEST_SECRET), `AI_GATEWAY_API_KEY`, `NEXT_PUBLIC_BASE_URL`. Deploy: `npx vercel deploy --prod`.

- [ ] **Step 4: Smoke test production**

```powershell
curl https://<project>.vercel.app/api/leaderboard          # 200, ranked persons
curl -X POST https://<project>.vercel.app/api/ingest/live -H "Authorization: Bearer <secret>"  # 200
curl -X POST https://<project>.vercel.app/api/ingest/live  # 401
```

Open the production URL: globe renders, click marker → camera flies → popup; `/person/elon-musk` shows columns; trigger the GitHub workflow manually (`gh workflow run live-ingest`) and confirm a new `positions` row.

- [ ] **Step 5: Confirm the daily cron is registered** — Vercel dashboard → project → Settings → Cron Jobs shows `/api/ingest/daily @ 0 4 * * *`.

- [ ] **Step 6: Final commit & tag**

```powershell
git tag v0.1.0
git push --tags
```

---

## Self-Review (performed while writing)

1. **Spec coverage:** 3D globe (T25–27), Google-Maps-feel controls (OrbitControls damping + GSAP fly-to, T25/26), vehicle pins (T26), animated route curves (T26), searchable sidebar with name/CO2/ranking (T24), click-to-fly + infobox (T26/27), detail page with side-by-side green/red chronological lists (T28), hypocrisy formula with snitch multiplier (T6), daily pipeline (T14–16), 24h-distance CO2 (T12/T14), ticking counter (T23), live top-20 updates (T16), Tailwind/GSAP/dark design (T22+, ui-ux-pro-max), APIs found (adsb.lol, GDELT, Google News RSS — T11/T17), caching (T20), cookie consent (T30), favorites in localStorage (T22/T24), reusable code (pure cores in `lib/`, config-driven). 50 persons + self-maintaining (T9/T10/T18/T19). German user requirements all mapped.
2. **Placeholder scan:** the imprint operator data is intentionally a launch-blocking TODO (personal legal data the executor cannot invent) — tracked in the README launch checklist; everything else ships concrete code or exact content lists.
3. **Type consistency:** `Co2Ticker` props (`baseKg`, `ratePerSec`, `snapshotAt`) match all three call sites; `select(personId, vehicleId?)` matches all callers; `PositionsPayload` shape produced by `getCurrentPositions` matches `GlobeCanvas`/`RouteArcs`/`InfoPopup` consumption; `runNewsScan` stub (T15) is replaced with the same exported name + compatible return type (T18); `AdSlot` used in T28 is defined in T30 with a no-env null fallback (noted inline).

**Known risks for the executor:**
- `drei`'s `Line` ref type (`Line2`) and `PerformanceMonitor` API move between versions — adjust imports to the installed version if TS complains.
- adsb.lol response field names (`alt_baro`, `gs`, `track`) are v2 API; verify one real response before trusting the parser fixture.
- Drizzle `$with`/CTE syntax varies by version; `getLeaderboard` may need `sql` casts on the join columns.
- GDELT artlist JSON occasionally returns HTML on rate-limit; the try/catch fallback covers it, but expect noisy logs on the backfill.
