import { describe, expect, it } from 'vitest';
import type { DrillReport } from '../verdict/types.js';
import { toMarkdown } from './markdown.js';

function report(overrides: Partial<DrillReport> = {}): DrillReport {
  return {
    scenarioName: 'happy-path',
    scenarioDescription: 'All validators upgrade together.',
    verdict: 'NETWORK_UPGRADED',
    verdictExplanation: 'All 3 validators ended synced and on protocol 29.',
    nodeOutcomes: [
      { node: 'node1', finalState: 'Synced!', finalProtocolVersion: 29, explanation: 'node1 ended synced on protocol 29.' },
    ],
    timeline: [{ timestampMs: 1000, node: 'node1', ledgerNum: 10, protocolVersion: 29, state: 'Synced!' }],
    surprises: [],
    snapshots: [],
    ...overrides,
  };
}

describe('toMarkdown', () => {
  it('includes the Mainnet-does-not-prove disclaimer', () => {
    const markdown = toMarkdown(report());
    expect(markdown).toContain('does not prove');
    expect(markdown).toMatch(/mainnet/i);
  });

  it('includes the overall verdict prominently', () => {
    const markdown = toMarkdown(report());
    expect(markdown).toContain('Overall verdict: ✅ NETWORK_UPGRADED');
  });

  it('lists every node outcome in the per-node table', () => {
    const markdown = toMarkdown(
      report({
        nodeOutcomes: [
          { node: 'node1', finalState: 'Synced!', finalProtocolVersion: 29, explanation: 'ok' },
          { node: 'node2', finalState: 'Synced!', finalProtocolVersion: 29, explanation: 'ok' },
        ],
      })
    );
    expect(markdown).toContain('| node1 |');
    expect(markdown).toContain('| node2 |');
  });

  it('includes a Surprises section only when there are surprises', () => {
    const withSurprise = toMarkdown(report({ surprises: ['node3 unexpectedly halted.'] }));
    expect(withSurprise).toContain('Surprises');
    expect(withSurprise).toContain('node3 unexpectedly halted.');

    const withoutSurprise = toMarkdown(report({ surprises: [] }));
    expect(withoutSurprise).not.toContain('Surprises');
  });

  it('never claims success beyond what was tested', () => {
    const markdown = toMarkdown(report());
    expect(markdown.toLowerCase()).not.toMatch(/guaranteed|proven safe/);
  });

  describe('protocol version 0', () => {
    const GENESIS_LABEL = '0 (genesis, never upgraded)';

    it('labels protocol 0 as genesis in the per-node table and the timeline', () => {
      const markdown = toMarkdown(
        report({
          nodeOutcomes: [{ node: 'node1', finalState: 'Synced!', finalProtocolVersion: 0, explanation: 'ok' }],
          timeline: [{ timestampMs: 1000, node: 'node1', ledgerNum: 10, protocolVersion: 0, state: 'Synced!' }],
        })
      );
      expect(markdown).toContain(`| node1 | Synced! | ${GENESIS_LABEL} | ok |`);
      expect(markdown).toContain(`| +0s | node1 | 10 | ${GENESIS_LABEL} | Synced! |`);
    });

    it('shows other protocol versions as plain numbers', () => {
      const markdown = toMarkdown(report());
      expect(markdown).toContain('| node1 | Synced! | 29 |');
      expect(markdown).toContain('| +0s | node1 | 10 | 29 | Synced! |');
      expect(markdown).not.toContain('genesis');
    });

    it('keeps the placeholders for a missing protocol version', () => {
      const markdown = toMarkdown(
        report({
          nodeOutcomes: [{ node: 'node1', finalState: null, finalProtocolVersion: null, explanation: 'no data' }],
          timeline: [{ timestampMs: 1000, node: 'node1', ledgerNum: null, protocolVersion: null, state: null }],
        })
      );
      expect(markdown).toContain('| node1 | unknown | unknown | no data |');
      expect(markdown).toContain('| +0s | node1 | — | — | — |');
      expect(markdown).not.toContain('genesis');
    });
  });
});
