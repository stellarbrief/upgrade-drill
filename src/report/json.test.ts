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
    expect(parsed.schemaVersion).toBe(1);
    expect(parsed.verdict).toBe('NETWORK_UPGRADED');
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
