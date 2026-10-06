# Issues backlog

Candidate issues, each written to be posted to GitHub as-is. Every entry states the current
state at a specific commit, what to build, how to verify it, and what is out of scope.
Complexity (Trivial / Medium / High) follows the tiers in [`CONTRIBUTING.md`](CONTRIBUTING.md).
If you pick one up, comment on the issue first so two people don't build the same thing.
Entries marked **Posted on GitHub** are open issues: comment there, not here. The rest are
candidates that have not been posted yet.

Audited commit: `3c23b6d`

Most of these need Docker to verify for real. Where an issue can be done and unit-tested without
Docker, it says so.

---

### 1. Add a scenario that produces `NETWORK_LIVE_WITH_HALTED_NODES` in a real run
**Complexity:** Medium

**Description**
The verdict exists and is unit-tested, but no scenario has ever produced it against real
containers, so we don't know it behaves as designed.

**Current state**
The four built-in scenarios all use 3 validators except `quorum-breaker` (5). Real runs have
produced `NETWORK_UPGRADED`, `UPGRADE_NOT_ADOPTED`, `NETWORK_STALLED` and `INCONCLUSIVE`, never
`NETWORK_LIVE_WITH_HALTED_NODES`. The README and `docs/ARCHITECTURE.md` say so.

**What to build**
A new scenario under `scenarios/`, for example 5 validators where all upgrade and vote, and one
is then stopped (`stop-node`) so it is not synced at the end while the other four are. Run it
for real (the manual `Verify all scenarios` workflow, or locally) and record what actually
happens. Add the scenario to the workflow matrix and the README table.

**Acceptance criteria**
- [ ] `upgrade-drill validate` accepts the scenario.
- [ ] The real run's verdict and per-node outcome are recorded, even if it is not the verdict you hoped for.
- [ ] The scenario's `description` states what was observed, not what was expected.
- [ ] The README's "verified by real runs" list is updated to match.

**Out of scope**
Changing the verdict logic in `src/verdict/engine.ts`.

**Verification**
`node dist/cli/index.js run scenarios/<name>.yml` with Docker, or the `Verify all scenarios` workflow.

---

### 2. Let a drill start from a real protocol version, not genesis 0
**Complexity:** High

**Description**
Every drill starts from a fresh network at ledger protocol 0, so it rehearses 0 to N, not the
28 to 29 transition an operator actually faces.

**Current state**
The README's "Protocol model" section documents this. `happy-path` adopts 0 to 29 in one vote,
which shows a direct jump works, and `set-upgrade` plus `wait` already exist in
`src/scenario/schema.ts`.

**What to build**
An optional scenario field (for example `bootstrap: { protocolVersion: 28 }`) that, before the
timeline starts, upgrades every validator to that protocol and polls `info.ledger.version`
until all report it. If that does not happen within a limit, the drill ends `INCONCLUSIVE`.
Then add a `happy-path` variant that drills 28 to 29.

**Acceptance criteria**
- [ ] Without the field, behavior is unchanged.
- [ ] Observations before the timeline starts are not mixed into the timeline report.
- [ ] A real run of the new variant shows the ledger at 28 before the vote and 29 after.
- [ ] The unit tests for the new logic run without Docker (fake clock and driver, see `src/timeline/engine.test.ts`).

**Out of scope**
New action types. Changing how verdicts are classified.

**Verification**
`npm test`, plus a real run of the new scenario with Docker.

---

### 3. Label "protocol 0" as genesis in reports
**Complexity:** Trivial
**Posted on GitHub:** #6

**Description**
A final protocol of `0` reads like an error. It means the network never adopted any upgrade.

**Current state**
`src/report/markdown.ts` prints `finalProtocolVersion ?? 'unknown'` and the timeline's
`protocolVersion` raw, so a never-upgraded node shows `0`. `docs/TROUBLESHOOTING.md` explains
the value.

**What to build**
Render `0` in the Markdown report as `0 (genesis, never upgraded)` in the per-node table and the
timeline. Leave the JSON report numeric.

**Acceptance criteria**
- [ ] Markdown shows the label for 0 and plain numbers otherwise.
- [ ] A test in `src/report/markdown.test.ts` covers both.
- [ ] `src/report/json.ts` output is unchanged.

**Out of scope**
Changing what the verdict engine reads (`info.ledger.version`).

**Verification**
`npm test`.

---

### 4. Add an overall timeout to a drill
**Complexity:** Medium
**Posted on GitHub:** #7

**Description**
A stuck `docker compose` call stalls the drill with no clear end.

**Current state**
`src/driver/http-client.ts` bounds individual node requests. `composeUp`, `composeStartNode`,
`composeStopNode` and the other calls in `src/driver/compose.ts`, and the drill as a whole in
`runDrill` (`src/runner/run.ts`), have no timeout. The timeline's wall-clock length is fixed by its `wait` actions.

**What to build**
An optional overall timeout (a CLI flag with a generous default) that tears the network down and
ends the drill `INCONCLUSIVE` with a clear message, instead of hanging.

**Acceptance criteria**
- [ ] On expiry the containers are torn down and the report explains why.
- [ ] A unit test with a fake clock and a never-resolving fake driver proves the timeout fires.
- [ ] The default does not interrupt the built-in scenarios.

**Out of scope**
Per-action timeouts.

**Verification**
`npm test`.

---

### 5. Sweep: find how many stopped validators break the network
**Complexity:** High

**Description**
Operators want to know how many validators can be down before consensus stops. Today each
number is a hand-written scenario.

**Current state**
`quorum-breaker` stops 2 of 5 validators and ends `NETWORK_STALLED`. Each scenario is one fixed
timeline and `src/runner/run.ts` runs one at a time.

**What to build**
`upgrade-drill sweep <scenario> --stop <min>..<max>` that reruns a scenario with an increasing
number of stopped validators and reports the smallest number that ends in `NETWORK_STALLED`.
Each trial must reuse the existing runner and verdict logic.

**Acceptance criteria**
- [ ] Each trial reuses `runDrill` and `classifyDrill`.
- [ ] The summary lists each trial's verdict and the first stalling count.
- [ ] Trial orchestration is unit-tested with a fake runner, without Docker.

**Out of scope**
Running trials in parallel.

**Verification**
`npm test`, plus a real sweep with Docker.

---

### 6. Provide a GitHub Action to run a drill in CI
**Complexity:** Medium

**Description**
Other repositories can't run a drill in their pipeline without checking this one out by hand.

**Current state**
There is no action. The sister project `upgrade-preflight` has `action/action.yml`, a composite
action that builds the CLI, runs it, and writes the report to the job summary. The drill needs
Docker and about 6 to 7 minutes per scenario.

**What to build**
A composite `action/action.yml` that builds this repository, runs a given scenario file, writes
the Markdown report to the job summary, and uploads the reports as artifacts. Document it in
`docs/CI_USAGE.md`.

**Acceptance criteria**
- [ ] Exit codes follow the README (0, 1 for stalled/not adopted, 2 for inconclusive).
- [ ] The docs explain the run time and the Docker requirement.
- [ ] The PR links a real workflow run that used the action.

**Out of scope**
Other CI providers.

**Verification**
Run the action from a test repository and link the run.
