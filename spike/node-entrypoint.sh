#!/bin/sh
# Moved out of docker-compose.yml's inline command string once it grew past a one-liner.
# Runs inside the stellar-core container itself (mounted read-only, invoked via `sh -xc`).
#
# Real bug this exists to fix (see PLAN.md "Spike attempt #8"): `new-db` and `new-hist` are
# ONE-TIME initialization commands. The original inline command ran both unconditionally on
# every container start, including restarts on a preserved data volume (used specifically to
# simulate an operator swapping binaries while keeping their node's existing ledger state).
# `new-hist local` fails outright the second time it's run against an already-initialized
# archive (confirmed live: NEWHIST_EXIT_CODE=1 on every restart, every node, every trial) —
# and re-running `new-db` against an existing database on every restart likely undermined the
# entire "preserve state across a binary swap" design even before that failure was noticed.
set -x

if [ ! -f /data/stellar.db ]; then
  stdbuf -oL -eL stellar-core new-db --conf /config/stellar-core.cfg
  c=$?
  echo "NEWDB_EXIT_CODE=$c"
  [ "$c" -eq 0 ] || exit "$c"

  stdbuf -oL -eL stellar-core new-hist local --conf /config/stellar-core.cfg
  h=$?
  echo "NEWHIST_EXIT_CODE=$h"
  [ "$h" -eq 0 ] || exit "$h"
else
  echo "Existing /data/stellar.db found — skipping new-db/new-hist to preserve state across a binary-version restart"
fi

exec stdbuf -oL -eL stellar-core run --conf /config/stellar-core.cfg
