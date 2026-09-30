import type { Action, Scenario } from '../scenario/schema.js';
import { composeDown, composeStartNode, composeStopNode, composeUp } from '../driver/compose.js';
import { fireUpgradeVote, getInfoSnapshot } from '../driver/http-client.js';
import { generateTopology } from '../topology/generate.js';
import { runTimeline } from '../timeline/engine.js';
import { classifyDrill } from '../verdict/engine.js';
import type { DrillReport, NodeSnapshot } from '../verdict/types.js';

export interface RunDrillResult {
  report: DrillReport;
  workDir: string;
}

/** Runs a full drill end to end: generates the topology, boots it, executes the scenario's
 * timeline against real Docker containers and HTTP commands, always tears the network down, and
 * classifies the result from what was actually observed. */
export async function runDrill(scenario: Scenario, workDir: string): Promise<RunDrillResult> {
  const topology = await generateTopology(scenario.topology, `upgrade-drill: ${scenario.name}`, workDir);
  const portByNode = new Map(topology.nodes.map((n) => [n.name, n.hostPort]));
  const snapshots: NodeSnapshot[] = [];

  const observe = async (): Promise<void> => {
    for (const node of topology.nodes) {
      snapshots.push(await getInfoSnapshot(node.name, node.hostPort));
    }
  };

  const executeAction = async (action: Action): Promise<void> => {
    switch (action.type) {
      case 'start-node':
        await composeStartNode(topology.composeFilePath, action.node, action.image);
        return;
      case 'stop-node':
        await composeStopNode(topology.composeFilePath, action.node);
        return;
      case 'set-upgrade': {
        for (const node of action.nodes) {
          const port = portByNode.get(node);
          if (port !== undefined) {
            await fireUpgradeVote(port, action.protocolVersion, action.upgradeDelaySeconds);
          }
        }
        return;
      }
      case 'wait':
        // Handled directly by the timeline engine, never dispatched here.
        return;
    }
  };

  try {
    await composeUp(topology.composeFilePath);
    await observe();
    await runTimeline(scenario.timeline, scenario.observations.intervalSeconds, {
      sleep: (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
      executeAction,
      observe,
    });
  } finally {
    await composeDown(topology.composeFilePath);
  }

  return { report: classifyDrill(scenario, snapshots), workDir };
}
