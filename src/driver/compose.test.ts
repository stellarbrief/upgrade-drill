import { EventEmitter } from 'node:events';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import * as childProcess from 'node:child_process';

vi.mock('node:child_process', () => ({ spawn: vi.fn() }));

function fakeSpawn(code = 0) {
  return () => {
    const child = new EventEmitter() as EventEmitter & { stdout: EventEmitter; stderr: EventEmitter };
    child.stdout = new EventEmitter();
    child.stderr = new EventEmitter();
    queueMicrotask(() => child.emit('close', code));
    return child;
  };
}

describe('compose driver', () => {
  beforeEach(() => vi.mocked(childProcess.spawn).mockClear());
  afterEach(() => vi.restoreAllMocks());

  it('composeUp runs "compose -f <file> up -d"', async () => {
    const { composeUp } = await import('./compose.js');
    vi.mocked(childProcess.spawn).mockImplementationOnce(fakeSpawn() as never);
    await composeUp('/tmp/docker-compose.yml');
    const [, args] = vi.mocked(childProcess.spawn).mock.calls[0]!;
    expect(args).toEqual(['compose', '-f', '/tmp/docker-compose.yml', 'up', '-d']);
  });

  it('composeStartNode without an image restarts with --no-deps and no image env var', async () => {
    const { composeStartNode } = await import('./compose.js');
    vi.mocked(childProcess.spawn).mockImplementationOnce(fakeSpawn() as never);
    await composeStartNode('/tmp/docker-compose.yml', 'node1');
    const [, args, opts] = vi.mocked(childProcess.spawn).mock.calls[0]!;
    expect(args).toEqual(['compose', '-f', '/tmp/docker-compose.yml', 'up', '-d', '--no-deps', 'node1']);
    expect((opts as { env?: Record<string, string> }).env?.NODE1_TAG).toBeUndefined();
  });

  it('composeStartNode with an image sets that node\'s own env var to the new tag', async () => {
    const { composeStartNode } = await import('./compose.js');
    vi.mocked(childProcess.spawn).mockImplementationOnce(fakeSpawn() as never);
    await composeStartNode('/tmp/docker-compose.yml', 'node1', '29');
    const [, , opts] = vi.mocked(childProcess.spawn).mock.calls[0]!;
    expect((opts as { env?: Record<string, string> }).env?.NODE1_TAG).toBe('29');
  });

  it('composeStopNode runs "compose -f <file> stop <node>"', async () => {
    const { composeStopNode } = await import('./compose.js');
    vi.mocked(childProcess.spawn).mockImplementationOnce(fakeSpawn() as never);
    await composeStopNode('/tmp/docker-compose.yml', 'node2');
    const [, args] = vi.mocked(childProcess.spawn).mock.calls[0]!;
    expect(args).toEqual(['compose', '-f', '/tmp/docker-compose.yml', 'stop', 'node2']);
  });

  it('composeDown never throws, even if the underlying command fails', async () => {
    const { composeDown } = await import('./compose.js');
    vi.mocked(childProcess.spawn).mockImplementationOnce(fakeSpawn(1) as never);
    await expect(composeDown('/tmp/docker-compose.yml')).resolves.toBeUndefined();
  });
});
