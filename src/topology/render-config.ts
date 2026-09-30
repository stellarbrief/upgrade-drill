export interface ValidatorKey {
  name: string;
  publicKey: string;
}

export interface RenderConfigInput {
  /** This node's own name — must appear in `allValidators`. */
  selfName: string;
  selfSecretKey: string;
  allValidators: ValidatorKey[];
  networkPassphrase: string;
  quorumThresholdPercent: number;
}

/** Renders a stellar-core config file for one validator in an N-node private network.
 *
 * Every choice here is a real, verified fact from the feasibility spike (see PLAN.md "Verified
 * facts" and the numbered "Spike attempt" sections), not invented:
 * - `PUBLIC_HTTP_PORT=true`: `false` rejects any command whose apparent source isn't literal
 *   loopback, which breaks host-side polling through Docker's port-forwarding (attempt #1).
 * - The node's own QUORUM_SET entry must be the literal `"$self"` token (matching
 *   stellar-core's own documented pattern), not its pubkey spelled out under an explicit name —
 *   naming it twice is a real, confirmed parse error (attempt #3).
 * - `[HISTORY.local]` with `cp`-based get/put/mkdir templates is required for a
 *   `RUN_STANDALONE=false` node to start at all — its absence causes a silent, instant
 *   `exit(1)` with no logged error (attempt #7).
 */
export function renderNodeConfig(input: RenderConfigInput): string {
  const self = input.allValidators.find((v) => v.name === input.selfName);
  if (!self) {
    throw new Error(`renderNodeConfig: "${input.selfName}" is not in allValidators.`);
  }

  const knownPeers = input.allValidators
    .filter((v) => v.name !== input.selfName)
    .map((v) => `"${v.name}:11625"`)
    .join(',');

  const validators = input.allValidators
    .map((v) => (v.name === input.selfName ? '"$self"' : `"${v.publicKey} ${v.name}"`))
    .join(',');

  return `HTTP_PORT=11626
PEER_PORT=11625
PUBLIC_HTTP_PORT=true
NETWORK_PASSPHRASE="${input.networkPassphrase}"
DATABASE="sqlite3:///data/stellar.db"
BUCKET_DIR_PATH="/data/buckets"

NODE_SEED="${input.selfSecretKey} self"
NODE_IS_VALIDATOR=true
RUN_STANDALONE=false
UNSAFE_QUORUM=true
FAILURE_SAFETY=0

KNOWN_PEERS=[${knownPeers}]

[QUORUM_SET]
THRESHOLD_PERCENT=${input.quorumThresholdPercent}
VALIDATORS=[${validators}]

[HISTORY.local]
get="cp /data/history/{0} {1}"
put="cp {0} /data/history/{1}"
mkdir="mkdir -p /data/history/{0}"
`;
}
