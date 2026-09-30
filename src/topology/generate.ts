import { mkdir, writeFile } from 'node:fs/promises';
import type { Topology } from '../scenario/schema.js';
import { genSeed, type GeneratedKeypair } from '../driver/gen-seed.js';
import { assignPorts, renderComposeYaml, type NodePort } from './compose.js';
import { NODE_ENTRYPOINT_SCRIPT } from './entrypoint-script.js';
import { renderNodeConfig, type ValidatorKey } from './render-config.js';

export interface GeneratedNode {
  name: string;
  publicKey: string;
  hostPort: number;
}

export interface GeneratedTopology {
  workDir: string;
  composeFilePath: string;
  nodes: GeneratedNode[];
}

export type KeypairSource = (image: string) => Promise<GeneratedKeypair>;

/** Generates a clearly-fake keypair per validator, for `--dry-run` — needs no Docker at all,
 * matching the spec's requirement that dry-run work without Docker for contributors who don't
 * have it. These keys are unambiguously unusable (never a real strkey), never presented as
 * real. */
export const fakeKeypairSource: KeypairSource = async () => ({
  secretKey: 'SDRYRUNDRYRUNDRYRUNDRYRUNDRYRUNDRYRUNDRYRUNDRYRUNDRYRUNPLACEHOLDER',
  publicKey: 'GDRYRUNDRYRUNDRYRUNDRYRUNDRYRUNDRYRUNDRYRUNDRYRUNDRYRUNPLACEHOLDER',
});

/** Generates everything needed to boot a topology: keypairs (real, via the stellar-core
 * binary's own `gen-seed`, unless a `keypairSource` override is given — see `fakeKeypairSource`
 * for `--dry-run`), per-node configs, the entrypoint script, and a Compose file — all written
 * into `workDir`. Never persists or logs a secret key beyond the config file it belongs in;
 * only public keys are returned in the result. */
export async function generateTopology(
  topology: Topology,
  networkPassphrase: string,
  workDir: string,
  keypairSource: KeypairSource = (image) => genSeed(`stellar/stellar-core:${image}`)
): Promise<GeneratedTopology> {
  await mkdir(`${workDir}/configs`, { recursive: true });

  const keypairs = await Promise.all(
    topology.validators.map(async (v) => ({ name: v.name, ...(await keypairSource(v.image)) }))
  );

  const allValidatorKeys: ValidatorKey[] = keypairs.map((k) => ({ name: k.name, publicKey: k.publicKey }));

  for (const keypair of keypairs) {
    const configText = renderNodeConfig({
      selfName: keypair.name,
      selfSecretKey: keypair.secretKey,
      allValidators: allValidatorKeys,
      networkPassphrase,
      quorumThresholdPercent: topology.quorumThresholdPercent,
    });
    await writeFile(`${workDir}/configs/${keypair.name}.cfg`, configText, 'utf8');
  }

  await writeFile(`${workDir}/entrypoint.sh`, NODE_ENTRYPOINT_SCRIPT, { mode: 0o755 });

  const ports: NodePort[] = assignPorts(topology.validators);
  const composeYaml = renderComposeYaml(topology.validators, ports);
  const composeFilePath = `${workDir}/docker-compose.yml`;
  await writeFile(composeFilePath, composeYaml, 'utf8');

  return {
    workDir,
    composeFilePath,
    nodes: keypairs.map((k) => ({
      name: k.name,
      publicKey: k.publicKey,
      hostPort: ports.find((p) => p.name === k.name)!.hostPort,
    })),
  };
}
