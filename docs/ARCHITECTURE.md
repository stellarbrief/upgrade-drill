# Architecture

## The problem

A validator operator gets no easy way to rehearse a protocol upgrade before it happens for
real. Documentation describes the mechanism (SCP nomination, upgrade steps, drop-if-you-
disagree), but there's no tool that lets an operator actually watch it happen on their own
laptop — with a laggard, a stopped node, or a scheduling mismatch — before the real vote.

## The approach

`upgrade-drill` boots a small private network of real `stellar-core` validators in Docker,
executes a scripted timeline of actions (start/stop nodes, fire upgrade votes), polls each
node's real `info`/`quorum` HTTP endpoints throughout, and classifies what actually happened
into one of five verdicts. Nothing is simulated: every node is a real `stellar-core` binary,
every vote is the real `upgrades` HTTP command, every observation is a real HTTP response.

This is deliberately built on a foundation proven by a feasibility spike (see the repo's own
`PLAN.md`) — every config field, every command sequencing choice (like running `new-hist`
exactly once, not on every restart), came from debugging real failures against real containers,
not from documentation alone. The real protocol-version field itself was a hard-won correction:
`info.protocol_version` LOOKS like the obvious field, but per stellar-core's own source
(`ApplicationImpl.cpp`) it's the running binary's own configured maximum, not the network's
actual state — it was caught only because it changed instantly on a bare restart, before any
real consensus could occur. The real, consensus-agreed protocol version is
`info.ledger.version`.

## Module map

```
src/scenario/   zod schema for scenario YAML files + loader
src/topology/   generates stellar-core configs, the entrypoint script, and a Compose file
                from a scenario's topology — no Docker needed (see `fakeKeypairSource`)
src/driver/     the only code that shells out to `docker`/`docker compose` or calls a node's
                HTTP endpoints — gen-seed, compose control, info/quorum/upgrades client
src/timeline/   executes a scenario's timeline in order, polling observations throughout
src/verdict/    pure functions: given real observed snapshots, produce a verdict + explanation
src/report/     Markdown + JSON renderers over a DrillReport
src/runner/     ties the above together into one full drill run
src/cli/        the `upgrade-drill` command line entry point
```

`src/verdict/` and `src/report/` take no dependency on Docker or HTTP at all — they operate
purely on the `NodeSnapshot`/`DrillReport` shapes in `src/verdict/types.ts`. This is what makes
verdict logic exhaustively unit-testable with hand-built fixtures (see
`src/verdict/engine.test.ts`), and it's the boundary a contributor adding a new action type or
report format needs to work within.

## Verdicts

| Verdict | Meaning |
| --- | --- |
| `NETWORK_UPGRADED` | Every validator ended synced and on the scenario's declared target protocol version. |
| `UPGRADE_NOT_ADOPTED` | Every validator stayed synced and healthy, but the network never reached one agreed target version. |
| `NETWORK_LIVE_WITH_HALTED_NODES` | Some validators stayed synced; at least one did not. |
| `NETWORK_STALLED` | No validator ended in a synced state — regular consensus broke, not just the upgrade. |
| `INCONCLUSIVE` | Not enough real data to classify confidently — never asserted as success. |

Real-run status: `NETWORK_LIVE_WITH_HALTED_NODES` has unit-test coverage only; no built-in
scenario has produced it against real containers yet. The others have been observed in real
runs (see the README).

`classifyDrill` (in `src/verdict/engine.ts`) never guesses: if even one declared validator has
no observation at all, the verdict is `INCONCLUSIVE`, not a guess based on partial data.

## What this does not prove

Every report explicitly states this drill ran on a small, local topology with throwaway keys
and no real network load. It does not prove how a real Mainnet upgrade with many more
validators, real traffic, and real geographic diversity will behave.
