import { describe, expect, it } from 'vitest';
import type { Action, TimelineEntry } from '../scenario/schema.js';
import { runTimeline } from './engine.js';

function fakeDeps() {
  const calls: string[] = [];
  return {
    calls,
    sleep: async (ms: number) => {
      calls.push(`sleep:${ms}`);
    },
    executeAction: async (action: Action) => {
      calls.push(`action:${action.type}`);
    },
    observe: async () => {
      calls.push('observe');
    },
  };
}

describe('runTimeline', () => {
  it('fires non-wait actions immediately, followed by one observation', async () => {
    const deps = fakeDeps();
    const timeline: TimelineEntry[] = [
      { at: 0, action: { type: 'stop-node', node: 'node1' } },
    ];
    await runTimeline(timeline, 10, deps);
    expect(deps.calls).toEqual(['action:stop-node', 'observe']);
  });

  it('a wait action sleeps in intervalSeconds chunks, observing after each chunk', async () => {
    const deps = fakeDeps();
    const timeline: TimelineEntry[] = [{ at: 0, action: { type: 'wait', seconds: 30 } }];
    await runTimeline(timeline, 10, deps);
    expect(deps.calls).toEqual([
      'sleep:10000',
      'observe',
      'sleep:10000',
      'observe',
      'sleep:10000',
      'observe',
    ]);
  });

  it('a wait shorter than the interval sleeps for exactly the remaining time, once', async () => {
    const deps = fakeDeps();
    const timeline: TimelineEntry[] = [{ at: 0, action: { type: 'wait', seconds: 7 } }];
    await runTimeline(timeline, 10, deps);
    expect(deps.calls).toEqual(['sleep:7000', 'observe']);
  });

  it('a wait not evenly divisible by the interval ends with a shorter final chunk', async () => {
    const deps = fakeDeps();
    const timeline: TimelineEntry[] = [{ at: 0, action: { type: 'wait', seconds: 25 } }];
    await runTimeline(timeline, 10, deps);
    expect(deps.calls).toEqual([
      'sleep:10000',
      'observe',
      'sleep:10000',
      'observe',
      'sleep:5000',
      'observe',
    ]);
  });

  it('multiple entries fire strictly in array order', async () => {
    const deps = fakeDeps();
    const timeline: TimelineEntry[] = [
      { at: 0, action: { type: 'wait', seconds: 5 } },
      { at: 5, action: { type: 'stop-node', node: 'node1' } },
      { at: 5, action: { type: 'start-node', node: 'node2' } },
    ];
    await runTimeline(timeline, 10, deps);
    expect(deps.calls).toEqual([
      'sleep:5000',
      'observe',
      'action:stop-node',
      'observe',
      'action:start-node',
      'observe',
    ]);
  });
});
