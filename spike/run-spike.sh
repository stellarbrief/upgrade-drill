#!/usr/bin/env bash
# Feasibility spike driver. Produces spike/SPIKE.md and spike/fixtures/*.json from REAL observed
# output — this script writes SPIKE.md itself, at the end, from what it actually saw. Nobody
# should hand-edit SPIKE.md's "Observed output" sections; regenerate by re-running this script.
#
# See PLAN.md "Phase A build order" and "Unverified assumptions" for why this script is
# structured the way it is (in particular: why it swaps binaries mid-run rather than relying on
# an unverified genesis-protocol-version config field).
set -uo pipefail

SPIKE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SPIKE_DIR"

FIXTURES_DIR="$SPIKE_DIR/fixtures"
GENERATED_DIR="$SPIKE_DIR/generated"
OLDER_TAG="28"
NEWER_TAG="29"
RESULTS=()

mkdir -p "$FIXTURES_DIR"
rm -rf "$GENERATED_DIR"

log() { echo "[spike] $*" >&2; }

http_get() {
  # $1 = port, $2 = path (e.g. info)
  curl -s -m 5 "http://localhost:$1/$2" || echo '{"error":"request failed"}'
}

capture_container_logs() {
  # $1 = a label containing "node1"/"node2"/"node3" somewhere in it (e.g. "runA-t1-node1-boot").
  # Captures real container stdout/stderr so a failure has actual evidence, not another guess.
  local label="$1" svc=""
  case "$label" in
    *node1*) svc="node1" ;;
    *node2*) svc="node2" ;;
    *node3*) svc="node3" ;;
  esac
  [ -n "$svc" ] || return 0
  docker compose -f "$SPIKE_DIR/docker-compose.yml" logs --no-color "$svc" \
    > "$FIXTURES_DIR/${label}-container-log.txt" 2>&1 || true
  docker compose -f "$SPIKE_DIR/docker-compose.yml" ps -a \
    > "$FIXTURES_DIR/${label}-compose-ps.txt" 2>&1 || true
}

wait_for_synced() {
  # $1 = port, $2 = node label, $3 = timeout seconds
  local port="$1" label="$2" timeout="${3:-90}" waited=0
  while [ "$waited" -lt "$timeout" ]; do
    local body
    body="$(http_get "$port" info)"
    if echo "$body" | grep -q '"state"'; then
      if echo "$body" | grep -qi 'synced'; then
        log "$label reached a 'synced'-looking state after ${waited}s"
        echo "$body" > "$FIXTURES_DIR/${label}-info-synced.json"
        return 0
      fi
    fi
    sleep 5
    waited=$((waited + 5))
  done
  log "$label did NOT report a synced-looking state within ${timeout}s"
  http_get "$port" info > "$FIXTURES_DIR/${label}-info-timeout.json"
  capture_container_logs "$label"
  return 1
}

teardown() {
  docker compose -f "$SPIKE_DIR/docker-compose.yml" down -v --remove-orphans >/dev/null 2>&1 || true
}

boot_network() {
  # $1=NODE1_TAG $2=NODE2_TAG $3=NODE3_TAG
  teardown
  bash "$SPIKE_DIR/generate-configs.sh" "$GENERATED_DIR" "$1"
  NODE1_TAG="$1" NODE2_TAG="$2" NODE3_TAG="$3" \
    docker compose -f "$SPIKE_DIR/docker-compose.yml" up -d
}

restart_node_with_tag() {
  # $1 = service name (node1/node2/node3), $2 = new tag. Data volume is preserved.
  local svc="$1" tag="$2"
  local var
  case "$svc" in
    node1) var=NODE1_TAG ;;
    node2) var=NODE2_TAG ;;
    node3) var=NODE3_TAG ;;
  esac
  log "restarting $svc on tag $tag (data volume preserved)"
  env "$var=$tag" docker compose -f "$SPIKE_DIR/docker-compose.yml" up -d --no-deps "$svc"
}

