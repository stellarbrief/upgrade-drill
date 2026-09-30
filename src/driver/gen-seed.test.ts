import { EventEmitter } from 'node:events';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import * as childProcess from 'node:child_process';

vi.mock('node:child_process', () => ({ spawn: vi.fn() }));

function fakeSpawn(stdout: string, code = 0) {
  return () => {
    const child = new EventEmitter() as EventEmitter & { stdout: EventEmitter; stderr: EventEmitter };
    child.stdout = new EventEmitter();
    child.stderr = new EventEmitter();
    queueMicrotask(() => {
      child.stdout.emit('data', Buffer.from(stdout));
      child.emit('close', code);
    });
    return child;
  };
}

describe('genSeed', () => {
  beforeEach(() => vi.mocked(childProcess.spawn).mockClear());
  afterEach(() => vi.restoreAllMocks());

  it('parses a real-shaped gen-seed output into a keypair', async () => {
    const { genSeed } = await import('./gen-seed.js');
    vi.mocked(childProcess.spawn).mockImplementationOnce(
      fakeSpawn('Secret seed: SAHP7BHVCCJ6BUYT56IMKQDMQT3HRGSRTEAQ2JAUXNQ7UQ7OFDN4Y2WS\nPublic: GDJLE5FAS4RVCWXAXUU226TGKXCAX7WFRNVCP75BNPWOUW7QSLKZZTUH\n') as never
    );
    const keypair = await genSeed('stellar/stellar-core:28');
    expect(keypair).toEqual({
      secretKey: 'SAHP7BHVCCJ6BUYT56IMKQDMQT3HRGSRTEAQ2JAUXNQ7UQ7OFDN4Y2WS',
      publicKey: 'GDJLE5FAS4RVCWXAXUU226TGKXCAX7WFRNVCP75BNPWOUW7QSLKZZTUH',
    });
  });

  it('calls docker run --rm <image> gen-seed', async () => {
    const { genSeed } = await import('./gen-seed.js');
    vi.mocked(childProcess.spawn).mockImplementationOnce(
      fakeSpawn('Secret seed: S1\nPublic: G1\n') as never
    );
    await genSeed('stellar/stellar-core:29');
    const [, args] = vi.mocked(childProcess.spawn).mock.calls[0]!;
    expect(args).toEqual(['run', '--rm', 'stellar/stellar-core:29', 'gen-seed']);
  });

  it('throws a clear error if the output cannot be parsed, rather than returning empty keys', async () => {
    const { genSeed } = await import('./gen-seed.js');
    vi.mocked(childProcess.spawn).mockImplementationOnce(fakeSpawn('unexpected garbage output') as never);
    await expect(genSeed('stellar/stellar-core:28')).rejects.toThrow(/could not parse a keypair/);
  });

  it('rejects when the docker command itself fails', async () => {
    const { genSeed } = await import('./gen-seed.js');
    vi.mocked(childProcess.spawn).mockImplementationOnce(fakeSpawn('image not found', 1) as never);
    await expect(genSeed('stellar/stellar-core:nonexistent')).rejects.toThrow(/exited with code 1/);
  });
});
