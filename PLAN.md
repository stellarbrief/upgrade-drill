# PLAN: upgrade-drill

## Goal

A CLI that lets Stellar validator operators rehearse a protocol upgrade on their own laptop: it
launches a small private network of REAL `stellar-core` containers (mixed versions), runs a
scripted upgrade vote, and reports what happened — which nodes upgraded, which halted, whether
the network stayed live, and why. Local only, never touches Mainnet/Testnet, no LLM calls.

This is explicitly the riskiest of the three stellarbrief repos (the user chose to keep it
despite that flag). Its own spec mandates: **do the feasibility spike first, and stop rather
than build a fake substitute if it doesn't pass.**

## This build environment has no Docker at all

Unlike `upgrade-preflight` (which could at least build everything and rely on CI for the one
live Docker run), `upgrade-drill`'s entire first deliverable — the feasibility spike — IS a
live Docker Compose run. It cannot be executed here. Per the spec's own instruction ("If Docker
is not available in this environment, build everything that doesn't need it... clearly mark
integration parts as UNVERIFIED") and the user's explicit choice when asked how to handle this:
**build the spike as a real, runnable artifact (compose file + configs + driver script) and a
GitHub Actions workflow that runs it for real on a Docker-enabled runner, then read the actual
results from CI** before deciding whether to continue to the full product build. This mirrors
exactly how `upgrade-preflight`'s integration job caught a real bug that local testing never
could have.

**Consequence for build order**: only the spike (Phase A) is built and pushed first. The full
product (scenario engine, CLI, four built-in scenarios, contributor-readiness scaffolding) is
Phase B, built only after CI's spike run is read and confirms pass criteria — exactly as the
spec's own stop condition requires, just relocated to run on a machine that actually has Docker.

## Verified facts (checked live on 2026-09-30 against current official sources, not carried
over from the launch-pack doc's own claims)

- **Upgrade voting mechanics** — `stellar-core`'s own `docs/versioning.md`
  (github.com/stellar/stellar-core): upgrades are proposed via SCP nomination alongside the
  transaction set. A node drops an upgrade step from its vote if: it doesn't understand the
  upgrade type, the value differs from that node's own configured/scheduled upgrade setting, or
  network time is before the scheduled upgrade datetime. If a quorum votes for a value a given
  node considers invalid, that node abstains (ignores SCP messages for that ledger) rather than
  applying it — it does not crash, and will resync from history after a few minutes, still
  voting to revert to its own configured values. This is the exact, real mechanism
  `one-laggard`/`quorum-breaker`/`mismatched-vote` scenarios are built to observe.
- **The `upgrades` HTTP command and its parameters** (`upgradetime`, `protocolversion`, plus
  `basefee`/`maxtxsetsize`/`basereserve`/`configupgradesetkey` for other upgrade types) are
  real and documented in the same file, confirming the launch-pack doc's claim — but the exact
  URL query-string encoding (`?mode=set&upgradetime=...&protocolversion=...`) was NOT re-verified
  against a live node here (no Docker); the spike must capture a real `curl`/`http-command`
  invocation and its exact accepted syntax as a fixture.
