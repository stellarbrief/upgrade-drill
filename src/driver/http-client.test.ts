import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireUpgradeVote, getInfoSnapshot, getQuorumRaw } from './http-client.js';

const REAL_INFO_RESPONSE = {
  info: {
    state: 'Synced!',
    protocol_version: 28,
    ledger: { num: 24, version: 0 },
    quorum: {
      node: 'self',
      qset: { agree: 3, cost: 100 },
      transitive: { node_count: 3, intersection: true },
    },
  },
};

describe('getInfoSnapshot', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('extracts the real, confirmed fields from a real-shaped info response', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify(REAL_INFO_RESPONSE))));
    const snap = await getInfoSnapshot('node1', 11626);
    expect(snap).toMatchObject({
      node: 'node1',
      reachable: true,
      state: 'Synced!',
      protocolVersion: 28,
      ledgerNum: 24,
      quorumAgree: 3,
      quorumNodeCount: 3,
    });
  });

  it('does NOT confuse info.ledger.version with info.protocol_version', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify(REAL_INFO_RESPONSE))));
    const snap = await getInfoSnapshot('node1', 11626);
    expect(snap.protocolVersion).toBe(28);
    expect(snap.protocolVersion).not.toBe(REAL_INFO_RESPONSE.info.ledger.version);
  });

  it('marks a snapshot unreachable when the request fails, without throwing', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('connection refused'); }));
    const snap = await getInfoSnapshot('node1', 11626);
    expect(snap.reachable).toBe(false);
    expect(snap.state).toBeNull();
    expect(snap.protocolVersion).toBeNull();
  });

  it('handles a response missing the top-level "info" key gracefully: reachable (a real HTTP response arrived), but no fields can be extracted', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ unexpected: true }))));
    const snap = await getInfoSnapshot('node1', 11626);
    expect(snap.reachable).toBe(true);
    expect(snap.state).toBeNull();
    expect(snap.protocolVersion).toBeNull();
  });
});

describe('getQuorumRaw', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('returns the raw parsed response', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ hello: 'quorum' }))));
    const raw = await getQuorumRaw(11626);
    expect(raw).toEqual({ hello: 'quorum' });
  });
});

describe('fireUpgradeVote', () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn(async () => new Response('{}'));
    vi.stubGlobal('fetch', fetchMock);
  });
  afterEach(() => vi.unstubAllGlobals());

  it('calls the real, proven upgrades HTTP command with mode=set and the given parameters', async () => {
    await fireUpgradeVote(11626, 29, 45);
    const url = fetchMock.mock.calls[0]![0] as string;
    expect(url).toContain('http://localhost:11626/upgrades?mode=set');
    expect(url).toContain('protocolversion=29');
  });

  it('schedules the upgrade time roughly delaySeconds in the future', async () => {
    const before = Date.now();
    const { upgradeTimeIso } = await fireUpgradeVote(11626, 29, 45);
    const scheduled = new Date(upgradeTimeIso).getTime();
    expect(scheduled).toBeGreaterThanOrEqual(before + 44_000);
    expect(scheduled).toBeLessThanOrEqual(before + 46_000);
  });
});
