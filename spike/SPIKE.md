# SPIKE.md — feasibility spike results

Generated automatically by `spike/run-spike.sh` on 2026-09-30 15:43:49 UTC.
Raw observed HTTP responses are in `spike/fixtures/*.json` — this file summarizes them,
it does not replace them. No secret seeds appear anywhere in this file or the fixtures:
only public keys and HTTP response bodies were ever captured.

## What was tried

- Topology: 3 stellar-core validators (`node1`, `node2`, `node3`), Docker Compose,
  private network passphrase, manual `[QUORUM_SET]` at THRESHOLD_PERCENT=67,
  UNSAFE_QUORUM=true, FAILURE_SAFETY=0 (see `spike/generate-configs.sh`).
- Rather than relying on an unverified genesis-protocol-version config field, both runs
  boot all 3 nodes on the OLDER image (stellar/stellar-core:28), confirm they
  sync, then restart nodes on the NEWER image (:29) with their data volume
  preserved (simulating real operators upgrading their binaries) before firing the
  `upgrades?mode=set&upgradetime=...&protocolversion=...` HTTP command.
- Ledger-close acceleration (MANUAL_CLOSE) was NOT used — this run relies on real
  ledger close timing, which is itself one of the questions this spike answers (see
  'Unverified assumptions #1' in PLAN.md).

## Results

- Run A trial 1: FAIL (boot/sync never reached)
- Run A trial 2: FAIL (boot/sync never reached)
- Run A trial 3: FAIL (boot/sync never reached)
- Run B: observation captured — see fixtures/runB-node{1,2,3}-info-final.json and runB-node{1,2,3}-quorum-final.json for node3's (the laggard's) real observed behavior vs node1/node2's.

## Pass criteria assessment

Per PLAN.md: items 1-3 (Run A) must pass 3 consecutive clean runs; item 4 (Run B) must
produce a clear observation, even if surprising. See the Results above for each trial's
real outcome — this section is intentionally left for a human (or a follow-up automated
check) to read the Results against that bar rather than asserting PASS/FAIL here, since
the exact `info` JSON field names were not previously confirmed live and the grep above
is a best-effort heuristic, not a verified parser.

## Fixtures

Raw JSON captures:
- `runA-t1-node1-boot-info-timeout.json`
- `runA-t2-node1-boot-info-timeout.json`
- `runA-t3-node1-boot-info-timeout.json`
- `runB-node1-boot-info-timeout.json`
- `runB-node1-info-final.json`
- `runB-node1-postrestart-info-timeout.json`
- `runB-node1-quorum-final.json`
- `runB-node2-boot-info-timeout.json`
- `runB-node2-info-final.json`
- `runB-node2-postrestart-info-timeout.json`
- `runB-node2-quorum-final.json`
- `runB-node3-boot-info-timeout.json`
- `runB-node3-info-final.json`
- `runB-node3-quorum-final.json`
