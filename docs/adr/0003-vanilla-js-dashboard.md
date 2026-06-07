# ADR-0003: Vanilla JS, HTML, and CSS for the Dashboard (No Framework)

## Status
Accepted

## Date
2026-05-06

## Context

The WatchTower dashboard is a small SPA: a login page, an overview/summary view, an error log, a performance view, a feedback view, and a deploys timeline. It needs hash routing, fetches against `/api/*`, and a few Chart.js graphs (ADR-0019). It does not need server-side rendering, an i18n layer, route-level code splitting, or a state-management framework.

The course constraint is hard:

> You may use markdown, standards-based HTML, CSS without a framework, vanilla JavaScript without a framework, …

That alone settles the rule. We still need an ADR because "vanilla JS dashboard" is a load-bearing architectural choice that future maintainers will be tempted to undo — *"why don't we just port this to React, it'd be 200 lines"* — and the right answer is "because we deliberately chose not to, and here is the reasoning that survives the constraint going away."

Options considered, in case the constraint is ever lifted:

1. **Vanilla HTML/CSS/JS, hash routing, ES modules** — what the rule requires; what we shipped.
2. **A SPA framework** (React, Vue, Svelte) with a build step (Vite, esbuild).
3. **A meta-framework** (Next.js, Astro, SvelteKit) with SSR/SSG.

## Decision

**The dashboard is plain HTML files, plain CSS files, and ES module JavaScript loaded directly by the browser. No framework, no build step, no bundler.**

Specifically:

- Routing is hash-based (`#/overview`, `#/errors`, `#/perf`, `#/feedback`, `#/deploys`). No router library.
- DOM updates are direct (`document.querySelector(...).textContent = ...`, `element.innerHTML = ...` only on data we sanitize). No virtual DOM, no template engine.
- State is plain module-scoped variables and `localStorage` for what survives reloads. No store library.
- Charts use Chart.js loaded from a CDN (ADR-0019). Chart.js is a data-viz library, not a framework — it does not own the application shell.
- The SDK in `client/watchtower.js` is the same rule: a single dependency-free file (ADR-0016).
- Deployment is "upload the static files to Cloudflare Pages." No `npm run build` step on the dashboard side.

## Consequences

### Positive
- **Satisfies the course constraint exactly.** No grading risk on the technical constraints checklist.
- **Zero build step on the dashboard means zero build-step bugs.** What you write is what ships. New contributors don't have to learn a bundler before touching a CSS file.
- **No dependency tree to audit, update, or break.** A React + Vite scaffold pulls in 200+ transitive packages; ours pulls in zero.
- **First load is small and fast.** No framework runtime to ship. The whole dashboard loads in a handful of files.
- **Standards skills transfer.** Anyone who learns this codebase learns the platform (DOM, fetch, ES modules), not a framework version that will be obsolete in two years.
- **Easier code review.** A reviewer reading `dashboard/errors.js` reads JavaScript, not React + JSX + a state-management idiom on top of it.

### Negative
- **No declarative component model.** Building reusable pieces (e.g., a sortable table) means writing more DOM glue ourselves. We accept the verbosity in exchange for not adopting a framework.
- **No reactivity.** Updating the UI when data changes is manual: fetch, mutate, re-render the affected node. For a dashboard with a handful of views this is fine; it would scale poorly to a hundred screens.
- **XSS surface needs deliberate care.** With no framework auto-escaping, every place that injects untrusted data (error messages, stack traces from monitored apps) has to use `textContent` or explicit escaping — not `innerHTML`. Documented as a review rule.
- **Hash routing means URLs have `#` in them.** Functional, slightly less clean than `history.pushState`-based routing. Acceptable for an internal dashboard.
- **If the constraint were lifted, a small React migration would be tractable** — but the migration cost is not free, and the current size doesn't justify it.

### Out of Scope
- A CSS preprocessor (Sass, PostCSS). Plain CSS is the rule.
- A type system (TypeScript). Not allowed; we cover the gap with JSDoc (`@param`, `@returns`).
- A bundler step. The dashboard is intentionally bundler-free; the SDK has a separate single-file build story (ADR-0016).
- A component library (Material UI, shadcn). Vanilla CSS only.

## More Information

- Course rule: `project-options.md` — "vanilla JavaScript without a framework."
- Related: ADR-0016 (single-file SDK, same rule applied to `client/`), ADR-0019 (Chart.js as a viz library, not a framework), ADR-0013 (ESLint flat config covers all this vanilla JS).
- Architecture: `docs/ARCHITECTURE.md` §3.5 — "Dashboard — Cloudflare Pages".
