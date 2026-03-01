# Startup Banner — Implementation Plan

**Branch:** `feat/startup-banner`
**Status:** Brainstorm only — no code written yet
**Goal:** Replace the current slim banner with a stunning ASCII art banner using Ink + block fonts, while ensuring it works reliably on every user machine.

---

## Current State

The slim banner in `cli/src/index.ts` (shown on every non-help/version run):
```
  jaggers-config v1.2.0
  Sync agent tools across AI environments
```

The prototype lives at: `banner_ink.js` (repo root, untracked — do not delete)

---

## Prototype: `banner_ink.js`

Uses:
- `ink` — React-based terminal UI renderer
- `ink-gradient` — gradient colouring for ASCII art
- `ink-spinner` — animated spinner
- `react` — peer dep of ink

Renders a full framed box with:
- "Welcome to" header
- Two ASCII art blocks (`XTRM` + `TOOLS`) in block font (pre-baked box-drawing chars)
- Animated spinner + fake loading progress bar (0→100%, ~1.5s)
- Version line at bottom

---

## Pain Points to Solve Before Shipping

### P0 — Critical (will break on some machines)

**1. Ink is ESM-only**
The CLI compiles to a self-contained CJS bundle (`tsup`, `noExternal: [/.*/]`).
Ink + React need to be imported via dynamic `import()` or via a separate ESM entry point.
Same pattern already used for `boxen` — needs testing with `ink` specifically.
**Test:** `npm run build` after adding ink — does tsup/esbuild handle it cleanly?

**2. Block font chars (█ ╗ ╚ ═) depend on the terminal font**
Not all terminals render box-drawing Unicode correctly:
- Windows CMD / PowerShell without a Nerd Font → garbage chars
- Some SSH sessions → question marks
- Older Linux terminals → partial rendering
**Fix needed:** detect rendering capability or ship a plain-text ASCII fallback.

**3. Fixed `width={80}` overflows narrow terminals**
The Ink `<Box>` hard-codes 80 columns. On narrow terminals (< 80) it wraps badly.
**Fix:** read `process.stdout.columns` at render time and either scale or skip banner.

### P1 — UX (friction)

**4. Fake loading bar adds ~1.5s of pure delay on every run**
The progress timer is artificial — it doesn't reflect real work.
Options:
  a) Tie it to actual startup work (diff scan, env detection)
  b) Make it a one-shot splash that auto-exits after ~800ms, no fake %
  c) Remove it entirely, keep only the logo

**5. `ink-gradient` is another ESM dep**
May bundle fine with tsup but needs an explicit test pass.

---

## Design Decisions to Make Before Building

| Question | Options |
|----------|---------|
| When does banner show? | Every command / first run only / `status` + `sync` only |
| Replace or augment current slim banner? | Replace entirely / show above it |
| Keep ASCII art or simpler logo? | Full block font / single-line stylized text / just kleur bold |
| Keep loading bar? | Remove / make real / make instant |
| Width strategy? | Fixed 80 / `process.stdout.columns` / no box at all |

---

## Non-Negotiable Guards (must implement)

```typescript
// 1. Suppress in CI / non-interactive terminals
if (!process.stdout.isTTY) return;

// 2. Suppress for --help / --version (already done for slim banner)
const isHelpOrVersion = process.argv.some(a => ['--help','-h','--version','-V'].includes(a));
if (isHelpOrVersion) return;

// 3. Respect narrow terminals
const cols = process.stdout.columns ?? 80;
if (cols < 60) { /* fallback to slim banner */ return; }
```

---

## Suggested Implementation Order

1. **Test bundling first** — add `ink` + `ink-gradient` + `react` to `cli/package.json` and run `npm run build`. If tsup chokes, figure out the import strategy before writing any component code.
2. **Build the component** — port `banner_ink.js` into `cli/src/utils/banner.tsx`, add the three guards above.
3. **Wire into `index.ts`** — replace the current slim banner block with `await renderBanner()`.
4. **Test on narrow terminal** — resize to < 60 cols and verify fallback.
5. **Test on Windows** — check box-drawing chars; if broken, implement ASCII fallback.
6. **Remove fake loading bar** — decide on replacement (real work, instant splash, or none).

---

## Files Involved

| File | Role |
|------|------|
| `banner_ink.js` | Prototype (repo root, untracked) |
| `cli/src/utils/banner.tsx` | Where the production component will live |
| `cli/src/index.ts` | Wires banner in (lines 20-22 currently show slim banner) |
| `cli/package.json` | Will need: `ink`, `ink-gradient`, `react`, `@types/react` |
| `cli/tsup.config.ts` | May need adjustment if Ink won't bundle as-is |
