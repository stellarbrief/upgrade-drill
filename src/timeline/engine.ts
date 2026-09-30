import type { Action, TimelineEntry } from '../scenario/schema.js';

export interface TimelineDeps {
  sleep: (ms: number) => Promise<void>;
  executeAction: (action: Action) => Promise<void>;
  observe: () => Promise<void>;
}

/** Runs a scenario's timeline in array order. `wait` actions are the only thing that consumes
 * real time — they also drive observation polling throughout their duration, at
 * `observationIntervalSeconds` cadence. Every other action fires immediately (a `docker`/HTTP
 * call), followed by one observation snapshot to capture its immediate effect. */
export async function runTimeline(
  entries: TimelineEntry[],
  observationIntervalSeconds: number,
  deps: TimelineDeps
): Promise<void> {
  for (const entry of entries) {
    if (entry.action.type === 'wait') {
      await waitWithObservations(entry.action.seconds, observationIntervalSeconds, deps);
    } else {
      await deps.executeAction(entry.action);
      await deps.observe();
    }
  }
}

async function waitWithObservations(
  totalSeconds: number,
  intervalSeconds: number,
  deps: TimelineDeps
): Promise<void> {
  let remaining = totalSeconds;
  while (remaining > 0) {
    const chunk = Math.min(intervalSeconds, remaining);
    await deps.sleep(chunk * 1000);
    await deps.observe();
    remaining -= chunk;
  }
}
