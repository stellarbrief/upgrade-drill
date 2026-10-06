# Changelog

## 0.1.0

First tagged version.

### What exists
- CLI: `run <scenario>`, `list-scenarios`, `validate`, and `--dry-run` (no Docker needed; uses
  clearly fake placeholder keys). Exit codes: `0` upgraded or live with halted nodes, `1`
  stalled or not adopted, `2` inconclusive.
- Scenarios in YAML: a topology of real `stellar-core` validators plus a timeline of `wait`,
  `start-node`, `stop-node` and `set-upgrade` actions.
- Five verdicts: `NETWORK_UPGRADED`, `UPGRADE_NOT_ADOPTED`, `NETWORK_LIVE_WITH_HALTED_NODES`,
  `NETWORK_STALLED`, `INCONCLUSIVE`, classified from each node's real `info.ledger.version` and
  sync state.
- Four built-in scenarios and Markdown and JSON reports.

### Verified
- Unit tests for the scenario schema, topology generation, timeline, verdicts and reports.
- Real runs of all four built-in scenarios (the manual `Verify all scenarios` workflow) and the
  `happy-path` integration test in CI. Observed verdicts: `NETWORK_UPGRADED`,
  `UPGRADE_NOT_ADOPTED` (twice), `NETWORK_STALLED`.

### Known limitations
- Drills start from a fresh network at ledger protocol 0, not from a Mainnet-like protocol. The
  README's "Protocol model" section explains how to read a report.
- `NETWORK_LIVE_WITH_HALTED_NODES` has unit-test coverage only; no scenario has produced it
  in a real run.
- With 3 validators at the default 67% threshold, all 3 must agree, so one non-voting validator
  blocks adoption for the whole network.
- Requires Docker; a full scenario takes roughly 6 to 7 minutes. Local use only; not affiliated
  with SDF; not for production.
