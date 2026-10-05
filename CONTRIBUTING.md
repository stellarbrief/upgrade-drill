# Contributing

## Setup

```bash
git clone https://github.com/stellarbrief/upgrade-drill.git
cd upgrade-drill
npm install
```

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

## Code style

TypeScript strict mode, ESM throughout (`"type": "module"`), relative imports use `.js`
extensions even though the source files are `.ts` — the standard pattern for
`moduleResolution: "NodeNext"`, letting `tsx` (dev) and `tsc` (build) both resolve the same
import correctly. ESLint (`typescript-eslint` recommended rules) enforces the rest.

## What needs tests

- **`src/scenario/`, `src/verdict/`, `src/report/`, `src/timeline/`** are pure functions over
  plain data — no Docker needed. This is the easiest, fastest place to add coverage.
- **`src/topology/`** — config/Compose-file generation is fully unit-tested via
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
**High**, matching the [Stellar Wave Program](https://docs.drips.network/wave/)'s complexity
tiers:

- **Trivial**: typos, small bug fixes, copy changes, a new scenario YAML variant, better CLI
  help text, improved error messages.
- **Medium**: a standard new feature or an involved bug fix — a new report format, a new
  timeline action type, CI improvements.
- **High**: a complex feature, refactor, or new integration — a new topology backend, a plugin
  system, importing a real validator layout as a topology.
