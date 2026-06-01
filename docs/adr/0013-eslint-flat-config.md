# ADR-0013: ESLint Flat Config at the Repo Root

## Status
Accepted

## Date
2026-05-26

## Context

The course rubric requires linting both manually by developers and in CI. We need a linter that:

- Covers vanilla JS in every package (no TypeScript, no JSX).
- Spans multiple runtimes — browser globals for `client/` and `dashboard/`, Node globals for `cli/`, Workers globals for `workers/*`.
- Has one source of truth that the CI lint job (`npx eslint .` from repo root) can use.

ESLint 9 deprecated the legacy `.eslintrc.*` config format in favour of "flat config" (`eslint.config.{js,mjs,cjs}`). New projects should start on flat config; back-porting to legacy now would mean migrating again later.

## Decision

A single **`eslint.config.mjs`** at the repo root defines linting for every JS file in the project.

Key contents:

```js
import js from "@eslint/js"
import globals from "globals"
import { defineConfig } from "eslint/config"

export default defineConfig([
  {
    ignores: ["node_modules/", "dist/", ".wrangler/", "client/watchtower.min.js"],
  },
  {
    files: ["**/*.{js,mjs,cjs}"],
    plugins: { js },
    extends: ["js/recommended"],
    languageOptions: { globals: { ...globals.browser, ...globals.node } },
    rules: {
      "no-unused-vars": "warn",
      "no-console": "off",  // CLI needs console output
    },
  },
])
```

- The combined `{...globals.browser, ...globals.node}` set deliberately accepts the union — we don't try to scope rules per-package, because the rule set is small and the union covers Workers (which look like Node + Browser hybrids) for free.
- `no-console` is disabled globally because the CLI legitimately uses `console.log` for user output and the SDK uses `console.warn` for debug mode.
- `no-unused-vars` is `warn`, not `error` — unused-but-named parameters are common in callback-heavy code and we'd rather see them in review than block CI.

CI runs `npx eslint .` from the repo root in the `lint` job of `.github/workflows/ci.yml`. Individual packages can additionally run `npm run lint` (defined per-package, e.g. `eslint src/`) for tighter local feedback.

## Consequences

### Positive
- **One config to maintain** — adding a new package automatically gets linted.
- **Flat config is the ESLint 9+ default** — no migration debt.
- **`ignores` is explicit and obvious** — `node_modules/`, `dist/`, `.wrangler/`, and the minified SDK are skipped.
- **CI lint runs in seconds** — flat config + no plugins keeps it fast.

### Negative
- **The browser/Node global union is over-permissive** — a Worker file that uses `document` won't get flagged. Acceptable given how small the codebase is.
- **No type-aware linting** — vanilla JS, no `@typescript-eslint`. JSDoc-based linting (`eslint-plugin-jsdoc`) was considered but deferred.
- **Per-package `npm run lint` scripts duplicate intent** — they exist for developer ergonomics but the canonical lint is the root command.

### Out of Scope
- Prettier, formatting rules, or `eslint-plugin-prettier`.
- JSDoc-style type linting.
- Per-package rule overrides — added only when a real conflict appears.