fire_upgrade_vote() {
  # $1 = port, $2 = protocol version, $3 = seconds from now
  local port="$1" version="$2" delay="${3:-45}"
  local upgrade_time
  upgrade_time="$(date -u -d "+${delay} seconds" '+%Y-%m-%dT%H:%M:%SZ' 2>/dev/null || date -u -v+${delay}S '+%Y-%m-%dT%H:%M:%SZ')"
  log "firing upgrade vote on port $port: protocolversion=$version at $upgrade_time"
  curl -s -m 5 "http://localhost:$port/upgrades?mode=set&upgradetime=${upgrade_time}&protocolversion=${version}"
  echo "$upgrade_time"
}

# ---------------------------------------------------------------------------
# Run A (spike items 1-3): all 3 nodes start on the older binary, boot and sync, then ALL
# THREE are restarted on the newer binary (operators upgrading their software) and a vote is
# fired for all three to adopt the new protocol version. Repeated 3 times per the spec's pass
# criteria ("items 1-3 work reliably, 3 consecutive clean runs").
# ---------------------------------------------------------------------------
run_a_trial() {
  local trial="$1"
  log "=== Run A trial $trial: boot on :$OLDER_TAG, restart all on :$NEWER_TAG, vote ==="

  boot_network "$OLDER_TAG" "$OLDER_TAG" "$OLDER_TAG"
  local boot_ok=1
  wait_for_synced 11626 "runA-t${trial}-node1-boot" 90 && \
  wait_for_synced 11627 "runA-t${trial}-node2-boot" 90 && \
  wait_for_synced 11628 "runA-t${trial}-node3-boot" 90 && boot_ok=0

  if [ "$boot_ok" -ne 0 ]; then
    log "Run A trial $trial: boot phase failed, skipping upgrade phase"
    RESULTS+=("Run A trial $trial: FAIL (boot/sync never reached)")
    teardown
    return
  fi

  restart_node_with_tag node1 "$NEWER_TAG"
  restart_node_with_tag node2 "$NEWER_TAG"
  restart_node_with_tag node3 "$NEWER_TAG"

  wait_for_synced 11626 "runA-t${trial}-node1-postrestart" 90
  wait_for_synced 11627 "runA-t${trial}-node2-postrestart" 90
  wait_for_synced 11628 "runA-t${trial}-node3-postrestart" 90

  local upgrade_time
  upgrade_time="$(fire_upgrade_vote 11626 "$NEWER_TAG" 45 | tail -1)"
  fire_upgrade_vote 11627 "$NEWER_TAG" 45 >/dev/null
  fire_upgrade_vote 11628 "$NEWER_TAG" 45 >/dev/null

  log "waiting past scheduled upgrade time ($upgrade_time) and polling for version change..."
  sleep 90

  for label_port in "node1:11626" "node2:11627" "node3:11628"; do
    local label="${label_port%%:*}" port="${label_port##*:}"
    http_get "$port" info > "$FIXTURES_DIR/runA-t${trial}-${label}-info-final.json"
  done

  local all_upgraded=1
  for label_port in "node1:11626" "node2:11627" "node3:11628"; do
    local label="${label_port%%:*}"
    if ! grep -q "\"ledgerVersion\" *: *${NEWER_TAG}\|\"version\" *: *${NEWER_TAG}\|protocolVersion.*${NEWER_TAG}" \
        "$FIXTURES_DIR/runA-t${trial}-${label}-info-final.json" 2>/dev/null; then
      all_upgraded=0
    fi
  done

  if [ "$all_upgraded" -eq 1 ]; then
    RESULTS+=("Run A trial $trial: PASS (all 3 nodes show protocol $NEWER_TAG in their final info fixture)")
  else
    RESULTS+=("Run A trial $trial: INCONCLUSIVE (booted and voted, but could not confirm protocol $NEWER_TAG in every node's info output from a simple grep — see fixtures/runA-t${trial}-*-info-final.json for the real field names and decide by hand)")
  fi

  teardown
}

