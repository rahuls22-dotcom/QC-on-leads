# Spot loaders · when to use which

The Spot loader system has 4 roles (orbit / breathe / tilt / dots) and 1 full-screen variant. Pick by wait length and surface.

## Quick decision matrix

| Surface | Wait length | Use |
|---------|-------------|-----|
| Chat bubble · "Spot is typing" | < 2s, recurring | **Inline dots** (`mode="dots"`) |
| Inline button after click | 0.5–3s | **Tilt** (`mode="tilt"`) at 20–24px |
| Toolbar / header indicator | Background, always-on | **Breathe** (`mode="breathe"`) at 14–18px |
| Modal / drawer / card load | 2–8s | **Orbit** (`mode="orbit"`) at 48px |
| Page-level skeleton replacement | 3–10s | **Orbit** at 48–64px with a label |
| Full app boot / first paint | 4–12s | **`<SpotFullscreen />`** with cycling status |
| Multi-step agent work (e.g. campaign launch) | 10s+ | **`<SpotFullscreen />`** with custom status messages |

## Role definitions

- **Inline dots** — three rounded-square pearls in a chat bubble. The *only* loader that should appear inside the chat thread. Stop using it the moment Spot's first character of text streams in.
- **Tilt** — gentle wobble on the Spot mark itself, no halo. Smallest footprint. Use inside small buttons, action chips, or row-level affordances. Don't pair with text — it's a "Spot is here" signal, not a "loading" signal.
- **Breathe** — Spot mark with a soft pulsing aura. Reads as ambient ("agents working in the background"). Use as a persistent header indicator while agents run. Don't use in blocking UI — it looks too calm for things the user is waiting on.
- **Orbit** — Spot mark with two counter-rotating dashed frames. Most active-feeling — clearly says "active work in progress". Use whenever the user is actively waiting and won't be interacting with the surface.
- **Full-screen** — orbit + cycling status text. Reserve for boot, first-paint, and multi-step agent work where you need to telegraph *what* Spot is doing. Always pair with a status message that updates every 1.5–2s.

## Sizing

- `28px` → inline / toolbar / row-level
- `48px` → modals / cards / drawers
- `64–80px` → full-screen / hero loading state

Sizing is set via the `size` prop on the React component (or `--size` CSS variable on the wrapper). The rings/aura scale proportionally.

## Composition rules

- **Never stack two loaders in the same eye-path.** Pick the most active one for the layer that's blocking.
- **Always replace** the loader with the real content (don't fade out — swap on data arrival).
- For waits > 3s, add a `label` prop: shown below the loader as a static heading.
- For waits > 8s, use `<SpotFullscreen />` with cycling `messages` — a single static label feels broken.

## Shape · square vs round

- Use **square variants** (default in this app) if your Spot mark renders as a rounded-square — matches the `.spot-mark` class with `border-radius: 22%`.
- Use **round variants** only if you're rendering a circular Spot avatar (rare in this app).
- Don't mix shapes on the same screen.

## React API

```tsx
import { SpotLoader, SpotFullscreen } from "@/components/spot/spot-loader";

// Small loaders
<SpotLoader mode="orbit" size={48} />
<SpotLoader mode="breathe" size={18} />
<SpotLoader mode="tilt" size={22} />
<SpotLoader mode="dots" />

// With label (for waits 3-8s)
<SpotLoader mode="orbit" size={48} label="Drafting media plan" sublabel="Pulling 3 comparable launches…" />

// Full-screen with cycling status
<SpotFullscreen
  title="Spot is thinking…"
  messages={[
    "Reading the brief…",
    "Drafting personas…",
    "Pulling competitor data…",
    "Composing the media plan…",
  ]}
/>
```

Shape defaults to `"square"` to match the SpotMark glyph. Pass `shape="round"` only for circular contexts.

## Status messages for the full-screen loader

Cycle these every 1.8s during long Spot work. Default set:

- "Reading the brief…"
- "Drafting personas…"
- "Pulling competitor data…"
- "Composing the media plan…"
- "Generating creatives…"
- "Running pre-flight checks…"
- "Thinking…"

Swap the list per context. Audience-build flow:

- "Sampling your existing leads…"
- "Computing lookalike vectors…"
- "Filtering for intent signals…"
- "Cross-checking with Revspot graph…"
- "Sizing the audience…"

Deep-research → memory flow:

- "Crawling the brand site…"
- "Pulling category signals…"
- "Checking the audience graph…"
- "Reading competitor positioning…"
- "Building memory…"
- "Writing what I avoid…"

## Source files

Original HTML reference loaders live in `loaders/` (handoff pack from design). The React port lives in `src/components/spot/spot-loader.tsx`. CSS animations live in `src/app/globals.css` under the `Spot loaders` section.
