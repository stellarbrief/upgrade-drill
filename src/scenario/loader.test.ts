import { describe, expect, it } from 'vitest';
import { ScenarioError, parseScenario } from './loader.js';

const validScenario = {
  name: 'test-scenario',
  description: 'A scenario for testing.',
  topology: {
    validators: [
      { name: 'node1', image: '28' },
      { name: 'node2', image: '28' },
    ],
  },
  timeline: [{ at: 0, action: { type: 'wait', seconds: 30 } }],
};

describe('parseScenario', () => {
  it('accepts a minimal valid scenario and fills in defaults', () => {
    const scenario = parseScenario(validScenario);
    expect(scenario.topology.quorumThresholdPercent).toBe(67);
    expect(scenario.observations.intervalSeconds).toBe(10);
  });

  it('rejects a scenario with no validators', () => {
    const bad = { ...validScenario, topology: { validators: [] } };
    expect(() => parseScenario(bad)).toThrow(ScenarioError);
  });

  it('rejects a scenario with no timeline entries', () => {
    const bad = { ...validScenario, timeline: [] };
    expect(() => parseScenario(bad)).toThrow(ScenarioError);
  });

  it('rejects a start-node action referencing an undeclared node', () => {
    const bad = {
      ...validScenario,
      timeline: [{ at: 0, action: { type: 'start-node', node: 'ghost' } }],
    };
    expect(() => parseScenario(bad)).toThrow(ScenarioError);
  });

  it('rejects a set-upgrade action referencing an undeclared node', () => {
    const bad = {
      ...validScenario,
      timeline: [
        { at: 0, action: { type: 'set-upgrade', nodes: ['ghost'], protocolVersion: 29 } },
      ],
    };
    expect(() => parseScenario(bad)).toThrow(ScenarioError);
  });

  it('accepts a stop-node and set-upgrade action on declared nodes', () => {
    const scenario = parseScenario({
      ...validScenario,
      timeline: [
        { at: 0, action: { type: 'stop-node', node: 'node1' } },
        { at: 10, action: { type: 'set-upgrade', nodes: ['node2'], protocolVersion: 29 } },
      ],
    });
    expect(scenario.timeline).toHaveLength(2);
  });

  it('defaults set-upgrade.upgradeDelaySeconds to 45', () => {
    const scenario = parseScenario({
      ...validScenario,
      timeline: [{ at: 0, action: { type: 'set-upgrade', nodes: ['node1'], protocolVersion: 29 } }],
    });
    const action = scenario.timeline[0]!.action;
    expect(action.type).toBe('set-upgrade');
    if (action.type === 'set-upgrade') expect(action.upgradeDelaySeconds).toBe(45);
  });

  it('error message lists the offending path', () => {
    try {
      parseScenario({ ...validScenario, topology: { validators: [] } });
      expect.unreachable();
    } catch (err) {
      expect(err).toBeInstanceOf(ScenarioError);
      expect((err as Error).message).toContain('validators');
    }
  });
});
