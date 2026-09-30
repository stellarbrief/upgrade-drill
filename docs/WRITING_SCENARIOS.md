# Writing scenarios

A scenario is a YAML file describing a validator topology and a timed sequence of actions.
See `scenarios/*.yml` for the four built-in scenarios.

## Minimal example

```yaml
name: my-scenario
description: What this scenario is for, in one sentence.

topology:
  validators:
    - name: node1
      image: "28"
    - name: node2
      image: "28"
    - name: node3
      image: "28"
  quorumThresholdPercent: 67

timeline:
  - at: 0
    action: { type: wait, seconds: 90 }

observations:
  intervalSeconds: 10

expectations:
  finalProtocolVersion: 29
```

## Top-level fields

- `name`, `description` (required): identify the scenario in reports and `list-scenarios`.
- `topology.validators` (required, at least one): each validator's `name` and starting `image`
  (a `stellar/stellar-core` Docker tag, e.g. `"28"`).
- `topology.quorumThresholdPercent` (optional, default `67`): matches `stellar-core`'s own
  `QUORUM_SET` `THRESHOLD_PERCENT` — note it **rounds up**, so with 3 validators, 67% requires
  all 3 to agree, not 2.
- `timeline` (required, at least one entry): see below.
- `observations.intervalSeconds` (optional, default `10`): how often every node is polled
  during a `wait` action.
- `expectations` (optional): see below.

## Timeline actions

Each entry is `{ at: <seconds, informational>, action: {...} }`. Entries execute in array
order — `at` documents intent but doesn't drive scheduling by itself; `wait` actions are what
actually advances time.

- `{ type: wait, seconds }` — sleeps, polling observations every `intervalSeconds` throughout.
  This is the only action that consumes real time.
- `{ type: start-node, node, image? }` — (re)starts a validator, optionally on a different
  image tag. Its data volume is preserved automatically by Docker — this is how a real
  operator's binary swap is simulated. Omit `image` to just restart on the same one.
- `{ type: stop-node, node }` — stops a validator's container.
- `{ type: set-upgrade, nodes, protocolVersion, upgradeDelaySeconds? }` — fires the real
  `upgrades` HTTP command on each listed node. `upgradeDelaySeconds` (default `45`) must give
  every targeted node enough time to receive the command before the scheduled time arrives —
  `stellar-core` drops an upgrade step scheduled in the past.

## Expectations

Optional, and only ever used to flag a "surprise" in the report — never to force a verdict:

- `finalProtocolVersion`: if every validator stays synced, this is compared against each one's
  final, real, consensus-agreed protocol version (`info.ledger.version` — NOT the top-level
  `info.protocol_version`, which just reflects the running binary's own configured max; see
  `docs/TROUBLESHOOTING.md`) to decide `NETWORK_UPGRADED` vs. `UPGRADE_NOT_ADOPTED`.
- `nodesShouldStaySynced`: a list of node names expected to remain `"Synced!"` through the end.
  A mismatch is reported as a surprise, not silently ignored or forced into the verdict.

## A note on quorum size and thresholds

With `THRESHOLD_PERCENT=67` (the default) and exactly 3 validators, the threshold rounds up to
require all 3 — meaning even one disagreeing validator already blocks that specific vote, as
observed live in the `one-laggard` scenario. To model a scenario where a MINORITY can be lost
without stalling regular consensus (like `quorum-breaker` does), use more validators — e.g. 5,
where 67% rounds to 4, tolerating 1 unavailable node.
