import { spawn } from 'node:child_process';

export interface GeneratedKeypair {
  secretKey: string;
  publicKey: string;
}

/** Real throwaway keys only, generated fresh every run via the actual stellar-core binary's
 * own `gen-seed` command — never hand-picked, never reused. See PLAN.md's safety rules. */
export async function genSeed(image: string): Promise<GeneratedKeypair> {
  const output = await runDocker(['run', '--rm', image, 'gen-seed']);
  const secretKey = /Secret seed:\s*(\S+)/.exec(output)?.[1];
  const publicKey = /Public:\s*(\S+)/.exec(output)?.[1];
  if (!secretKey || !publicKey) {
    throw new Error(
      `gen-seed: could not parse a keypair from "${image}"'s output. This means gen-seed's ` +
        `output format differs from what this code expects — a real unverified-assumption ` +
        `failure, not a transient error. Raw output:\n${output}`
    );
  }
  return { secretKey, publicKey };
}

function runDocker(args: string[]): Promise<string> {
  return new Promise((resolve, reject) => {
    const child = spawn('docker', args, { stdio: ['ignore', 'pipe', 'pipe'] });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (chunk) => (stdout += chunk.toString()));
    child.stderr.on('data', (chunk) => (stderr += chunk.toString()));
    child.on('error', (err) => reject(new Error(`Failed to spawn docker: ${err.message}`)));
    child.on('close', (code) => {
      if (code === 0) resolve(stdout.trim());
      else reject(new Error(`docker ${args.join(' ')} exited with code ${code}: ${stderr.trim()}`));
    });
  });
}
