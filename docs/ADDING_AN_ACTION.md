# Adding a new timeline action type

Actions live in `src/scenario/schema.ts`'s `ActionSchema` (a zod discriminated union) and are
dispatched in `src/runner/run.ts`'s `executeAction`. To add one:

1. Add a new variant to `ActionSchema`, e.g.:
   ```ts
   z.object({ type: z.literal('my-action'), node: z.string().min(1), someParam: z.number() }),
   ```
2. Handle it in `src/runner/run.ts`'s `executeAction` switch — this is the ONLY place that
   should perform the real `docker`/HTTP side effect. Keep the actual mechanics in
   `src/driver/` (compose control or HTTP client) so they stay independently testable.
3. Add a case to `src/cli/index.ts`'s `describeAction`, so `--dry-run` can describe it.
4. Update the referential validation in `ScenarioSchema`'s `.refine()` (in
   `src/scenario/schema.ts`) if your action references node names, so a typo'd node name is
   caught at validate-time, not mid-drill.
5. Write a unit test for the new action in `src/timeline/engine.test.ts` (does it fire in the
   right order relative to `wait`/observations?) and, if it touches `src/driver/`, a mocked
   `child_process`/`fetch` test following `src/driver/compose.test.ts`'s pattern.
6. If the action can meaningfully appear in `--dry-run` output, make sure `generateTopology`
   doesn't need real Docker to describe it (see `fakeKeypairSource` for the pattern actions
   requiring keys should follow).

## Design rule

Every action should map to something that ACTUALLY happens against a real Docker container or
a real `stellar-core` HTTP endpoint — never a simulated/faked effect. If you're tempted to add
an action that doesn't correspond to a real operation, it probably belongs in `src/verdict/`
(as a new way to interpret observations) instead.
