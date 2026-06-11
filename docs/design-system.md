# Greenwash Index — Design System (Source of Truth, Phases 6–8)

Synthesized from the binding plan brief + `ui-ux-pro-max` recommendations
(Data-Dense Dashboard pattern, Cyberpunk UI / OLED Dark Mode styles).
Where component class names in the plan conflict with this file, this file wins;
component structure, props and behavior in the plan stay binding.

## Mode

Dark only (`color-scheme: dark`). No light variant.

## Color Tokens (CSS variables, semantic — never raw hex in components)

Implemented in `src/app/globals.css` as Tailwind v4 `@theme` tokens:

| Token | Value | Role |
|---|---|---|
| `--color-abyss` | `#05080f` | near-black, blue-tinted page background |
| `--color-panel` | `#0a1020` | cards, sidebar, sheets |
| `--color-panel-edge` | `#1a2a45` | hairline borders, dividers |
| `--color-grid` | `#0f1830` | gridlines, subtle fills |
| `--color-pos` | `#22ff88` | neon green — advocacy, "talk" |
| `--color-neg` | `#ff3b5c` | neon red — emissions, "exhaust" |
| `--color-accent` | `#38bdf8` | cyan — links, focus, interactive highlights |
| `--color-dim` | `#7d8db1` | secondary text |

Body text color: `#e2e8f0`. Amber for simulated/unverified badges: use Tailwind `amber-400`.

Rules: status colors always paired with icon or label (never color-only).
Positive/negative never used for text below 14px without a contrast check.

## Typography

- **Body/UI:** Fira Sans (400/500/600) via `next/font`, var `--font-fira-sans`, fallback `system-ui, sans-serif`
- **Numbers, code, tickers, coordinates, all data:** Fira Code via `next/font`, var `--font-fira-code` —
  apply with the `.font-num` utility (`font-feature-settings: "tnum"`, tabular figures mandatory,
  no layout shift on ticking numbers)
- Base 16px, line-height 1.5; scale 12 / 14 / 16 / 18 / 24 / 32 / 48
- Headings: Fira Code 600 uppercase tracking-wide (mission-control HUD feel)

## Effects

- **Glow:** `text-shadow: 0 0 10px <accent>` / `box-shadow: 0 0 12px -2px <accent>` —
  interactive and live elements only, sparingly (OLED guidance: minimal glow)
- **Scanlines/glitch:** none (anti-pattern for data density and reduced-motion)
- Transitions 150–300ms, `ease-out` enter / `ease-in` exit, transform/opacity only
- `prefers-reduced-motion`: disable glow pulses, ticker animation falls back to static updates

## Interaction

- Focus: visible 2px ring `--accent` on all interactive elements (never removed)
- `cursor-pointer` on clickables; hover = surface-raised + subtle glow
- Touch targets ≥ 44×44px; sidebar rows min-h 44px
- SVG icons only (Lucide), one stroke width (1.5), no emoji icons

## Layout

- Data-dense grid, minimal padding (4/8px rhythm), KPI cards
- Mobile-first; breakpoints 375 / 768 / 1024 / 1440
- Globe = hero canvas; sidebar (desktop ≥1024) / bottom sheet (mobile)
- z-scale: 0 (globe) / 10 (HUD overlays) / 20 (sidebar) / 40 (popups) / 100 (modals/consent)

## Anti-Patterns (avoid)

Ornate decoration, light surfaces, color-only status, glitch/scanline effects,
non-tabular ticking numbers, missing filtering on the leaderboard.
