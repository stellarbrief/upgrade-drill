import type { DrillReport } from '../verdict/types.js';

export interface JsonReport {
  schemaVersion: 2;
  scenarioName: string;
  scenarioDescription: string;
  verdict: DrillReport['verdict'];
  verdictExplanation: string;
  nodeOutcomes: DrillReport['nodeOutcomes'];
  timeline: DrillReport['timeline'];
  surprises: string[];
  /** Full raw `info` responses behind every timeline row — added in schema v2 after a real
   * investigation (see PLAN.md "Verify-scenarios attempt #2") needed the raw response to
   * understand a protocol version change and found it missing from the report entirely. */
  snapshots: DrillReport['snapshots'];
  coverageNote: string;
}

export function toJsonReport(report: DrillReport): JsonReport {
  return {
    schemaVersion: 2,
    scenarioName: report.scenarioName,
    scenarioDescription: report.scenarioDescription,
    verdict: report.verdict,
    verdictExplanation: report.verdictExplanation,
    nodeOutcomes: report.nodeOutcomes,
    timeline: report.timeline,
    surprises: report.surprises,
    snapshots: report.snapshots,
    coverageNote:
      'This drill ran on a small, local topology with throwaway keys and no real network load. ' +
      'It does not prove real Mainnet upgrade behavior.',
  };
}

export function toJson(report: DrillReport): string {
  return JSON.stringify(toJsonReport(report), null, 2);
}
