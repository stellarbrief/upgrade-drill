#!/usr/bin/env node
import { mkdtemp, readdir, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Command } from 'commander';
import { loadScenario, ScenarioError } from '../scenario/loader.js';
import { toJson } from '../report/json.js';
import { toMarkdown } from '../report/markdown.js';
import { runDrill } from '../runner/run.js';
import { fakeKeypairSource, generateTopology } from '../topology/generate.js';

const HERE = dirname(fileURLToPath(import.meta.url));
const BUNDLED_SCENARIOS_DIR = resolve(HERE, '../../scenarios');

const program = new Command();

program
  .name('upgrade-drill')
  .description('Rehearses a Stellar protocol upgrade on your own laptop with real stellar-core validators.')
  .version('0.1.0');

program
  .command('run')
  .argument('<scenario>', 'path to a scenario YAML file')
  .description('Run a scenario end to end and report what happened.')
  .option('--dry-run', 'generate configs and a Compose file, print the plan, and start nothing')
  .option('--work-dir <dir>', 'directory to write generated configs/Compose file into')
  .option('--markdown-out <path>', 'write the Markdown report to this file')
  .option('--json-out <path>', 'write the JSON report to this file')
  .action(async (scenarioPath: string, options) => {
    const scenario = await loadScenario(resolve(process.cwd(), scenarioPath)).catch(exitOnScenarioError);
    const workDir = options.workDir
      ? resolve(process.cwd(), options.workDir)
      : await mkdtemp(join(tmpdir(), 'upgrade-drill-'));

    if (options.dryRun) {
      const topology = await generateTopology(
        scenario.topology,
        `upgrade-drill: ${scenario.name}`,
        workDir,
        fakeKeypairSource
      );
      console.log(`Dry run for "${scenario.name}" — nothing was started. Docker was not used;`);
      console.log(`generated keys below are clearly-fake placeholders, not real keypairs.\n`);
      console.log(`Generated files in: ${workDir}`);
      console.log(`  ${topology.composeFilePath}`);
      for (const node of topology.nodes) {
        console.log(`  ${workDir}/configs/${node.name}.cfg  (public key: ${node.publicKey}, host port: ${node.hostPort})`);
      }
      console.log(`\nTimeline (${scenario.timeline.length} steps):`);
      for (const entry of scenario.timeline) {
        console.log(`  +${entry.at}s  ${describeAction(entry.action)}`);
      }
      return;
    }

    console.error(`Running "${scenario.name}"...`);
    const { report } = await runDrill(scenario, workDir);

    const markdown = toMarkdown(report);
    console.log(markdown);
    if (options.markdownOut) await writeFile(options.markdownOut, markdown, 'utf8');
    if (options.jsonOut) await writeFile(options.jsonOut, toJson(report), 'utf8');

    if (report.verdict === 'NETWORK_STALLED' || report.verdict === 'UPGRADE_NOT_ADOPTED') {
      process.exitCode = 1;
    } else if (report.verdict === 'INCONCLUSIVE') {
      process.exitCode = 2;
    }
  });

program
  .command('list-scenarios')
  .description('List the built-in scenarios shipped with upgrade-drill.')
  .action(async () => {
    const files = (await readdir(BUNDLED_SCENARIOS_DIR)).filter((f) => f.endsWith('.yml'));
    for (const file of files) {
      const scenario = await loadScenario(join(BUNDLED_SCENARIOS_DIR, file)).catch(exitOnScenarioError);
      console.log(`${scenario.name} — ${scenario.description}`);
      console.log(`  ${join(BUNDLED_SCENARIOS_DIR, file)}`);
    }
  });

program
  .command('validate')
  .argument('<scenario>', 'path to a scenario YAML file')
  .description('Validate a scenario file without running anything.')
  .action(async (scenarioPath: string) => {
    await loadScenario(resolve(process.cwd(), scenarioPath)).catch(exitOnScenarioError);
    console.log('Scenario is valid.');
  });

function describeAction(action: import('../scenario/schema.js').Action): string {
  switch (action.type) {
    case 'wait':
      return `wait ${action.seconds}s`;
    case 'start-node':
      return `start ${action.node}${action.image ? ` on image ${action.image}` : ''}`;
    case 'stop-node':
      return `stop ${action.node}`;
    case 'set-upgrade':
      return `set-upgrade on [${action.nodes.join(', ')}] to protocol ${action.protocolVersion} in ${action.upgradeDelaySeconds}s`;
  }
}

function exitOnScenarioError(err: unknown): never {
  if (err instanceof ScenarioError) {
    console.error(err.message);
    process.exit(1);
  }
  throw err;
}

program.parseAsync(process.argv);
