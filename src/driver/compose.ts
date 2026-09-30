import { spawn } from 'node:child_process';
import { envVarForImage } from '../topology/compose.js';

function runDocker(args: string[], env: Record<string, string> = {}): Promise<string> {
  return new Promise((resolve, reject) => {
    const child = spawn('docker', args, {
      stdio: ['ignore', 'pipe', 'pipe'],
      env: { ...process.env, ...env },
    });
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

export async function composeUp(composeFilePath: string): Promise<void> {
  await runDocker(['compose', '-f', composeFilePath, 'up', '-d']);
}

/** Restarts one node, optionally on a different image tag — the exact pattern proven in the
 * spike's `restart_node_with_tag`. The node's existing data volume is preserved automatically
 * by Docker (only the container is recreated, not the volume). */
export async function composeStartNode(
  composeFilePath: string,
  nodeName: string,
  image?: string
): Promise<void> {
  const env = image ? { [envVarForImage(nodeName)]: image } : {};
  await runDocker(['compose', '-f', composeFilePath, 'up', '-d', '--no-deps', nodeName], env);
}

export async function composeStopNode(composeFilePath: string, nodeName: string): Promise<void> {
  await runDocker(['compose', '-f', composeFilePath, 'stop', nodeName]);
}

export async function composeDown(composeFilePath: string): Promise<void> {
  try {
    await runDocker(['compose', '-f', composeFilePath, 'down', '-v', '--remove-orphans']);
  } catch {
    // Best-effort cleanup — never let a teardown failure mask the real result.
  }
}

export async function composeLogs(composeFilePath: string, nodeName: string): Promise<string> {
  try {
    return await runDocker(['compose', '-f', composeFilePath, 'logs', '--no-color', nodeName]);
  } catch (err) {
    return `(failed to capture logs: ${(err as Error).message})`;
  }
}
