import { describe, expect, it } from 'vitest';
import { renderNodeConfig } from './render-config.js';

const allValidators = [
  { name: 'node1', publicKey: 'GAAAA1' },
  { name: 'node2', publicKey: 'GBBBB2' },
  { name: 'node3', publicKey: 'GCCCC3' },
];

describe('renderNodeConfig', () => {
  it('uses the literal "$self" token for the node\'s own QUORUM_SET entry, never its own pubkey', () => {
    const config = renderNodeConfig({
      selfName: 'node1',
      selfSecretKey: 'SSECRET1',
      allValidators,
      networkPassphrase: 'test',
      quorumThresholdPercent: 67,
    });
    expect(config).toContain('"$self"');
    expect(config).not.toContain('GAAAA1 node1');
  });

  it('spells out the other validators by pubkey and name', () => {
    const config = renderNodeConfig({
      selfName: 'node1',
      selfSecretKey: 'SSECRET1',
      allValidators,
      networkPassphrase: 'test',
      quorumThresholdPercent: 67,
    });
    expect(config).toContain('"GBBBB2 node2"');
    expect(config).toContain('"GCCCC3 node3"');
  });

  it('lists only the OTHER nodes in KNOWN_PEERS, never itself', () => {
    const config = renderNodeConfig({
      selfName: 'node1',
      selfSecretKey: 'SSECRET1',
      allValidators,
      networkPassphrase: 'test',
      quorumThresholdPercent: 67,
    });
    expect(config).toContain('KNOWN_PEERS=["node2:11625","node3:11625"]');
  });

  it('includes a [HISTORY.local] section (required for RUN_STANDALONE=false to boot at all)', () => {
    const config = renderNodeConfig({
      selfName: 'node1',
      selfSecretKey: 'SSECRET1',
      allValidators,
      networkPassphrase: 'test',
      quorumThresholdPercent: 67,
    });
    expect(config).toContain('[HISTORY.local]');
    expect(config).toContain('mkdir="mkdir -p /data/history/{0}"');
  });

  it('sets PUBLIC_HTTP_PORT=true (required for host-side polling through Docker NAT)', () => {
    const config = renderNodeConfig({
      selfName: 'node1',
      selfSecretKey: 'SSECRET1',
      allValidators,
      networkPassphrase: 'test',
      quorumThresholdPercent: 67,
    });
    expect(config).toContain('PUBLIC_HTTP_PORT=true');
  });

  it('the secret key appears only in NODE_SEED, never elsewhere in the config', () => {
    const config = renderNodeConfig({
      selfName: 'node1',
      selfSecretKey: 'SVERYSECRET',
      allValidators,
      networkPassphrase: 'test',
      quorumThresholdPercent: 67,
    });
    const occurrences = config.split('SVERYSECRET').length - 1;
    expect(occurrences).toBe(1);
    expect(config).toContain('NODE_SEED="SVERYSECRET self"');
  });

  it('throws if selfName is not in allValidators', () => {
    expect(() =>
      renderNodeConfig({
        selfName: 'ghost',
        selfSecretKey: 'S1',
        allValidators,
        networkPassphrase: 'test',
        quorumThresholdPercent: 67,
      })
    ).toThrow();
  });

  it('renders the given THRESHOLD_PERCENT verbatim', () => {
    const config = renderNodeConfig({
      selfName: 'node1',
      selfSecretKey: 'S1',
      allValidators,
      networkPassphrase: 'test',
      quorumThresholdPercent: 51,
    });
    expect(config).toContain('THRESHOLD_PERCENT=51');
  });
});
