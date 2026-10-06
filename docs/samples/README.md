# Samples

Real reports from real runs of the four built-in scenarios, kept so results can be inspected
without Docker. Nothing here is hand-written or edited.

| Scenario | Report | Verdict |
| --- | --- | --- |
| `happy-path` | `happy-path.report.md` / `.json` | `NETWORK_UPGRADED` (0 to 29) |
| `one-laggard` | `one-laggard.report.md` / `.json` | `UPGRADE_NOT_ADOPTED` (stays at 0) |
| `quorum-breaker` | `quorum-breaker.report.md` / `.json` | `NETWORK_STALLED` |
| `mismatched-vote` | `mismatched-vote.report.md` / `.json` | `UPGRADE_NOT_ADOPTED` (stays at 0) |

`provenance.json` records the workflow run, commit and command. The JSON reports use
`schemaVersion: 2` and include every raw per-node observation (about 100 per scenario), so a run
can be replayed or re-classified. The older `fixtures/` directory holds a few raw node
responses from the original feasibility spike.

If you add a sample, add its provenance with it and keep the files exactly as the tool produced
them. Read `docs/TROUBLESHOOTING.md` and the README's "Protocol model" section before
interpreting a final protocol of `0`.
