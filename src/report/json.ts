import type { DrillReport } from '../verdict/types.js';

export interface JsonReport {
  schemaVersion: 1;
  scenarioName: string;
  scenarioDescription: string;
  verdict: DrillReport['verdict'];
  verdictExplanation: string;
  nodeOutcomes: DrillReport['nodeOutcomes'];
  timeline: DrillReport['timeline'];
  surprises: string[];
  coverageNote: string;
}

export function toJsonReport(report: DrillReport): JsonReport {
  return {
    schemaVersion: 1,
    scenarioName: report.scenarioName,
    scenarioDescription: report.scenarioDescription,
    verdict: report.verdict,
    verdictExplanation: report.verdictExplanation,
    nodeOutcomes: report.nodeOutcomes,
    timeline: report.timeline,
    surprises: report.surprises,
    coverageNote:
      'This drill ran on a small, local topology with throwaway keys and no real network load. ' +
      'It does not prove real Mainnet upgrade behavior.',
  };
}

export function toJson(report: DrillReport): string {
  return JSON.stringify(toJsonReport(report), null, 2);
}
