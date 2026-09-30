import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { isDockerAvailable } from '../driver/docker-available.js';
import { loadScenario } from '../scenario/loader.js';
import { runDrill } from './run.js';

const HERE = dirname(fileURLToPath(import.meta.url));
const HAPPY_PATH_SCENARIO = resolve(HERE, '../../scenarios/happy-path.yml');

// Computed once at collection time — see upgrade-preflight's PLAN.md for why this must be a
// top-level await rather than a per-test check.
const dockerAvailable = await isDockerAvailable();

describe('runDrill (integration)', () => {
  it.skipIf(!dockerAvailable)(
    'runs the real happy-path scenario end to end and reaches NETWORK_UPGRADED',
    async () => {
      const scenario = await loadScenario(HAPPY_PATH_SCENARIO);
      const workDir = await mkdtemp(join(tmpdir(), 'upgrade-drill-it-'));

      try {
        const { report } = await runDrill(scenario, workDir);
        expect(report.verdict).toBe('NETWORK_UPGRADED');
        expect(report.nodeOutcomes).toHaveLength(3);
        for (const outcome of report.nodeOutcomes) {
          expect(outcome.finalState).toBe('Synced!');
          expect(outcome.finalProtocolVersion).toBe(29);
        }
      } finally {
        await rm(workDir, { recursive: true, force: true });
      }
    },
    600_000
  );

  it('logs why it skipped, when it skips', () => {
    if (!dockerAvailable) {
      console.log('upgrade-drill integration test skipped: Docker is not available.');
    }
    expect(true).toBe(true);
  });
});
