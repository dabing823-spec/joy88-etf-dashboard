# Design System — JOY88 ETF Dashboard

## Product Context
- **What this is:** Personal investment command center for tracking Taiwan active ETF holdings, risk control, trading strategies, and AI-powered daily recommendations
- **Who it's for:** Solo investor following the Giant Jay investment framework
- **Space/industry:** Finance / Trading dashboard (personal use)
- **Project type:** Data-dense dark-theme web app (12 pages)

## Aesthetic Direction
- **Direction:** Industrial/Utilitarian — "戰情室" (War Room)
- **Decoration level:** Intentional — ambient awareness via breathing glow bars, not decorative
- **Mood:** Sitting in a custom-built command center. Calm, precise, authoritative. Every pixel serves a decision. Not a SaaS product trying to be friendly — a tool that respects the operator.
- **Reference sites:** Koyfin (clean data layout), TradingView (chart-first restraint), SpaceX mission control (ambient status indicators)

## Typography
- **Display/Hero:** Satoshi (700/900) — geometric sans with personality, stands out from the Inter/Roboto crowd
- **Body:** Noto Sans TC (400/500/700) — best free Traditional Chinese font, pairs well with Satoshi's x-height
- **UI/Labels:** Satoshi (500/700) for English labels, Noto Sans TC for Chinese
- **Data/Tables:** JetBrains Mono (400/500/700) — tabular-nums, monospace, numbers align perfectly
- **Code:** JetBrains Mono
- **Loading:** Google Fonts + Fontshare CDN
  ```html
  <link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;700&family=Noto+Sans+TC:wght@300;400;500;700;900&display=swap" rel="stylesheet">
  <link href="https://api.fontshare.com/v2/css?f[]=satoshi@400,500,700,900&display=swap" rel="stylesheet">
  ```
- **Scale:**
  - 3xl: 48px (hero titles)
  - 2xl: 28px (page headings, large numbers)
  - xl: 22px (section headings, signal text)
  - lg: 18px (card headings)
  - base: 14px (body text)
  - sm: 12px (labels, meta text)
  - xs: 11px (section labels, uppercase tracking)
  - 2xs: 10px (tertiary info, timestamps)

## Color
- **Approach:** Restrained with one distinctive accent — amber says "wealth" and "alertness"

### Base palette (dark mode only)
| Token | Hex | Usage |
|-------|-----|-------|
| `--bg-base` | `#0b0d14` | Page background (deep navy-black) |
| `--bg-surface` | `#12141f` | Cards, panels |
| `--bg-elevated` | `#1a1d2b` | Hover states, modals |
| `--bg-interactive` | `#222639` | Clickable areas, buttons |
| `--border-subtle` | `#1e2235` | Card borders (barely visible structure) |
| `--border-default` | `#2d3148` | Dividers, input borders |

### Text
| Token | Hex | Usage |
|-------|-----|-------|
| `--text-primary` | `#e8eaef` | Main content |
| `--text-secondary` | `#7d829a` | Labels, timestamps, meta |
| `--text-tertiary` | `#4a4f68` | Placeholders, disabled |

### Accent
| Token | Hex | Usage |
|-------|-----|-------|
| `--accent` | `#e09f3e` | Primary accent, CTA, active tab |
| `--accent-muted` | `#b8832f` | Hover state |
| `--accent-subtle` | `rgba(224, 159, 62, 0.08)` | Background tint |

### Semantic (Taiwan convention: red = up, green = down)
| Token | Hex | Usage |
|-------|-----|-------|
| `--positive` | `#e54545` | Price up (漲) |
| `--positive-muted` | `rgba(229, 69, 69, 0.12)` | Up background tint |
| `--negative` | `#22c55e` | Price down (跌) |
| `--negative-muted` | `rgba(34, 197, 94, 0.12)` | Down background tint |
| `--warning` | `#f59e0b` | Risk alerts, attention needed |
| `--danger` | `#ef4444` | System errors, critical risk |
| `--info` | `#6b9fff` | Neutral informational |

## Spacing
- **Base unit:** 4px
- **Density:** Comfortable (not cramped, not wasteful)
- **Scale:** 2xs(2px) xs(4px) sm(8px) md(16px) lg(24px) xl(32px) 2xl(48px) 3xl(64px)
- **Card padding:** 16px (compact cards) / 20px (full cards)
- **Section gap:** 16px (within page sections)
- **Page padding:** 24px

## Layout
- **Approach:** Grid-disciplined
- **Grid:** 2-col (mobile) → 4-col (desktop)
- **Max content width:** None (full viewport minus sidebar)
- **Border radius:** sm:6px (badges, inputs) / md:8px (buttons) / lg:10px (cards) / full:9999px (dots, pills)
- **Card pattern:** `bg-surface border border-subtle rounded-lg`

## Motion
- **Approach:** Minimal-functional + ambient risk awareness
- **Easing:** enter(ease-out) exit(ease-in) move(ease-in-out)
- **Duration:** micro(50-100ms) short(150ms) medium(250ms)
- **Special — Breathing glow bars:**
  - Normal: static accent border-left (3px solid)
  - Warning: amber pulse at 3s interval
  - Alert: red pulse at 1.2s interval
  - Purpose: ambient awareness — user knows which card needs attention without reading text

```css
@keyframes pulse-glow {
  0%, 100% { box-shadow: 0 0 8px -2px currentColor; }
  50% { box-shadow: 0 0 20px 0px currentColor; }
}
```

## Anti-patterns (never use)
- Generic blue accent (#4f8ef7 or similar)
- Purple/violet gradients
- 3-column icon-in-circle feature grids
- Uniform border-radius on everything
- Decorative blobs, waves, or SVG dividers
- Emoji in headings or navigation
- System font stack as primary (always load Satoshi + Noto Sans TC + JetBrains Mono)

## Decisions Log
| Date | Decision | Rationale |
|------|----------|-----------|
| 2026-03-26 | Initial design system created | Created by /design-consultation. Competitive research (Koyfin, TradingView, Bloomberg alternatives) + Claude subagent "戰情室" concept. Amber accent chosen to differentiate from generic fintech blue. |
| 2026-03-26 | Breathing glow bars for risk status | Subagent proposal — ambient awareness without reading text, like a war room alert light. Three speeds: static (normal), 3s (warning), 1.2s (alert). |
| 2026-03-26 | Satoshi over Inter for display font | Inter is overused in every SaaS product. Satoshi has similar geometric quality but more distinctive character. |
