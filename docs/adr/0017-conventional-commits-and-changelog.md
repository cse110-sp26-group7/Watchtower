# ADR-0017: Conventional Commits and Hand-Maintained Changelog

## Status
Accepted

## Date
2026-05-26

## Context

The course rubric requires:

> Commit messages should be consistent and follow a format like Conventional Commits.
> A changelog should be kept and may be generated manually, automatically, or some hybrid.

The deploy pipeline (ADR-0010) is tag-based, and SemVer tags are the production deploy trigger. That makes commit-message discipline directly load-bearing: a contributor's choice of `feat` vs `fix` informs whether the next release is a minor or patch bump.

Options for commit-message format:

- **Free-form** — fastest to write, useless for changelog generation, gives reviewers no signal about scope.
- **Conventional Commits** — `type(scope): description` with a known set of types (`feat`, `fix`, `docs`, `chore`, `refactor`, `test`, `ci`). Industry standard, parseable by tools like `conventional-changelog` or `release-please`.

Options for changelog maintenance:

- **Fully automated** (`release-please`, `changesets`) — robust but adds CI complexity and a bot to manage.
- **Fully manual** — easy to forget, often skipped.
- **Hybrid** — humans curate `CHANGELOG.md` at release time, optionally seeded by `git log` between tags. Lowest tooling cost, still gives users a readable history.

## Decision

**Commits follow Conventional Commits**, enforced by convention and review (not by a commit hook, yet).

Observed types in use:
- `feat(scope): ...` — user-visible new capability
- `fix(scope): ...` — bug fix
- `docs(scope): ...` — documentation only
- `chore: ...` — tooling, build, repo housekeeping
- `refactor(scope): ...` — internal change with no user-visible effect
- `test(scope): ...` — test-only changes
- `ci: ...` — CI/CD pipeline changes

Examples from the current history that match this format:
- `docs(backend): add Sprint 4 backlog`
- `chore: remove watchtower.min.js, jsDelivr auto-minifies from source`
- `docs(readme): update SDK CDN link, init example, and deployed endpoints`

**Changelog is hybrid**: `CHANGELOG.md` at the repo root is updated **manually as part of the release-tag workflow** (ADR-0010). At release time, the tagger runs `git log <previous-tag>..HEAD --oneline` to seed the entries and edits them down to user-meaningful changes grouped under `### Added / Changed / Fixed / Removed`. Format follows [Keep a Changelog](https://keepachangelog.com/).

SemVer bump rules:
- `feat:` → minor bump
- `fix:`, `docs:`, `chore:`, `refactor:`, `test:`, `ci:` → patch bump
- Any commit with `BREAKING CHANGE:` footer → major bump

## Consequences

### Positive
- **PRs become self-documenting** — `feat(cli): add deploy command` tells a reviewer everything they need before opening the diff.
- **Changelog generation is trivial** — `git log` already speaks the right language.
- **SemVer bumps stop being arbitrary** — commit types map directly to version increments.
- **Low tooling overhead** — no commit hook, no release bot.

### Negative
- **No enforcement** — a contributor can land a free-form message. Mitigated by PR review. Adding a `commitlint` hook would help but adds Husky/lefthook to the toolchain.
- **`CHANGELOG.md` requires release-time discipline** — easy to forget. The deploy workflow could fail-fast if `CHANGELOG.md` has no entry for the new tag, but currently doesn't.
- **Scope names are ad-hoc** — `backend`, `cli`, `sdk`, `readme` have all appeared. A documented list of valid scopes would help.

### Out of Scope
- Commit-message linting in CI (`commitlint`).
- `release-please`-style automated PRs that maintain `CHANGELOG.md` for us.
- Squash-merge policy and how it interacts with commit-type preservation.
