# ADR-0016: Single-File, Zero-Bundler SDK Distribution

## Status
Accepted

## Date
2026-05-26

## Context

ADR-0007 chose jsDelivr as the CDN for the SDK. That decision answered *how* customers fetch the file, but not *what* the file looks like. We still had to choose how the SDK source is organised, transpiled, and packaged.

Options:

- **npm package, ESM-only** — modern, tree-shakeable, but requires customers to have a bundler. Many of our target customers (plain HTML projects, course-project apps) don't.
- **npm package, dual ESM + CJS + UMD with a bundler step** — works everywhere, but every release needs a build, and the package needs a tooling story (Rollup/tsup/etc) — more deps, more configs.
- **Single hand-authored `.js` file, no bundler, no build** — what you see in the repo is exactly what jsDelivr serves. Adds one `<script>` tag and you're done.

The SDK is small (~450 lines), targets browser-only, has zero npm dependencies, and is consumed by customers who often don't have a build system. A bundler buys nothing here and costs complexity on every release.

## Decision

`client/watchtower.js` is a **single hand-authored JavaScript file** with no build step. It uses the **UMD-ish dual-mode export pattern** at the bottom of the file:

```js
if (typeof module !== "undefined" && module.exports) {
  module.exports = { Watchtower, getRating }
} else {
  window.Watchtower = Watchtower
}
```

This lets the same file work in two distribution channels:

1. **Customer `<script>` tag from jsDelivr (ADR-0007)** — `window.Watchtower` is set; customers call `new Watchtower({...}).init()`.
2. **Our own Vitest tests (ADR-0008)** — Node sees `module.exports` and the tests `require`/`import` named exports directly.

There is no `dist/`, no transpile, no minification step in our pipeline. jsDelivr's `/npm/` and `/gh/` URLs apply automatic minification on the fly (`.min.js` suffix), so we never commit a minified artifact. (PR `45e53db` removed the previously-committed `watchtower.min.js` for exactly this reason.)

## Consequences

### Positive
- **What you `git log` is what customers run** — no build artifact divergence, no source-map juggling for stack traces from prod.
- **Zero release tooling** — every push to `main` is potentially shippable; jsDelivr picks it up on the next requested version/tag.
- **No npm dependency for customers** — drop in a `<script>` tag and go. Works in any HTML project, regardless of framework or build system.
- **Trivial to review** — the entire SDK is one ~450-line file.
- **Easy to debug in customer browsers** — unminified source on first load, minified-on-demand via jsDelivr suffix.

### Negative
- **No tree-shaking** — every customer downloads the full SDK whether they use feedback widgets or not. Acceptable at current size; revisit if SDK grows past ~20KB minified.
- **CommonJS-style exports inside a file otherwise written as ES5+** — works because Vitest/Vite handle the interop, but is a mild smell. A future migration to native ESM would require either dual-publishing or breaking the `<script>` tag flow.
- **No automatic feature-flag stripping** — debug-mode console logs ship to every customer (gated at runtime by `this.debug`).
- **No TypeScript / `.d.ts`** — customers don't get type hints. Acceptable since the public API is tiny and documented in JSDoc.

### Out of Scope
- A bundled, tree-shakeable build for npm-consuming customers.
- TypeScript migration or `.d.ts` generation.
- Source-map publishing.
