/** One poll of one node's `info` HTTP endpoint at one point in the drill. */
export interface NodeSnapshot {
  node: string;
  timestampMs: number;
  /** Null when the request itself failed (network/tool error, not a statement about the node). */
  reachable: boolean;
  /** stellar-core's own top-level `info.state` field, e.g. "Synced!", "Catching up!". Null if
   * unreachable or the field was missing from the response. */
  state: string | null;
  /** The real, confirmed `info.protocol_version` field — see PLAN.md "Spike attempt #7
   * result". Null if unreachable or missing. */
  protocolVersion: number | null;
  ledgerNum: number | null;
  quorumAgree: number | null;
  quorumNodeCount: number | null;
  /** The raw parsed JSON response, kept for the report/debugging — never assume a field beyond
   * what's explicitly typed above without re-checking the real response shape. */
  raw: unknown;
}

export type Verdict =
  | 'NETWORK_UPGRADED'
  | 'NETWORK_LIVE_WITH_HALTED_NODES'
  | 'NETWORK_STALLED'
  | 'UPGRADE_NOT_ADOPTED'
  | 'INCONCLUSIVE';

export interface NodeOutcome {
  node: string;
  finalState: string | null;
  finalProtocolVersion: number | null;
  /** Plain-language explanation grounded in the observed snapshots — never asserted beyond
   * what was actually seen. */
  explanation: string;
}

export interface TimelineRow {
  timestampMs: number;
  node: string;
  ledgerNum: number | null;
  protocolVersion: number | null;
  state: string | null;
}

export interface DrillReport {
  scenarioName: string;
  scenarioDescription: string;
  verdict: Verdict;
  verdictExplanation: string;
  nodeOutcomes: NodeOutcome[];
  timeline: TimelineRow[];
  /** Real, observed mismatches against the scenario's declared `expectations` — never inferred
   * beyond what the scenario author actually stated an expectation for. */
  surprises: string[];
  /** All raw snapshots — the report renderers only show a filtered timeline, but the JSON
   * report includes everything for anyone who wants to dig further. */
  snapshots: NodeSnapshot[];
}
