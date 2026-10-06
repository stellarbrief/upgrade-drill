import type { DrillReport, Verdict } from '../verdict/types.js';

const VERDICT_EMOJI: Record<Verdict, string> = {
  NETWORK_UPGRADED: '✅',
  NETWORK_LIVE_WITH_HALTED_NODES: '⚠️',
  NETWORK_STALLED: '🛑',
  UPGRADE_NOT_ADOPTED: '🔶',
  INCONCLUSIVE: '❓',
};

export function toMarkdown(report: DrillReport): string {
  const lines: string[] = [];

  lines.push(`# Upgrade Drill: ${report.scenarioName}`, '', report.scenarioDescription, '');
  lines.push(`**Overall verdict: ${VERDICT_EMOJI[report.verdict]} ${report.verdict}**`, '', report.verdictExplanation, '');

  lines.push('## Per-node outcome', '', '| Node | Final state | Protocol version | Explanation |', '| --- | --- | --- | --- |');
  for (const outcome of report.nodeOutcomes) {
    lines.push(
      `| ${outcome.node} | ${outcome.finalState ?? 'unknown'} | ${outcome.finalProtocolVersion ?? 'unknown'} | ${outcome.explanation.replace(/\|/g, '\\|')} |`
    );
  }
  lines.push('');

  if (report.surprises.length > 0) {
    lines.push('## Surprises (compared to this scenario\'s declared expectations)', '');
    for (const surprise of report.surprises) lines.push(`- ${surprise}`);
    lines.push('');
  }

  lines.push('## Timeline', '', '| Time | Node | Ledger | Protocol | State |', '| --- | --- | --- | --- | --- |');
  const start = report.timeline[0]?.timestampMs ?? 0;
  for (const row of report.timeline) {
    const elapsedSeconds = Math.round((row.timestampMs - start) / 1000);
    lines.push(
      `| +${elapsedSeconds}s | ${row.node} | ${row.ledgerNum ?? '—'} | ${row.protocolVersion ?? '—'} | ${row.state ?? '—'} |`
    );
  }
  lines.push('');

  lines.push('## What this means for operators', '', whatThisMeans(report.verdict), '');
  lines.push(
    '## What this does not prove',
    '',
    'This drill ran on a small, local topology with throwaway keys and no real network load. ' +
      'It does not prove how a real Mainnet upgrade with many more validators, real traffic, and ' +
      'real geographic/network diversity will behave — only that the specific scenario tested ' +
      'here produced the outcome above, under these exact conditions.',
    ''
  );

  return lines.join('\n');
}

function whatThisMeans(verdict: Verdict): string {
  switch (verdict) {
    case 'NETWORK_UPGRADED':
      return 'Every validator in this drill adopted the new protocol version and stayed in consensus. No action needed for the scenario tested — consider widening the scenario (more validators, more realistic quorum) before treating this as a green light.';
    case 'NETWORK_LIVE_WITH_HALTED_NODES':
      return 'The network as a whole stayed live, but at least one validator fell out of sync or was unreachable at the end. If that validator matters to your own quorum, investigate before a real upgrade — a validator that quietly falls behind can surprise you later.';
    case 'NETWORK_STALLED':
      return 'No validator ended in a synced state — the network as a whole stopped closing ledgers, not just the upgrade vote. This is the most severe outcome: investigate the quorum configuration and validator availability immediately.';
    case 'UPGRADE_NOT_ADOPTED':
      return 'Every validator stayed healthy and in consensus, but the upgrade itself was not adopted network-wide during this drill. This usually means the quorum could not agree on one shared upgrade value — check for mismatched upgrade times/versions across validators.';
    case 'INCONCLUSIVE':
      return 'There is not enough real observed data to state a confident verdict. Re-run the drill, or check the raw fixtures for what went wrong collecting observations — this is not the same as saying the upgrade succeeded or failed.';
  }
}
