import { describe, expect, it } from 'vitest';
import { assignPorts, buildComposeDocument, envVarForImage } from './compose.js';

const validators = [
  { name: 'node1', image: '28' },
  { name: 'node2', image: '28' },
  { name: 'node3', image: '28' },
];

describe('assignPorts', () => {
  it('assigns unique, sequential host ports starting at 11626', () => {
    const ports = assignPorts(validators);
    expect(ports).toEqual([
      { name: 'node1', hostPort: 11626 },
      { name: 'node2', hostPort: 11627 },
      { name: 'node3', hostPort: 11628 },
    ]);
  });
});

describe('envVarForImage', () => {
  it('uppercases and sanitizes a node name into a shell-safe env var name', () => {
    expect(envVarForImage('node1')).toBe('NODE1_TAG');
  });
});

describe('buildComposeDocument', () => {
  const ports = assignPorts(validators);
  const doc = buildComposeDocument(validators, ports) as {
    services: Record<string, unknown>;
    volumes: Record<string, unknown>;
  };

  it('creates one service and one init service per validator', () => {
    for (const v of validators) {
      expect(doc.services).toHaveProperty(v.name);
      expect(doc.services).toHaveProperty(`init-${v.name}`);
    }
  });

  it('creates one named volume per validator', () => {
    for (const v of validators) {
      expect(doc.volumes).toHaveProperty(`${v.name}-data`);
    }
  });

  it("each node service's image tag reads from its own env var with the initial tag as default", () => {
    const node1 = doc.services.node1 as { image: string };
    expect(node1.image).toBe('stellar/stellar-core:${NODE1_TAG:-28}');
  });

  it('maps each service to its assigned unique host port', () => {
    const node2 = doc.services.node2 as { ports: string[] };
    expect(node2.ports).toEqual(['11627:11626']);
  });

  it('each node depends on its own init service completing successfully', () => {
    const node1 = doc.services.node1 as { depends_on: Record<string, { condition: string }> };
    expect(node1.depends_on['init-node1']?.condition).toBe('service_completed_successfully');
  });
});
