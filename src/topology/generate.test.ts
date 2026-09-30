import { mkdtemp, readFile, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fakeKeypairSource, generateTopology } from './generate.js';

describe('generateTopology with fakeKeypairSource (the --dry-run path)', () => {
  let workDir: string;

  beforeEach(async () => {
    workDir = await mkdtemp(join(tmpdir(), 'upgrade-drill-test-'));
  });
  afterEach(async () => {
    await rm(workDir, { recursive: true, force: true });
  });

  it('never shells out to Docker — genSeed is never called', async () => {
    const spy = vi.fn();
    const source = async (image: string) => {
      spy(image);
      return fakeKeypairSource(image);
    };
    const result = await generateTopology(
      { validators: [{ name: 'node1', image: '28' }], quorumThresholdPercent: 67 },
      'test passphrase',
      workDir,
      source
    );
    expect(spy).toHaveBeenCalledWith('28');
    expect(result.nodes[0]!.publicKey).toContain('DRYRUN');
  });

  it('writes one config file per validator, plus the entrypoint script and compose file', async () => {
    await generateTopology(
      {
        validators: [
          { name: 'node1', image: '28' },
          { name: 'node2', image: '28' },
        ],
        quorumThresholdPercent: 67,
      },
      'test passphrase',
      workDir,
      fakeKeypairSource
    );

    const configFiles = await readdir(join(workDir, 'configs'));
    expect(configFiles.sort()).toEqual(['node1.cfg', 'node2.cfg']);

    const entrypoint = await readFile(join(workDir, 'entrypoint.sh'), 'utf8');
    expect(entrypoint).toContain('new-hist local');

    const compose = await readFile(join(workDir, 'docker-compose.yml'), 'utf8');
    expect(compose).toContain('node1');
    expect(compose).toContain('node2');
  });

  it('assigns each returned node its correct host port', async () => {
    const result = await generateTopology(
      {
        validators: [
          { name: 'node1', image: '28' },
          { name: 'node2', image: '28' },
        ],
        quorumThresholdPercent: 67,
      },
      'test passphrase',
      workDir,
      fakeKeypairSource
    );
    expect(result.nodes).toEqual([
      { name: 'node1', publicKey: expect.stringContaining('DRYRUN'), hostPort: 11626 },
      { name: 'node2', publicKey: expect.stringContaining('DRYRUN'), hostPort: 11627 },
    ]);
  });
});
