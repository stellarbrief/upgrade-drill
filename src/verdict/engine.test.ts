import { describe, expect, it } from 'vitest';
import type { Scenario } from '../scenario/schema.js';
import { classifyDrill } from './engine.js';
import type { NodeSnapshot } from './types.js';

function scenario(overrides: Partial<Scenario> = {}): Scenario {
  return {
    name: 'test',
    description: 'test scenario',
    topology: {
      validators: [
        { name: 'node1', image: '28' },
        { name: 'node2', image: '28' },
        { name: 'node3', image: '28' },
      ],
      quorumThresholdPercent: 67,
    },
    timeline: [{ at: 0, action: { type: 'wait', seconds: 30 } }],
    observations: { intervalSeconds: 10 },
    ...overrides,
  };
}

function snap(node: string, overrides: Partial<NodeSnapshot> = {}): NodeSnapshot {
  return {
    node,
    timestampMs: 1000,
    reachable: true,
    state: 'Synced!',
    protocolVersion: 28,
    ledgerNum: 10,
    quorumAgree: 3,
    quorumNodeCount: 3,
    raw: {},
    ...overrides,
  };
}

describe('classifyDrill', () => {
  it('returns NETWORK_UPGRADED when all nodes end synced on the expected target version', () => {
    const s = scenario({ expectations: { finalProtocolVersion: 29 } });
    const snapshots = [snap('node1', { protocolVersion: 29 }), snap('node2', { protocolVersion: 29 }), snap('node3', { protocolVersion: 29 })];
    const report = classifyDrill(s, snapshots);
    expect(report.verdict).toBe('NETWORK_UPGRADED');
  });

  it('returns UPGRADE_NOT_ADOPTED when all nodes stay synced but not all reach the target version', () => {
    const s = scenario({ expectations: { finalProtocolVersion: 29 } });
    const snapshots = [snap('node1', { protocolVersion: 29 }), snap('node2', { protocolVersion: 29 }), snap('node3', { protocolVersion: 28 })];
    const report = classifyDrill(s, snapshots);
    expect(report.verdict).toBe('UPGRADE_NOT_ADOPTED');
  });

  it('returns NETWORK_LIVE_WITH_HALTED_NODES when some but not all nodes end synced', () => {
    const s = scenario();
    const snapshots = [snap('node1'), snap('node2'), snap('node3', { state: 'Catching up!', reachable: true })];
    const report = classifyDrill(s, snapshots);
    expect(report.verdict).toBe('NETWORK_LIVE_WITH_HALTED_NODES');
  });

  it('returns NETWORK_STALLED when no node ends synced', () => {
    const s = scenario();
    const snapshots = [
      snap('node1', { state: 'Catching up!' }),
      snap('node2', { reachable: false, state: null }),
      snap('node3', { reachable: false, state: null }),
    ];
    const report = classifyDrill(s, snapshots);
    expect(report.verdict).toBe('NETWORK_STALLED');
  });

  it('returns INCONCLUSIVE when a validator has no observation at all', () => {
    const s = scenario();
    const snapshots = [snap('node1'), snap('node2')]; // node3 never observed
    const report = classifyDrill(s, snapshots);
    expect(report.verdict).toBe('INCONCLUSIVE');
    expect(report.verdictExplanation).toContain('node3');
  });

  it('returns INCONCLUSIVE when all synced but no finalProtocolVersion expectation was declared', () => {
    const s = scenario(); // no expectations
    const snapshots = [snap('node1'), snap('node2'), snap('node3')];
    const report = classifyDrill(s, snapshots);
    expect(report.verdict).toBe('INCONCLUSIVE');
  });

  it('uses the LATEST snapshot per node, not the first', () => {
    const s = scenario({ expectations: { finalProtocolVersion: 29 } });
    const snapshots = [
      snap('node1', { timestampMs: 1000, protocolVersion: 28 }),
      snap('node1', { timestampMs: 2000, protocolVersion: 29 }),
      snap('node2', { protocolVersion: 29 }),
      snap('node3', { protocolVersion: 29 }),
    ];
    const report = classifyDrill(s, snapshots);
    expect(report.verdict).toBe('NETWORK_UPGRADED');
  });

  it('flags a surprise when a node expected to stay synced does not', () => {
    const s = scenario({ expectations: { nodesShouldStaySynced: ['node3'] } });
    const snapshots = [snap('node1'), snap('node2'), snap('node3', { state: 'Catching up!' })];
    const report = classifyDrill(s, snapshots);
    expect(report.surprises.some((msg) => msg.includes('node3'))).toBe(true);
  });

  it('never flags a surprise for something the scenario declared no expectation about', () => {
    const s = scenario(); // no expectations at all
    const snapshots = [snap('node1'), snap('node2'), snap('node3', { state: 'Catching up!' })];
    const report = classifyDrill(s, snapshots);
    expect(report.surprises).toHaveLength(0);
  });

  it('includes a per-node outcome for every validator in topology order', () => {
    const s = scenario();
    const snapshots = [snap('node1'), snap('node2'), snap('node3')];
    const report = classifyDrill(s, snapshots);
    expect(report.nodeOutcomes.map((o) => o.node)).toEqual(['node1', 'node2', 'node3']);
  });

  it('sorts the timeline by timestamp regardless of input order', () => {
    const s = scenario();
    const snapshots = [snap('node1', { timestampMs: 3000 }), snap('node2', { timestampMs: 1000 }), snap('node3', { timestampMs: 2000 })];
    const report = classifyDrill(s, snapshots);
    expect(report.timeline.map((t) => t.timestampMs)).toEqual([1000, 2000, 3000]);
  });
});
