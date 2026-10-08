# Troubleshooting

The first five entries cover problems a new user is most likely to meet when setting up and
doing a first run. The rest are real problems hit while building this tool, and what actually
fixed them — see the repo's own `PLAN.md` for the full, blow-by-blow debugging history if you
want more detail than this.

## A real run fails straight away with `Failed to spawn docker` or a `docker run ... gen-seed` error

**Cause:** Docker is not installed, or its daemon is not running. The first Docker call in a real
run is `docker run --rm stellar/stellar-core:<tag> gen-seed`, once per validator
(`genSeed` in `src/driver/gen-seed.ts`), before any container is started. If the `docker`
command cannot be found you get `Failed to spawn docker: ...`; if it is found but cannot do
the work you get `docker run --rm ... gen-seed exited with code N:` followed by Docker's own
message.

**What to do:** run `docker info`. If that fails, start Docker (Docker Desktop, or the Docker
service on Linux) and try again. To look at what a scenario would do without Docker at all, use
`--dry-run` (see the README); it uses placeholder keys and starts nothing.

## The run gets past `gen-seed` but then fails at `docker compose ... up -d`

**Cause:** The Docker Compose plugin (v2 or newer) is missing. Every control call this tool makes is the plugin form,
`docker compose ...` (`up -d`, `stop`, `down -v --remove-orphans` and `logs`, all in
`src/driver/compose.ts`). The older standalone `docker-compose` command, with a hyphen, is never
called, so having it installed does not help. The error looks like
`docker compose -f <work-dir>/docker-compose.yml up -d exited with code 1: ...`.

**What to do:** run `docker compose version`. It should print a version number; an error means
the plugin is not available. Install it by following
[Docker's Compose installation guide](https://docs.docker.com/compose/install/) (it comes with
Docker Desktop).

## `docker compose up` fails because a port is already in use

**Cause:** each validator publishes its HTTP port on the host, starting at 11626 and counting up
by one per validator (`assignPorts` in `src/topology/compose.ts`): 11626 to 11628 for the
three-validator scenarios, 11626 to 11630 for `quorum-breaker`. Something else is already using
one of those ports: another program, or containers left over from an earlier drill.

**What to do:** find what holds the port, for example `docker ps` (look for `11626` in the
`PORTS` column) or `lsof -i :11626` on macOS and Linux, and stop it. The starting port is fixed
in the code, so there is no option to move it. This tool tears the network down in a `finally`
block (`src/runner/run.ts`), but nothing in `src/` handles `SIGINT`/`SIGTERM`, so interrupting a
run can leave containers behind. To remove them, run the same command the tool uses for
cleanup against the run's own Compose file:
`docker compose -f <work-dir>/docker-compose.yml down -v --remove-orphans`.

## The first run is very slow and prints almost nothing

**Cause:** the first time, Docker has to download the `stellar/stellar-core` images. Most
built-in scenarios use two image tags, `28` and `29` (`happy-path`, `one-laggard`,
`mismatched-vote`); `quorum-breaker` uses only `29`. The tag is set per validator in the scenario
file. A real run prints nothing but `Running "<scenario name>"...` until the final report
(`src/cli/index.ts`), so a long pull looks like a hang. Later runs reuse the downloaded images.

**What to do:** wait, or download the images first with `docker pull stellar/stellar-core:28` and
`docker pull stellar/stellar-core:29`.

## Where the work directory and the keys are left after a run

**What is left:** the tool writes everything it generates into a work directory:
`configs/<node>.cfg`, `docker-compose.yml` and `entrypoint.sh`. By default that is a new
`upgrade-drill-XXXXXX` directory in the system temporary directory (`/tmp` on Linux); with
`--work-dir <dir>` it is the directory you give (`src/cli/index.ts`). The directory is **not**
deleted after a run. Each `configs/<node>.cfg` holds that validator's secret key on its
`NODE_SEED` line, because `stellar-core` needs it there (see `SECURITY.md`). The keys are
throwaway, created fresh with `gen-seed` for every run for a private network, but do not commit
or share the directory.

**How to find and remove it:** a real run does not print the path (only `--dry-run` prints
`Generated files in:`). Either pass `--work-dir` yourself, or look for it with
`ls -d "${TMPDIR:-/tmp}"/upgrade-drill-*`, then delete it with `rm -rf` when you are finished.
The containers and their data volumes are already removed by the teardown
(`down -v --remove-orphans`); only this directory stays.

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