- **Real, small-scale local quorum config syntax** — `stellar-core`'s own
  `docs/stellar-core_standalone.cfg` gives the actual, minimal `[QUORUM_SET]` syntax for a tiny
  test network: `THRESHOLD_PERCENT`, `VALIDATORS=[...]` (accepts `"$self"` for the node's own
  key), `FAILURE_SAFETY=0`, `UNSAFE_QUORUM=true`. This is a simpler, more directly applicable
  pattern than the domain/QUALITY-based automatic quorum configuration in
  `stellar-core_example_validators.cfg` (which is designed for realistic multi-domain pubnet-like
  topologies and would need `SKIP_HIGH_CRITICAL_VALIDATOR_CHECKS_FOR_TESTING`, per the
  launch-pack doc's own unverified claim). **We use the manual `[QUORUM_SET]` form for the
  3-node topology** — each node's config lists the other validators' `NODE_SEED`-derived public
  keys directly, with `UNSAFE_QUORUM=true`/`FAILURE_SAFETY=0` (appropriate here: this is
  explicitly a disposable, non-production test network per the tool's own safety rules).
- **Ports, from the standalone/example configs**: `HTTP_PORT` (the admin HTTP command port,
  `11626` in the example validator config, `8080` in the standalone config — configurable, we
  pick our own per-node ports) is distinct from the peer/overlay port (`PEER_PORT`, not shown
  in the standalone example but real and configurable; the launch-pack doc's claim of `11625`
  being the "quickstart image" default peer port is about `stellar/quickstart`, a different
  image, and does not apply here — we set our own `PEER_PORT`/`HTTP_PORT` per node explicitly in
  generated configs rather than assuming a default).
- **`RUN_STANDALONE=true` + `MANUAL_CLOSE=true`** genuinely exists and is documented in
  `docs/quick-reference.md` as a way to control ledger close deterministically via the
  `manualclose` HTTP command — but that combination is documented and normally used for a
  SINGLE standalone node (exactly how `stellar/quickstart --local` uses it for
  `upgrade-preflight`'s networks). Whether/how a coordinated `manualclose` works cleanly across
  THREE nodes that must reach real SCP consensus with each other (rather than each closing
  independently) is genuinely uncertain and is exactly the "accelerate ledger close" question
  the spike must answer empirically — see "Unverified assumptions" below.
- **Real Docker Hub image tags for stellar-core** (`hub.docker.com/r/stellar/stellar-core/tags`,
  checked live): clean major-version tags `27`, `28`, `29` all exist and are current
  (`29` = `29.0.0-3589.4eb833373`, pushed 12 days ago at time of writing; `28` =
  `28.0.1-3508.947aad841`). The spike's "older vs newer" mixed-version test uses `28` (older)
  and `29` (newer) — the same two versions `upgrade-preflight` already demos, for consistency
  across the org's repos.
- **`stellar-cli gen-seed`** is confirmed real (`docs/quick-reference.md`) for generating a
  fresh `NODE_SEED`/public key pair per validator — used instead of ever hand-picking or
  reusing keys.

## Unverified assumptions — exactly what the spike (Phase A) exists to resolve

These are NOT guessed at or worked around; the spike's whole purpose is to produce a real,
observed answer for each, recorded in `SPIKE.md` with actual captured output:

1. Whether `RUN_STANDALONE`+`MANUAL_CLOSE` can coordinate ledger closing across 3 real,
   independently-run containers that also need to reach SCP consensus with each other, or
   whether the drill instead has to rely on the real ~5-second default ledger close time
   (i.e. no acceleration is safely possible for a genuinely multi-node quorum, only for the
   single-node case `quickstart` uses). If no safe acceleration exists, `upgrade-drill`'s
   scenarios simply take real wall-clock time (minutes, not seconds) — documented honestly
   rather than assumed away.
2. The exact `upgrades` HTTP command URL/query-string syntax accepted by a real running node
   (method, path, parameter encoding) — captured as a real `curl` invocation and response.
3. The exact JSON shape of `info` and `quorum` HTTP command responses on a real multi-node
   private network — field names for protocol version, quorum health/intersection indicators,
   node state — captured as real fixtures, not assumed from documentation prose.
4. Whether 3 containers with a manual `[QUORUM_SET]` (no `SKIP_HIGH_CRITICAL_VALIDATOR_CHECKS_
   FOR_TESTING`) actually reach consensus and close ledgers at all — if not, that flag (or some
   other config gap) must be identified and added before the spike can pass.
5. What a node on an older, unsupported protocol version genuinely does when the network
   upgrades past it (per `versioning.md`: abstains and resyncs from history "after a few
   minutes" — but the ACTUAL observed `info` output and timing, at 3-node laptop scale, is
   unverified).

## Phase A build order (this session)

1. This `PLAN.md`.
2. `spike/` — real Docker Compose file, 3 generated `stellar-core` configs (2 on `:29`, 1 on
   `:28` for the mixed-version item 4 of the spike), a driver script that boots them, polls
   `info`, issues the `upgrades` HTTP command, polls again, and writes its real observations
   into `SPIKE.md` automatically (not by hand) — so the CI run itself produces the spike report
   from real output, and I read that report rather than writing it speculatively.
3. `.github/workflows/spike.yml` — runs `spike/run.sh` on `ubuntu-latest` (real Docker) on every
   push, uploads `SPIKE.md` and the raw `info`/`quorum` JSON captures as build artifacts and
   also commits/echoes `SPIKE.md`'s content to the job summary so it's readable without
   downloading an artifact.
4. Minimal `package.json`/`.gitignore`/`README.md` stub explaining the repo is currently
   spike-only pending a CI result, so it isn't mistaken for an abandoned/incomplete product.
5. Hand off to the user to push; read the real CI result; then either:
   - **Spike passes** (3 consecutive clean runs of the happy-path boot+vote+upgrade
     observation, plus a clear observation for the mixed-version case): proceed to Phase B, the
     full product, per the original spec's build order steps 2–8.
   - **Spike fails** after at most 3 distinct fixed approaches: stop, do not build a fake
     simulated substitute, report exactly what blocked it and let the user decide next steps.

## Safety rules (apply throughout, spike and full product alike)

- Local only — never connects to Mainnet, Testnet, or any real network. Every run generates
  fresh throwaway keys (`stellar-core gen-seed`) and uses a private network passphrase unique
  to this tool, never a real one.
- Not affiliated with SDF, not for production — stated in the README.
- Never print secret seeds in reports, logs, or committed fixtures — the spike driver script
  redacts `NODE_SEED` values before writing anything to `SPIKE.md` or CI artifacts.
