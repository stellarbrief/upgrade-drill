#!/usr/bin/env bash
# Generates 3 fresh stellar-core validator configs for the feasibility spike.
# Real throwaway keys only, generated fresh every run via the actual stellar-core binary's
# own `gen-seed` command (never hand-picked, never reused) — see PLAN.md "Safety rules".
set -euo pipefail

OUT_DIR="${1:?usage: generate-configs.sh <output-dir> <image-tag>}"
IMAGE_TAG="${2:?usage: generate-configs.sh <output-dir> <image-tag>}"
IMAGE="stellar/stellar-core:${IMAGE_TAG}"

mkdir -p "$OUT_DIR"

# Our own private test-network passphrase — never a real network's, per PLAN.md.
PASSPHRASE="upgrade-drill spike network ; 2026-09-30"

gen_seed() {
  # `stellar-core gen-seed` prints:
  #   Secret seed: S...
  #   Public: G...
  docker run --rm "$IMAGE" gen-seed
}

echo "Generating 3 fresh validator keypairs using $IMAGE ..." >&2

declare -a SECRETS PUBLICS
for i in 1 2 3; do
  OUTPUT="$(gen_seed)"
  SECRET="$(echo "$OUTPUT" | grep 'Secret seed:' | awk '{print $3}')"
  PUBLIC="$(echo "$OUTPUT" | grep 'Public:' | awk '{print $2}')"
  if [ -z "$SECRET" ] || [ -z "$PUBLIC" ]; then
    echo "FATAL: could not parse gen-seed output for node$i. Raw output was:" >&2
    echo "$OUTPUT" >&2
    echo "(This means gen-seed's output format differs from what this script expects —" >&2
    echo " a real unverified-assumption failure, not a transient error. See PLAN.md.)" >&2
    exit 1
  fi
  SECRETS[$i]="$SECRET"
  PUBLICS[$i]="$PUBLIC"
  echo "node$i public key: $PUBLIC" >&2
done

write_config() {
  local node_num="$1"
  local self_secret="$2"
  local path="$OUT_DIR/node${node_num}.cfg"

  local peers=()
  for j in 1 2 3; do
    if [ "$j" != "$node_num" ]; then
      peers+=("\"node${j}:11625\"")
    fi
  done
  local known_peers
  known_peers="$(IFS=,; echo "${peers[*]}")"

  cat > "$path" <<EOF
HTTP_PORT=11626
PEER_PORT=11625
# PUBLIC_HTTP_PORT=false rejects any command whose apparent source isn't localhost — which
# includes the CI runner's own curl calls arriving through Docker's port-forwarding NAT, not
# literal loopback traffic from the container's own point of view. Confirmed live: with this
# set to false, every info/quorum/upgrades call from the host returned nothing at all (real
# spike run, 2026-09-30 CI). Safe to open here since this network is disposable and never
# exposed beyond the CI runner's own Docker host — see PLAN.md's safety rules.
PUBLIC_HTTP_PORT=true
NETWORK_PASSPHRASE="$PASSPHRASE"
DATABASE="sqlite3:///data/stellar.db"
BUCKET_DIR_PATH="/data/buckets"

NODE_SEED="$self_secret self"
NODE_IS_VALIDATOR=true
RUN_STANDALONE=false
UNSAFE_QUORUM=true
FAILURE_SAFETY=0

KNOWN_PEERS=[$known_peers]

[QUORUM_SET]
THRESHOLD_PERCENT=67
VALIDATORS=[
"${PUBLICS[1]} node1",
"${PUBLICS[2]} node2",
"${PUBLICS[3]} node3"
]
EOF
  echo "wrote $path" >&2
}

for i in 1 2 3; do
  write_config "$i" "${SECRETS[$i]}"
done

echo "Public keys (safe to log; secrets were never written to stdout above):" >&2
for i in 1 2 3; do
  echo "  node$i: ${PUBLICS[$i]}" >&2
done
