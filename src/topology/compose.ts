import { stringify as toYaml } from 'yaml';
import type { Validator } from '../scenario/schema.js';
import { INIT_SCRIPT } from './entrypoint-script.js';

export interface NodePort {
  name: string;
  hostPort: number;
}

/** Assigns each validator a unique host port starting at 11626, matching the ports proven in
 * the feasibility spike. */
export function assignPorts(validators: Validator[]): NodePort[] {
  return validators.map((v, i) => ({ name: v.name, hostPort: 11626 + i }));
}

export function buildComposeDocument(validators: Validator[], ports: NodePort[]): unknown {
  const services: Record<string, unknown> = {};

  for (const v of validators) {
    const port = ports.find((p) => p.name === v.name);
    if (!port) throw new Error(`buildComposeDocument: no port assigned for "${v.name}".`);

    services[`init-${v.name}`] = {
      image: 'alpine:3.20',
      command: ['sh', '-c', INIT_SCRIPT],
      volumes: [`${v.name}-data:/data`],
    };

    services[v.name] = {
      image: `stellar/stellar-core:\${${envVarForImage(v.name)}:-${v.image}}`,
      hostname: v.name,
      depends_on: { [`init-${v.name}`]: { condition: 'service_completed_successfully' } },
      entrypoint: ['/bin/sh', '/entrypoint.sh'],
      volumes: [
        `./configs/${v.name}.cfg:/config/stellar-core.cfg:ro`,
        './entrypoint.sh:/entrypoint.sh:ro',
        `${v.name}-data:/data`,
      ],
      ports: [`${port.hostPort}:11626`],
      networks: ['drill'],
    };
  }

  const volumes: Record<string, null> = {};
  for (const v of validators) volumes[`${v.name}-data`] = null;

  return {
    name: 'upgrade-drill',
    services,
    networks: { drill: { name: 'upgrade-drill-net' } },
    volumes,
  };
}

/** The env var a given node's image tag is read from at `docker compose up` time, letting
 * `start-node` actions swap one node's binary without touching the compose file — the exact
 * pattern proven in the spike's `restart_node_with_tag`. */
export function envVarForImage(nodeName: string): string {
  return `${nodeName.toUpperCase().replace(/[^A-Z0-9]/g, '_')}_TAG`;
}

export function renderComposeYaml(validators: Validator[], ports: NodePort[]): string {
  return toYaml(buildComposeDocument(validators, ports));
}