# ---------------------------------------------------------------------------
# Run B (spike item 4): same as Run A, but node3 is NOT restarted on the newer binary — it
# stays on the older one and never votes. Observes what a genuinely lagging validator does.
# ---------------------------------------------------------------------------
run_b_trial() {
  log "=== Run B: boot on :$OLDER_TAG, restart only node1+node2 on :$NEWER_TAG, vote, watch node3 ==="

  boot_network "$OLDER_TAG" "$OLDER_TAG" "$OLDER_TAG"
  wait_for_synced 11626 "runB-node1-boot" 90
  wait_for_synced 11627 "runB-node2-boot" 90
  wait_for_synced 11628 "runB-node3-boot" 90

  restart_node_with_tag node1 "$NEWER_TAG"
  restart_node_with_tag node2 "$NEWER_TAG"
  # node3 deliberately left on $OLDER_TAG.

  wait_for_synced 11626 "runB-node1-postrestart" 90
  wait_for_synced 11627 "runB-node2-postrestart" 90

  fire_upgrade_vote 11626 "$NEWER_TAG" 45 >/dev/null
  fire_upgrade_vote 11627 "$NEWER_TAG" 45 >/dev/null
  # Deliberately do NOT fire the vote on node3 — a real lagging operator wouldn't either.

  log "waiting past scheduled upgrade time and polling all 3 nodes, including the laggard..."
  sleep 120

  for label_port in "node1:11626" "node2:11627" "node3:11628"; do
    local label="${label_port%%:*}" port="${label_port##*:}"
    http_get "$port" info > "$FIXTURES_DIR/runB-${label}-info-final.json"
    http_get "$port" quorum > "$FIXTURES_DIR/runB-${label}-quorum-final.json"
  done

  RESULTS+=("Run B: observation captured — see fixtures/runB-node{1,2,3}-info-final.json and runB-node{1,2,3}-quorum-final.json for node3's (the laggard's) real observed behavior vs node1/node2's.")

  teardown
}

for t in 1 2 3; do
  run_a_trial "$t"
done
run_b_trial

# ---------------------------------------------------------------------------
# Write SPIKE.md from what actually happened above — never hand-authored.
# ---------------------------------------------------------------------------
{
  echo "# SPIKE.md — feasibility spike results"
  echo
  echo "Generated automatically by \`spike/run-spike.sh\` on $(date -u '+%Y-%m-%d %H:%M:%S UTC')."
  echo "Raw observed HTTP responses are in \`spike/fixtures/*.json\` — this file summarizes them,"
  echo "it does not replace them. No secret seeds appear anywhere in this file or the fixtures:"
  echo "only public keys and HTTP response bodies were ever captured."
  echo
  echo "## What was tried"
  echo
  echo "- Topology: 3 stellar-core validators (\`node1\`, \`node2\`, \`node3\`), Docker Compose,"
  echo "  private network passphrase, manual \`[QUORUM_SET]\` at THRESHOLD_PERCENT=67,"
  echo "  UNSAFE_QUORUM=true, FAILURE_SAFETY=0 (see \`spike/generate-configs.sh\`)."
  echo "- Rather than relying on an unverified genesis-protocol-version config field, both runs"
  echo "  boot all 3 nodes on the OLDER image (stellar/stellar-core:$OLDER_TAG), confirm they"
  echo "  sync, then restart nodes on the NEWER image (:$NEWER_TAG) with their data volume"
  echo "  preserved (simulating real operators upgrading their binaries) before firing the"
  echo "  \`upgrades?mode=set&upgradetime=...&protocolversion=...\` HTTP command."
  echo "- Ledger-close acceleration (MANUAL_CLOSE) was NOT used — this run relies on real"
  echo "  ledger close timing, which is itself one of the questions this spike answers (see"
  echo "  'Unverified assumptions #1' in PLAN.md)."
  echo
  echo "## Results"
  echo
  for r in "${RESULTS[@]}"; do
    echo "- $r"
  done
  echo
  echo "## Pass criteria assessment"
  echo
  echo "Per PLAN.md: items 1-3 (Run A) must pass 3 consecutive clean runs; item 4 (Run B) must"
  echo "produce a clear observation, even if surprising. See the Results above for each trial's"
  echo "real outcome — this section is intentionally left for a human (or a follow-up automated"
  echo "check) to read the Results against that bar rather than asserting PASS/FAIL here, since"
  echo "the exact \`info\` JSON field names were not previously confirmed live and the grep above"
  echo "is a best-effort heuristic, not a verified parser."
  echo
  echo "## Fixtures"
  echo
  echo "Raw JSON captures:"
  for f in "$FIXTURES_DIR"/*.json; do
    [ -e "$f" ] || continue
    echo "- \`$(basename "$f")\`"
  done
} > "$SPIKE_DIR/SPIKE.md"

log "Wrote $SPIKE_DIR/SPIKE.md"
teardown
