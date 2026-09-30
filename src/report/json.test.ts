import { describe, expect, it } from 'vitest';
import type { DrillReport } from '../verdict/types.js';
import { toJson, toJsonReport } from './json.js';

function report(overrides: Partial<DrillReport> = {}): DrillReport {
  return {
    scenarioName: 'happy-path',
    scenarioDescription: 'desc',
    verdict: 'NETWORK_UPGRADED',
    verdictExplanation: 'explanation',
    nodeOutcomes: [],
    timeline: [],
    surprises: [],
    snapshots: [],
    ...overrides,
  };
}

describe('toJsonReport', () => {
  it('round-trips through JSON.stringify/parse without losing data', () => {
    const parsed = JSON.parse(JSON.stringify(toJsonReport(report())));
    expect(parsed.schemaVersion).toBe(2);
    expect(parsed.verdict).toBe('NETWORK_UPGRADED');
  });

  it('includes raw snapshots (schema v2) so a real investigation never has to guess field shapes', () => {
    const rawSnapshot = { node: 'node1', timestampMs: 1, reachable: true, state: 'Synced!', protocolVersion: 29, ledgerNum: 5, quorumAgree: 3, quorumNodeCount: 3, raw: { info: { status: ['Armed'] } } };
    const jsonReport = toJsonReport(report({ snapshots: [rawSnapshot] }));
    expect(jsonReport.snapshots).toEqual([rawSnapshot]);
  });

  it('includes the Mainnet coverage note', () => {
    const jsonReport = toJsonReport(report());
    expect(jsonReport.coverageNote).toMatch(/mainnet/i);
  });
});

describe('toJson', () => {
  it('produces valid, parseable JSON', () => {
    expect(() => JSON.parse(toJson(report()))).not.toThrow();
  });
});
