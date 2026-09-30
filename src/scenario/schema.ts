import { z } from 'zod';

export const ValidatorSchema = z.object({
  name: z.string().min(1),
  /** stellar-core Docker image tag this validator starts on, e.g. "28". */
  image: z.string().min(1),
});

export type Validator = z.infer<typeof ValidatorSchema>;

export const TopologySchema = z.object({
  validators: z.array(ValidatorSchema).min(1),
  /** Matches stellar-core's own QUORUM_SET THRESHOLD_PERCENT (rounds up) — the manual,
   * all-validators-listed form proven in the spike, not the domain/QUALITY automatic system. */
  quorumThresholdPercent: z.number().int().min(1).max(100).default(67),
});

export type Topology = z.infer<typeof TopologySchema>;

export const ActionSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('wait'), seconds: z.number().positive() }),
  z.object({
    type: z.literal('start-node'),
    node: z.string().min(1),
    /** Omit to (re)start on the same image; set to simulate an operator swapping binaries
     * (proven pattern from the spike: existing data volume is preserved automatically). */
    image: z.string().min(1).optional(),
  }),
  z.object({ type: z.literal('stop-node'), node: z.string().min(1) }),
  z.object({
    type: z.literal('set-upgrade'),
    nodes: z.array(z.string().min(1)).min(1),
    protocolVersion: z.number().int().positive(),
    /** Seconds from when this action fires until the upgrade is scheduled to take effect —
     * must be long enough for the `upgrades` HTTP command to reach every node before that time
     * arrives, per stellar-core's own documented drop-if-too-late rule (PLAN.md "Verified
     * facts"). */
    upgradeDelaySeconds: z.number().positive().default(45),
  }),
]);

export type Action = z.infer<typeof ActionSchema>;

export const TimelineEntrySchema = z.object({
  /** Seconds from drill start when this action fires. */
  at: z.number().nonnegative(),
  action: ActionSchema,
});

export type TimelineEntry = z.infer<typeof TimelineEntrySchema>;

export const ObservationsSchema = z.object({
  intervalSeconds: z.number().positive().default(10),
});

export type Observations = z.infer<typeof ObservationsSchema>;

export const ExpectationsSchema = z.object({
  /** If set, the drill flags a surprise when any validator's final protocol_version differs. */
  finalProtocolVersion: z.number().int().positive().optional(),
  /** Node names expected to remain in a "Synced!" state through the end of the drill. */
  nodesShouldStaySynced: z.array(z.string().min(1)).optional(),
});

export type Expectations = z.infer<typeof ExpectationsSchema>;

export const ScenarioSchema = z
  .object({
    name: z.string().min(1),
    description: z.string().min(1),
    topology: TopologySchema,
    timeline: z.array(TimelineEntrySchema).min(1),
    observations: ObservationsSchema.default({ intervalSeconds: 10 }),
    expectations: ExpectationsSchema.optional(),
  })
  .refine(
    (scenario) => {
      const names = new Set(scenario.topology.validators.map((v) => v.name));
      return scenario.timeline.every((entry) => {
        const a = entry.action;
        if (a.type === 'start-node' || a.type === 'stop-node') return names.has(a.node);
        if (a.type === 'set-upgrade') return a.nodes.every((n) => names.has(n));
        return true;
      });
    },
    { message: 'Every node name referenced in timeline actions must be declared in topology.validators.' }
  );

export type Scenario = z.infer<typeof ScenarioSchema>;
