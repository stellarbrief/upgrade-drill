import type { NodeSnapshot } from '../verdict/types.js';

async function httpGet(hostPort: number, path: string): Promise<{ reachable: boolean; raw: unknown }> {
  try {
    const response = await fetch(`http://localhost:${hostPort}/${path}`, { signal: AbortSignal.timeout(5000) });
    const raw = await response.json();
    return { reachable: true, raw };
  } catch {
    return { reachable: false, raw: null };
  }
}

/** Polls a node's `/info` endpoint and extracts the real, confirmed fields (see PLAN.md "Spike
 * attempt #7 result" — `protocol_version` is a top-level field, distinct from the unrelated
 * `info.ledger.version`, which is the ledger header's own internal XDR version). */
export async function getInfoSnapshot(node: string, hostPort: number): Promise<NodeSnapshot> {
  const { reachable, raw } = await httpGet(hostPort, 'info');
  const timestampMs = Date.now();

  if (!reachable || typeof raw !== 'object' || raw === null || !('info' in raw)) {
    return {
      node,
      timestampMs,
      reachable,
      state: null,
      protocolVersion: null,
      ledgerNum: null,
      quorumAgree: null,
      quorumNodeCount: null,
      raw,
    };
  }

  const info = (raw as { info: Record<string, unknown> }).info;
  const ledger = info.ledger as Record<string, unknown> | undefined;
  const quorum = info.quorum as Record<string, unknown> | undefined;
  const qset = quorum?.qset as Record<string, unknown> | undefined;
  const transitive = quorum?.transitive as Record<string, unknown> | undefined;

  return {
    node,
    timestampMs,
    reachable: true,
    state: typeof info.state === 'string' ? info.state : null,
    protocolVersion: typeof info.protocol_version === 'number' ? info.protocol_version : null,
    ledgerNum: typeof ledger?.num === 'number' ? ledger.num : null,
    quorumAgree: typeof qset?.agree === 'number' ? qset.agree : null,
    quorumNodeCount: typeof transitive?.node_count === 'number' ? transitive.node_count : null,
    raw,
  };
}

export async function getQuorumRaw(hostPort: number): Promise<unknown> {
  const { raw } = await httpGet(hostPort, 'quorum');
  return raw;
}

/** Fires the real `upgrades` HTTP command, proven live in the spike. `delaySeconds` must give
 * every targeted node enough time to receive this before the scheduled time arrives — a node
 * drops an upgrade step scheduled before "now" per stellar-core's own documented rule (see
 * PLAN.md "Verified facts"). */
export async function fireUpgradeVote(
  hostPort: number,
  protocolVersion: number,
  delaySeconds: number
): Promise<{ upgradeTimeIso: string }> {
  const upgradeTimeIso = new Date(Date.now() + delaySeconds * 1000).toISOString().replace(/\.\d{3}Z$/, 'Z');
  await fetch(
    `http://localhost:${hostPort}/upgrades?mode=set&upgradetime=${upgradeTimeIso}&protocolversion=${protocolVersion}`,
    { signal: AbortSignal.timeout(5000) }
  ).catch(() => undefined);
  return { upgradeTimeIso };
}
