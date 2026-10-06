# Upgrade Drill

A CLI that lets Stellar validator operators rehearse a protocol upgrade on their own laptop —
launching a small private network of real `stellar-core` containers, running a scripted upgrade
vote, and reporting exactly what happened: which validators upgraded, which fell behind, and
whether the network stayed live. Local only; not affiliated with SDF; not for production.

**See it without Docker:** the [Upgrade Drill playground](https://stellarbrief.github.io/playground/drill/)
replays real recorded runs of all four scenarios, observation by observation.

## How it works

1. You describe a validator topology and a timed sequence of actions in a scenario YAML file.
2. `upgrade-drill run scenarios/happy-path.yml` boots real `stellar-core` containers for every
   validator, executes the timeline (starting/stopping nodes, firing real `upgrades` HTTP
   commands), and polls every node's real `info`/`quorum` endpoints throughout.
3. It classifies the result into one of five verdicts — `NETWORK_UPGRADED`,
   `UPGRADE_NOT_ADOPTED`, `NETWORK_LIVE_WITH_HALTED_NODES`, `NETWORK_STALLED`, or
   `INCONCLUSIVE` — with a plain-language, per-node explanation grounded in what was actually
   observed, never guessed.

See [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) for what each verdict means and a real,
confirmed quirk worth knowing up front: with 3 validators at the default 67% quorum threshold,
the threshold rounds UP to require all 3 to agree — so even one disagreeing validator already
blocks that specific vote, as seen live in this project's own `one-laggard` scenario.

## Quickstart

Requires [Docker](https://docs.docker.com/get-docker/).

```bash
git clone https://github.com/stellarbrief/upgrade-drill.git
cd upgrade-drill
npm install
npm run build
node dist/cli/index.js run scenarios/happy-path.yml
```

This boots 3 validators, restarts them on a newer `stellar-core` binary (data preserved, the same
way a real operator swaps binaries), fires the upgrade vote, and reports the outcome. Takes
roughly 6-7 minutes for the full scenario.

### Protocol model: read this before interpreting a report

The `image: "28"` / `"29"` values in a scenario are `stellar-core` **software release** tags.
They are not the ledger's protocol version. A brand-new private network starts at ledger
protocol **0** whatever binary is running, and only moves when an upgrade vote reaches the
configured quorum threshold. So a drill rehearses a genesis-to-N upgrade (for example 0 to 29),
not a Mainnet-style 28 to 29 transition, and a report showing final protocol `0` means "the
network never adopted any upgrade", not an error. The tool reads the real consensus state from
each node's `info.ledger.version`; see [`docs/TROUBLESHOOTING.md`](docs/TROUBLESHOOTING.md) for
why `info.protocol_version` is the wrong field.

No Docker? Try `node dist/cli/index.js run scenarios/one-laggard.yml --dry-run` — it generates
real config files and a Compose file and prints the full timeline plan, using clearly-fake
placeholder keys instead of a real `gen-seed` call. Useful for reviewing what a scenario would
actually do before running it for real.

## Built-in scenarios

| Scenario | What it tests |
| --- | --- |
| `happy-path` | All validators upgrade together and adopt the new protocol version. |
| `one-laggard` | One validator never gets the upgrade vote. With 3 validators at the default 67% threshold, all 3 must agree, so in real runs the whole network stays at genesis protocol 0 (`UPGRADE_NOT_ADOPTED`) while every node stays synced. |
| `quorum-breaker` | Enough validators go down that the remaining ones can't reach quorum at all — a genuinely different dynamic from `one-laggard`, using 5 validators so a minority loss doesn't already block every vote. |
| `mismatched-vote` | Validators disagree on exactly when to apply the same upgrade, so it's never adopted, even though every node stays healthy. |

`upgrade-drill list-scenarios` lists these with their file paths. Full reports from real runs of
all four are in [`docs/samples/`](docs/samples/), with a provenance record, and a few raw node
responses from the original feasibility spike are in [`fixtures/`](fixtures/). See
[`docs/WRITING_SCENARIOS.md`](docs/WRITING_SCENARIOS.md) to write your own.

**Verified by real runs so far:** `NETWORK_UPGRADED` (`happy-path`), `UPGRADE_NOT_ADOPTED`
(`one-laggard`, `mismatched-vote`), `NETWORK_STALLED` (`quorum-breaker`), and `INCONCLUSIVE`
(seen while debugging). `NETWORK_LIVE_WITH_HALTED_NODES` is covered by unit tests only; no
built-in scenario has produced it in a real run yet.

## What this does not prove

Every report explicitly states this drill ran on a small, local topology with throwaway keys
and no real network load. It does not prove how a real Mainnet upgrade with many more
validators, real traffic, and real geographic diversity will behave — only that the specific
scenario tested here produced the outcome reported, under these exact conditions.

## Using it in CI

See [`.github/workflows/ci.yml`](.github/workflows/ci.yml) for the unit/integration split; exit
codes follow the verdict (`0` for `NETWORK_UPGRADED`/`NETWORK_LIVE_WITH_HALTED_NODES`, `1` for
`NETWORK_STALLED`/`UPGRADE_NOT_ADOPTED`, `2` for `INCONCLUSIVE`).

## How this was built

This tool's every config field and command-sequencing choice came from a real feasibility spike
that hit — and fixed — four genuine, confirmed bugs before ever reaching a working 3-node
network (a rejected-by-default HTTP port, a config parse error, a missing history archive
requirement, and a one-time-init command being re-run on restart). See [`PLAN.md`](PLAN.md) for
the full history and [`docs/TROUBLESHOOTING.md`](docs/TROUBLESHOOTING.md) for what each one
looked like and how to recognize it again.

## Roadmap

See [`ISSUES_BACKLOG.md`](ISSUES_BACKLOG.md) for scoped, ready-to-pick-up issues, and
[`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) for the fuller design writeup.

## Contributing

See [`CONTRIBUTING.md`](CONTRIBUTING.md) for setup, the PR flow, and how to contribute without
Docker.

## License

MIT — see [`LICENSE`](LICENSE).
