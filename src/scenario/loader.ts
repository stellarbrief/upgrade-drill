import { readFile } from 'node:fs/promises';
import { parse as parseYaml } from 'yaml';
import { z } from 'zod';
import { ScenarioSchema, type Scenario } from './schema.js';

export class ScenarioError extends Error {}

export function parseScenario(raw: unknown): Scenario {
  const result = ScenarioSchema.safeParse(raw);
  if (!result.success) {
    throw new ScenarioError(formatZodError(result.error));
  }
  return result.data;
}

export async function loadScenario(path: string): Promise<Scenario> {
  let text: string;
  try {
    text = await readFile(path, 'utf8');
  } catch (err) {
    throw new ScenarioError(`Could not read scenario file at ${path}: ${(err as Error).message}`);
  }

  let raw: unknown;
  try {
    raw = parseYaml(text);
  } catch (err) {
    throw new ScenarioError(`Could not parse ${path} as YAML: ${(err as Error).message}`);
  }

  return parseScenario(raw);
}

function formatZodError(error: z.ZodError): string {
  const lines = error.issues.map((issue) => {
    const path = issue.path.length > 0 ? issue.path.join('.') : '(root)';
    return `  - ${path}: ${issue.message}`;
  });
  return `Invalid scenario:\n${lines.join('\n')}`;
}
