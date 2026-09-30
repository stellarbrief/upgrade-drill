import type { Scenario } from '../scenario/schema.js';
import type { DrillReport, NodeOutcome, NodeSnapshot, TimelineRow, Verdict } from './types.js';

/** Classifies a drill's outcome from its real observed snapshots. Never asserts a verdict
 * beyond what was actually captured — missing data for any validator produces INCONCLUSIVE
 * rather than guessing, per the spec's own "never report success when data is missing" rule. */
export function classifyDrill(scenario: Scenario, snapshots: NodeSnapshot[]): DrillReport {
  const nodeNames = scenario.topology.validators.map((v) => v.name);
  const latestByNode = latestSnapshotPerNode(snapshots);

  const missing = nodeNames.filter((n) => !latestByNode.has(n));
  if (missing.length > 0) {
    return buildReport(
      scenario,
      'INCONCLUSIVE',
      `No observation was ever captured for: ${missing.join(', ')}.`,
      nodeNames,
      latestByNode,
      snapshots
    );
  }

  const finals = nodeNames.map((n) => latestByNode.get(n)!);
  const synced = finals.filter((f) => f.state === 'Synced!');
  const notSynced = finals.filter((f) => f.state !== 'Synced!');

  let verdict: Verdict;
  let explanation: string;

  if (notSynced.length === 0) {
    const protocolVersions = new Set(finals.map((f) => f.protocolVersion).filter((v) => v !== null));
    const target = scenario.expectations?.finalProtocolVersion;

    if (target !== undefined && finals.every((f) => f.protocolVersion === target)) {
      verdict = 'NETWORK_UPGRADED';
      explanation = `All ${finals.length} validators ended synced and on protocol ${target}.`;
    } else if (target === undefined) {
      verdict = 'INCONCLUSIVE';
      explanation =
        'All validators stayed synced, but this scenario declared no expected finalProtocolVersion to compare the outcome against.';
    } else {
      verdict = 'UPGRADE_NOT_ADOPTED';
      explanation = `All validators stayed synced, but did not all reach protocol ${target} (observed: ${[...protocolVersions].join(', ') || 'none reported'}).`;
    }
  } else if (synced.length > 0) {
    verdict = 'NETWORK_LIVE_WITH_HALTED_NODES';
    explanation = `${synced.length} of ${finals.length} validators remained synced; ${notSynced.map((f) => f.node).join(', ')} did not.`;
  } else {
    verdict = 'NETWORK_STALLED';
    explanation = `None of the ${finals.length} validators ended in a synced state.`;
  }

  return buildReport(scenario, verdict, explanation, nodeNames, latestByNode, snapshots);
}

function latestSnapshotPerNode(snapshots: NodeSnapshot[]): Map<string, NodeSnapshot> {
  const latest = new Map<string, NodeSnapshot>();
  for (const s of snapshots) {
    const prev = latest.get(s.node);
    if (!prev || s.timestampMs > prev.timestampMs) latest.set(s.node, s);
  }
  return latest;
}

function buildReport(
  scenario: Scenario,
  verdict: Verdict,
  verdictExplanation: string,
  nodeNames: string[],
  latestByNode: Map<string, NodeSnapshot>,
  snapshots: NodeSnapshot[]
): DrillReport {
  const nodeOutcomes: NodeOutcome[] = nodeNames.map((node) => {
    const snap = latestByNode.get(node) ?? null;
    return {
      node,
      finalState: snap?.state ?? null,
      finalProtocolVersion: snap?.protocolVersion ?? null,
      explanation: snap ? explainNode(snap) : `No observation was ever captured for ${node}.`,
    };
  });

  const timeline: TimelineRow[] = snapshots
    .slice()
    .sort((a, b) => a.timestampMs - b.timestampMs)
    .map((s) => ({
      timestampMs: s.timestampMs,
      node: s.node,
      ledgerNum: s.ledgerNum,
      protocolVersion: s.protocolVersion,
      state: s.state,
    }));

  return {
    scenarioName: scenario.name,
    scenarioDescription: scenario.description,
    verdict,
    verdictExplanation,
    nodeOutcomes,
    timeline,
    surprises: findSurprises(scenario, latestByNode),
    snapshots,
  };
}

function explainNode(s: NodeSnapshot): string {
  if (!s.reachable) return `${s.node} was unreachable at the last observation.`;
  if (s.state === 'Synced!') {
    const version = s.protocolVersion !== null ? ` on protocol ${s.protocolVersion}` : '';
    const quorum =
      s.quorumAgree !== null && s.quorumNodeCount !== null
        ? ` (quorum agreement ${s.quorumAgree}/${s.quorumNodeCount})`
        : '';
    return `${s.node} ended synced${version}${quorum}.`;
  }
  return `${s.node} ended in state "${s.state ?? 'unknown'}", not synced.`;
}

/** Compares real observations against the scenario's declared `expectations` — only flags a
 * surprise for something the scenario author actually stated an expectation about. */
function findSurprises(scenario: Scenario, latestByNode: Map<string, NodeSnapshot>): string[] {
  const surprises: string[] = [];
  const expectations = scenario.expectations;
  if (!expectations) return surprises;

  if (expectations.finalProtocolVersion !== undefined) {
    for (const [node, snap] of latestByNode) {
      if (snap.protocolVersion !== null && snap.protocolVersion !== expectations.finalProtocolVersion) {
        surprises.push(
          `Expected ${node} to end on protocol ${expectations.finalProtocolVersion}, but it reported ${snap.protocolVersion}.`
        );
      }
    }
  }

  if (expectations.nodesShouldStaySynced) {
    for (const node of expectations.nodesShouldStaySynced) {
      const snap = latestByNode.get(node);
      if (snap && snap.state !== 'Synced!') {
        surprises.push(`Expected ${node} to stay synced, but it ended in state "${snap.state ?? 'unknown'}".`);
      }
    }
  }

  return surprises;
}
