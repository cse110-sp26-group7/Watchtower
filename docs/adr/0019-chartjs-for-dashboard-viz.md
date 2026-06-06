# ADR-0019: Chart.js for Dashboard Visualization

## Status
Accepted

## Date
2026-05-29

## Context

The dashboard needs charts: an error-frequency bar chart, performance trend lines for LCP / INP / CLS, a feedback rating distribution, and a deploy-marker overlay on the error timeline. We need the charts to be:

- **Renderable without a framework** — ADR-0003 forbids React/Vue/Svelte.
- **Loadable from a CDN with no build step** — the dashboard ships as static files to Cloudflare Pages.
- **Vanilla-JS friendly** — the API has to feel natural alongside `document.querySelector` and `fetch`, not require a wrapper.
- **Free and license-clean** — MIT or similar, no commercial gating.
- **Maintained** — actively developed in 2026, not a single-maintainer abandoned project.

Options:

1. **Chart.js** — Canvas-based, MIT, framework-agnostic, large ecosystem, CDN-distributable.
2. **D3.js** — SVG-first, maximum flexibility, much steeper API. You build a chart by composing scales, axes, and shape generators yourself.
3. **Hand-rolled SVG/Canvas** — write our own line/bar primitives.
4. **A React-coupled library** (Recharts, Victory, nivo) — fast to use, but requires React. Disqualified by ADR-0003.
5. **A heavy commercial/enterprise library** (Highcharts, AG Charts) — paid for our use case or restrictively licensed.

## Decision

**Chart.js, loaded from a public CDN as a `<script>` tag in the dashboard HTML.** No bundling, no `npm install` on the dashboard side.

Use:

- Bar charts for error frequency by message and by hour.
- Line charts for LCP / INP / CLS trends.
- A doughnut/bar for feedback rating distribution.
- Annotation plugin (loaded from the same CDN) for overlaying deploy markers on the error timeline.

Defaults are deliberately understated: the dashboard's colors and tooltip styling are set once in `dashboard/charts-config.js` so individual chart files don't drift.

## Consequences

### Positive
- **One `<script>` tag, no build step.** Matches the dashboard's bundler-free posture (ADR-0003).
- **Plain JS API.** `new Chart(canvasEl, { type: 'bar', data, options })` — no wrapper, no JSX equivalent.
- **Canvas rendering** scales fine to the few hundred points per chart we expect; the dashboard doesn't need SVG-level interactive primitives.
- **Active maintenance**, well-documented, large Stack Overflow footprint — debugging is fast.
- **MIT license**, no per-seat or commercial restriction.
- **Replaceable.** A future migration to D3 or hand-rolled SVG is bounded to one file per chart; Chart.js does not own application state.

### Negative
- **Canvas charts are not directly SEO-indexable or screen-reader accessible.** The dashboard is auth-gated and internal, so this is not a current concern, but it would matter if we ever exposed a public status page.
- **Library size (~80–100 KB minified, ~30 KB gzipped on CDN cache)** is the biggest single dependency the dashboard ships. Acceptable for an internal tool.
- **CDN dependency.** If the CDN hiccups, charts fail to load while the rest of the dashboard works. Document a vendored fallback path in `docs/devops/` if we ever see a real outage.
- **Plugin ecosystem versioning** — the annotation plugin must match the Chart.js major version. Pinned in the `<script>` tags.

### Out of Scope
- D3 for advanced visualizations. If a future view needs custom shapes that Chart.js can't compose, that one view can use D3 without forcing it on the whole dashboard.
- Server-side chart rendering (PNG snapshots for alerts/digests). Out of scope until we have an alerting story.
- Vendoring Chart.js into the repo. Revisit only if the CDN reliability becomes a real problem.

## More Information

- Related: ADR-0003 (vanilla JS, no framework — Chart.js is a viz library, not a framework).
- Architecture: `docs/ARCHITECTURE.md` §3.5 — "Dashboard — Cloudflare Pages".
