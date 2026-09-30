# Troubleshooting

Real problems hit while building this tool, and what actually fixed them — see the repo's own
`PLAN.md` for the full, blow-by-blow debugging history if you want more detail than this.

## `info.protocol_version` looks like the obvious field for "has this upgraded?" — it isn't

This was the single most important, hardest-won correction in this whole project. Per
stellar-core's own source (`src/main/ApplicationImpl.cpp`'s `getJsonInfo`):

```cpp
info["protocol_version"] = getConfig().LEDGER_PROTOCOL_VERSION;   // the running BINARY's own
                                                                   // configured max version
info["ledger"]["version"] = lcl.header.ledgerVersion;             // the REAL, consensus-agreed
                                                                   // protocol version of the
                                                                   // actual last closed ledger
```

`protocol_version` (top-level) reflects what the currently-running `stellar-core` BINARY is
configured to support — it changes the instant a node restarts on a newer image, before it has
even reconnected to its peers, let alone participated in any real consensus round. It was
caught live: a control scenario that restarted validators onto a newer binary but never fired
any upgrade vote at all STILL showed `protocol_version` jump immediately, while `ledger.num`
and quorum health data were clearly still resetting/catching up.

**`info.ledger.version` is the field that actually answers "has this ledger genuinely adopted
the new protocol via real network consensus."** Every part of this codebase that cares about a
node's real protocol state (`src/driver/http-client.ts`'s `getInfoSnapshot`, and therefore
`src/verdict/engine.ts`'s classification) reads `ledger.version`, never the top-level field. If
you're adding new code that inspects a node's `info` response, don't reach for the
obviously-named field without checking this first.

## A node never responds to `info`/`quorum`/`upgrades` at all

Check `PUBLIC_HTTP_PORT` in the generated config (`src/topology/render-config.ts`). If it's
`false`, `stellar-core` rejects any command whose apparent source isn't literal loopback —
which includes a host process polling through Docker's port-forwarding NAT, since the container
doesn't see that as loopback traffic. This project always sets it `true`, which is safe
specifically because these are disposable, non-internet-exposed test networks.

## A node exits almost instantly (well under a second) with no logged error

This was the hardest bug in this project's own history. Two real, confirmed causes, in the
order to check them:

1. **Missing `[HISTORY]` archive.** `stellar-core` requires "one or more history archives" for
   normal (non-`RUN_STANDALONE`) operation — its absence is a silent, instant `exit(1)` with no
   FATAL log line at all. Check the config has a `[HISTORY.local]` section (or equivalent).
2. **Re-running `new-db`/`new-hist` against an already-initialized volume.** Both are one-time
   initialization commands. If a node's data volume is being preserved across a restart (e.g. a
   `start-node` action with a new `image`, simulating an operator's binary swap), do NOT re-run
   `new-db`/`new-hist` — `new-hist` fails outright the second time. See
   `src/topology/entrypoint-script.ts` for the fix: check for an existing `/data/stellar.db`
   first.

If a node dies instantly and neither of the above explains it, capture real evidence before
guessing further: `docker compose logs <service>` and `docker inspect <container> --format
'{{json .State}}'` (the exact exit code and `OOMKilled` flag rule out or confirm a kill signal
vs. a clean application exit) — see `src/driver/compose.ts`'s `composeLogs` for a starting
point, and PLAN.md's "Spike attempt #5" for the reasoning behind checking `.State` specifically.

## A `set-upgrade` vote seems to have no effect

Check `upgradeDelaySeconds` — `stellar-core` drops an upgrade step scheduled in the past by the
time a node receives it. If your scenario's `wait` before the vote is too short, or the delay
too small, some nodes may never get the command in time.

Also check `topology.quorumThresholdPercent` against your validator count:
`THRESHOLD_PERCENT` rounds UP. With 3 validators at the default 67%, that's `ceil(3 * 0.67) =
3` — meaning ALL 3 must agree, not 2. A single disagreeing validator already blocks that vote
network-wide. This is real, confirmed behavior (see `one-laggard`'s own real captured
observations), not a bug in this tool.

## Everything times out and `docker inspect` shows the container never started

Check `depends_on`/`service_completed_successfully` ordering in the generated Compose file — a
node's `init-<name>` service (which fixes the fresh volume's permissions) must complete before
the node's own container starts, or the node may fail to write to `/data` at all.

## The integration test always skips

`npm run test:integration` skips cleanly (not a failure) whenever `docker info` doesn't
succeed — this is intentional, so contributors without Docker aren't blocked. Run `docker info`
yourself to see why Docker isn't reachable if you expected it to run.
