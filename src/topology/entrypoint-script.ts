/** The exact, proven entrypoint script from the feasibility spike (see PLAN.md "Spike attempt
 * #8") — `new-db`/`new-hist` are one-time initialization commands; running them again on a
 * restart against a preserved data volume (how a real operator's binary swap is simulated)
 * breaks `new-hist` outright. This checks for an existing database first. */
export const NODE_ENTRYPOINT_SCRIPT = `#!/bin/sh
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
`;

/** Root-owned, empty named volumes need their permissions opened before a non-root
 * stellar-core process can write to them — see PLAN.md "Spike attempt #2 result". */
export const INIT_SCRIPT = 'mkdir -p /data/buckets && chmod -R 777 /data';
