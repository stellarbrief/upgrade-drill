# Contributing

## Setup

```bash
git clone https://github.com/stellarbrief/upgrade-drill.git
cd upgrade-drill
npm ci
```

Use Node 22, which is what CI uses (`package.json` requires 20.11 or newer). `npm ci` installs
exactly what `package-lock.json` says. `npm install` can rewrite that file, so do not commit
changes to `package-lock.json` unless you changed a dependency on purpose.

Docker is required to actually run a drill and for the integration test suite — but not for
most day-to-day work. See "Working without Docker" below.

## Development loop

```bash
npm run lint          # eslint
npm run typecheck     # tsc --noEmit
npm run test          # unit tests (no Docker required)
npm run test:integration  # integration tests (Docker required; skips cleanly without it)
npm run build          # compile to dist/
```

## Working without Docker

You can contribute meaningfully to this project without Docker at all:

- `npm run dev -- run scenarios/happy-path.yml --dry-run` generates real config files and a
  Compose file and prints the full timeline plan — using clearly-fake placeholder keys instead
  of shelling out to Docker for `gen-seed`. This is enough to review or modify
  `src/topology/`'s output without ever booting a container.
- `src/verdict/engine.ts` (the logic that turns observations into a verdict) and
  `src/report/` (the Markdown/JSON renderers) are pure functions over plain data — every test
  for them constructs `NodeSnapshot`/`DrillReport` objects directly, with no Docker involved.
  This is the easiest, fastest place to add coverage or fix a bug.
- `fixtures/*.json` are real, captured `info`/`quorum` responses from an actual drill run — use
  them as realistic sample data for new tests instead of guessing a response shape.

## Branch / PR flow

1. Fork the repo and create a branch off `main`.
2. Make your change, with tests — see "What needs tests" below.
3. Run the full development loop above before opening a PR.
4. Open a PR using the template; link the issue you're closing, if any.

The PR template asks about `npm run test:integration`. Mark it N/A only when the change cannot
affect anything that runs against Docker: documentation, report formatting, config validation,
or changes to unit tests only, and say which in the pull request. If you change the behaviour of
`src/driver/`, `src/runner/` or `src/topology/`, run it, or say why you could not. CI runs the
integration job on every pull request either way.

## Picking up an issue

Comment on the issue to say you would like it, and wait for the maintainer to assign it to you
before you start. A comment alone does not reserve it. If an assigned issue has had no activity
for 7 days, the maintainer may ask whether you are still working on it, and may unassign it
after 7 more days without a reply. A pull request for an issue that is assigned to someone else
is looked at after theirs.

## Your first pull request

The first time you open a pull request, GitHub holds its CI run until a maintainer approves it,
so the checks show nothing for a while. That is a GitHub setting, not broken CI. The maintainer
approves the run when they review. Run the development loop locally in the meantime.

## AI-assisted contributions

AI-assisted contributions are welcome, as is this project's own use of AI assistance. You are
responsible for what you submit: you have run it, you understand it, and every claim in the
description is true. Pull requests are reviewed the same way whoever or whatever wrote them.

## Code style

TypeScript strict mode, ESM throughout (`"type": "module"`), relative imports use `.js`
extensions even though the source files are `.ts` — the standard pattern for
`moduleResolution: "NodeNext"`, letting `tsx` (dev) and `tsc` (build) both resolve the same
import correctly. ESLint (`typescript-eslint` recommended rules) enforces the rest.

## What needs tests

- **`src/scenario/`, `src/verdict/`, `src/report/`, `src/timeline/`** are pure functions over
  plain data — no Docker needed. This is the easiest, fastest place to add coverage.
- **`src/topology/`** — config/Compose-file generation is unit-tested via
  `fakeKeypairSource` (see `src/topology/generate.test.ts`); a new field needs a test asserting
  the generated text/document, not a real Docker run.
- **`src/driver/`** — mock `node:child_process`/`fetch`, following
  `src/driver/compose.test.ts`/`http-client.test.ts`. Assert the exact command/URL, not just
  "it was called."
- **`src/runner/run.ts`** touches real Docker and is harder to unit-test in isolation; changes
  here should come with an integration test addition, run against Docker locally or trusted to
  CI.

## How issues are rated for complexity

Issues in [`ISSUES_BACKLOG.md`](ISSUES_BACKLOG.md) are rated **Trivial**, **Medium**, or
**High** by scope and complexity:

- **Trivial**: typos, small bug fixes, copy changes, a new scenario YAML variant, better CLI
  help text, improved error messages.
- **Medium**: a standard new feature or an involved bug fix — a new report format, a new
  timeline action type, CI improvements.
- **High**: a complex feature, refactor, or new integration — a new topology backend, a plugin
  system, importing a real validator layout as a topology.

Every open issue carries `help wanted` and a `complexity:` label that matches its rating.
Trivial issues also carry `good first issue`; Medium and High do not.

## How maintainers work here

- There is currently one maintainer. Response times are best effort; there is no guaranteed
  turnaround.
- A bug report is reproduced before a fix is accepted. A feature is discussed in its issue
  before a PR is opened.
- CI (lint, typecheck, tests, build, and the integration job) must pass before merge. A change
  to a scenario or to verdict logic should also be run for real with Docker, or via the manual
  `Verify all scenarios` workflow, and the observed result recorded.
- A change that affects a documented claim updates the docs in the same PR. A scenario's
  description states what was observed, not what was expected.
- Changes to the scenario schema, verdict rules or the JSON report shape need maintainer
  approval, and a JSON shape change bumps `schemaVersion` and is noted in `CHANGELOG.md`.
- Releases are tags (`vX.Y.Z`) on `main` after CI is green, with notes taken from `CHANGELOG.md`.
- Security reports: see [`SECURITY.md`](SECURITY.md).
