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
    /**
     * Rhetoric floor — documented-but-unquantified "what they do" acts (flight/yacht/asset
     * news without a CO2 figure) add a SMALL score, AMPLIFIED by the advocacy multiplier
     * (green talk × dirty deeds). Positive advocacy alone never scores: no documented act
     * ⇒ floor 0, so a consistent climate advocate stays at zero. Kept tiny + capped so real
     * CO2 (tonnes × multiplier, often thousands) stays the dominant signal.
     */
    stanceScale: 1.5, // points per (decayed act-unit × multiplier)
    negStanceUnit: 1.5, // weight of one documented unquantified high-emission act ("what they do")
    stanceCap: 1500, // hard ceiling so rhetoric never rivals serious tracked emissions
    /** News-event de-duplication so one real act isn't counted many times. */
    dedup: {
      /** Same person + type within this many days = the SAME act: extra
       *  articles are merged as additional sources, never re-counted. */
      sameEventWindowDays: 4,
      /** A later re-statement of the same act (within this window, beyond the
       *  same-event window) still counts, but down-weighted by echoWeightFactor. */
      echoWindowDays: 21,
      /** Weight multiplier applied to such echo/repeat events. */
      echoWeightFactor: 0.35,
    },
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
