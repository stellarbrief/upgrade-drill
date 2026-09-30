# Issues backlog

20 scoped issues, ready to post to GitHub. Complexity ratings follow the
[Stellar Wave Program](https://docs.drips.network/wave/)'s three tiers.

## Trivial (8)

### 1. Add a `--quiet` flag to suppress the "Running..." startup log line
`upgrade-drill run` logs `Running "<name>"...` to stderr unconditionally. Add `--quiet` to
suppress it, for cleaner CI logs when the report itself is the only wanted output.
- [ ] `--quiet` suppresses the startup line in `src/cli/index.ts`
- [ ] Markdown/JSON output is unaffected
- Suggested files: `src/cli/index.ts`

### 2. Publish a JSON Schema for scenario YAML files
Generate a JSON Schema from `ScenarioSchema` (zod has `z.toJSONSchema()`) and commit it, so
editors can offer autocomplete/validation on scenario files.
- [ ] `schema/scenario.schema.json` is generated and committed
- [ ] A script or npm command regenerates it
- Suggested files: `src/scenario/schema.ts`, new `scripts/generate-schema.ts`

### 3. Add a README badge row (CI status, license)
- [ ] Badges render correctly on GitHub
- Suggested files: `README.md`

### 4. Improve the INCONCLUSIVE-missing-data message to name what was actually captured
`classifyDrill`'s missing-data message names which validators have NO observation, but doesn't
say how many observations WERE captured for the others — useful context when debugging a
partial run.
- [ ] Message includes the observation count for validators that DO have data
- [ ] Existing tests in `src/verdict/engine.test.ts` still pass; add one for the new message
- Suggested files: `src/verdict/engine.ts`

### 5. Add a fifth built-in scenario: a "late-joiner" variant
A validator that starts stopped, boots up partway through the drill, and catches up to the
others — exercises a different code path than `one-laggard` (which never restarts the lagging
node) or `quorum-breaker` (which never restarts anyone).
- [ ] New `scenarios/late-joiner.yml`, validated by `upgrade-drill validate`
- [ ] Entry added to `README.md`'s scenario table
- Suggested files: `scenarios/late-joiner.yml`, `README.md`

### 6. Document the exit codes in `--help` output
`upgrade-drill run --help` should mention exit codes 0/1/2 inline, not just in the README.
- [ ] `commander`'s `.addHelpText('after', ...)` used to append the exit code table
- Suggested files: `src/cli/index.ts`

### 7. Add a CONTRIBUTING.md note on WSL/Docker Desktop quirks
Docker Desktop on Windows via WSL2 has known port-binding gotchas; document the one workaround
maintainers actually needed (if any) building this repo.
- [ ] A short "Known environment quirks" section added
- Suggested files: `CONTRIBUTING.md`

### 8. Render "protocol version 0" more clearly in reports
A validator that never adopted any upgrade correctly reports `finalProtocolVersion: 0` (real,
valid — genesis private networks start at ledger protocol 0, per `docs/TROUBLESHOOTING.md`) but
this reads as confusing or error-like to a first-time user rather than "still at genesis."
- [ ] Markdown/JSON reports render `0` with an explicit "(genesis, never upgraded)" label
- [ ] Unit test in `src/report/markdown.test.ts` covering the new label
- Suggested files: `src/report/markdown.ts`, `src/report/json.ts`

## Medium (8)

### 9. Add an HTML report renderer
A `toHtml(report: DrillReport): string` alongside `toMarkdown`/`toJson`, styled minimally, for
attaching to CI artifacts or a GitHub Pages report — a real timeline visualization (not just a
table) would be especially valuable here.
- [ ] `src/report/html.ts` with the same "what this does not prove" disclaimer guarantee
- [ ] Unit tests mirroring `src/report/markdown.test.ts`
- [ ] `--html-out` flag wired up in the CLI
- Suggested files: `src/report/html.ts`, `src/cli/index.ts`

### 10. Make the quorum topology support nested/weighted quorum sets
Currently every validator's `[QUORUM_SET]` lists all others flatly at one `THRESHOLD_PERCENT`.
Real `stellar-core` supports nested quorum sets (see `docs/stellar-core_example.cfg`'s own
`[QUORUM_SET.N]` examples) — supporting this would let scenarios model more realistic,
non-flat topologies.
- [ ] `topology.quorumStructure` (optional) accepts a nested structure; flat behavior is the default
- [ ] `render-config.ts` renders real, valid nested `[QUORUM_SET.N]` sections
- [ ] At least one new scenario using a nested structure
- Suggested files: `src/scenario/schema.ts`, `src/topology/render-config.ts`

### 11. Verify Docker image pull success explicitly before booting
`composeUp` currently relies on `docker compose up -d` to implicitly pull missing images. Add
an explicit `docker pull` step with retries (mirroring the real pattern in
`stellar/quickstart`'s own `action.yml`, referenced in `upgrade-preflight`'s own
`ADDING_A_NETWORK_BACKEND.md`) run once up front, for clearer error messages on a flaky pull.
- [ ] Images pulled with retry-with-backoff before any node starts
- [ ] Unit test on the retry logic with a mocked `child_process`
- Suggested files: `src/driver/compose.ts`

### 12. Add a `--concurrency` option to run independent scenarios in parallel
For a CI matrix running all 4 built-in scenarios, each currently needs its own full CLI
invocation. A `upgrade-drill run-all` command (or similar) that runs several scenarios and
reports a combined summary would speed up broad regression checks.
- [ ] New command runs N scenarios, each in its own isolated topology/ports
- [ ] Combined summary report (which scenarios passed/failed/were inconclusive)
- Suggested files: `src/cli/index.ts`, new `src/runner/run-all.ts`

### 13. Add per-node resource limits to generated configs
Real validators run with specific resource ceilings; scenarios currently don't model this at
all. Add an optional `validators[].limits` field controlling Soroban resource limits, matching
`upgrade-preflight`'s own verified `--limits` handling where relevant.
- [ ] `topology.validators[].limits` (optional) accepted in the schema
- [ ] Rendered into the generated config where applicable
- Suggested files: `src/scenario/schema.ts`, `src/topology/render-config.ts`

### 14. Add a `--timeout` safety net per drill
A scenario with a mis-scoped `wait` could run far longer than intended. Add an overall drill
timeout (CLI flag, default generous) that tears down and reports `INCONCLUSIVE` rather than
hanging indefinitely.
- [ ] `runDrill` accepts an optional overall timeout and tears down cleanly on expiry
- [ ] Unit test using a fake clock proving the timeout fires
- Suggested files: `src/runner/run.ts`, `src/cli/index.ts`

### 15. Cache Docker image pulls in CI
Speed up `npm run test:integration` in CI by caching the `stellar/stellar-core:28`/`:29` image
layers between runs.
- [ ] CI workflow uses a Docker layer cache action
- [ ] Documented in `docs/TROUBLESHOOTING.md` or `CONTRIBUTING.md`
- Suggested files: `.github/workflows/ci.yml`

### 16. Add a `list-scenarios --json` output mode
For programmatic consumption — currently `list-scenarios` only prints human-readable lines.
- [ ] `--json` flag prints an array of `{name, description, path}`
- [ ] Unit test covering the JSON shape
- Suggested files: `src/cli/index.ts`

## High (4)

### 17. A sweep mode that finds the exact number of laggards that breaks quorum
Given a topology and a threshold, automatically run `quorum-breaker`-style trials with
increasing numbers of stopped nodes until the network stalls, reporting the exact breaking
point — genuinely useful for an operator sizing their own quorum's safety margin.
- [ ] `upgrade-drill sweep <scenario>` runs N trials, varying how many nodes are stopped
- [ ] Reports the exact minimum stopped-node count that produces `NETWORK_STALLED`
- [ ] Each trial reuses the existing runner/verdict logic, not new bespoke code
- Suggested files: new `src/cli/sweep.ts`, `src/runner/run.ts`

### 18. Import a real validator/quorum layout from public network data as a topology
Let a user point at a real network's published quorum configuration (e.g. a TOML/JSON export
from a known explorer) and generate a scaled-down local topology that mirrors its real
quorum-set shape, rather than hand-writing one.
- [ ] `upgrade-drill import-topology --from <file>` scaffolds a `topology` block
- [ ] Handles the case where the real topology is too large to run locally with a clear error
- Suggested files: new `src/topology/import.ts`, `src/cli/index.ts`

### 19. A Kubernetes backend behind the driver interface
`src/driver/compose.ts` is the only place that knows how to start/stop/restart a node. A
Kubernetes-based backend (for running larger drills on a real cluster instead of a laptop)
should be possible by implementing the same small interface, per `docs/ARCHITECTURE.md`'s
module boundaries.
- [ ] A documented driver interface `src/driver/` implementations must satisfy
- [ ] A real (if minimal) Kubernetes-based implementation
- [ ] At least one scenario runs successfully against it
- Suggested files: `src/driver/`, new `docs/ADDING_A_DRIVER_BACKEND.md`

### 20. A GitHub Action wrapper, mirroring `upgrade-preflight`'s own `action/action.yml`
Let other repos run a drill as part of their own CI without checking this repo out manually.
- [ ] `action/action.yml` composite action builds this repo and runs a given scenario
- [ ] Writes the Markdown report to the job summary
- [ ] Documented in a new `docs/CI_USAGE.md`, matching `upgrade-preflight`'s pattern
- Suggested files: new `action/action.yml`, `docs/CI_USAGE.md`
