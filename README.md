# Upgrade Drill

A CLI that lets Stellar validator operators rehearse a protocol upgrade on their own laptop —
launching a small private network of real `stellar-core` containers (mixed versions), running a
scripted upgrade vote, and reporting what happened. Local only; not affiliated with SDF; not for
production.

## Current status: feasibility spike, not the product yet

This is deliberately the riskiest of [stellarbrief](https://github.com/stellarbrief)'s repos,
and its spec requires proving feasibility before building the real tool: can a laptop actually
boot 3 real `stellar-core` validators, reach consensus, and complete a live protocol upgrade
vote? See [`PLAN.md`](PLAN.md) for the full reasoning, the real, verified facts this is built
on, and exactly what's still unverified.

The build environment this repo was scaffolded in has no Docker at all, so the spike
(`spike/run-spike.sh` + `.github/workflows/spike.yml`) is designed to run for real on
GitHub's Docker-enabled CI runners instead. Once that run's real results are read, this
repo either:

- grows into the full CLI (scenario engine, four built-in scenarios, contributor-readiness
  docs — the same shape as [`upgrade-preflight`](https://github.com/stellarbrief/upgrade-preflight)), or
- stops here with an honest `SPIKE.md` explaining what blocked it, per the spec's own
  "don't build a fake substitute" rule.

## Running the spike yourself

Requires Docker and roughly 10-20 minutes (three full boot/upgrade/observe cycles, plus one
mixed-version trial):

```bash
cd spike
chmod +x run-spike.sh generate-configs.sh
./run-spike.sh
cat SPIKE.md
```

It generates fresh, throwaway validator keys every run (via the real `stellar-core gen-seed`
command — never hand-picked, never committed), boots a private 3-node network, and writes its
real observations to `SPIKE.md` and `fixtures/*.json` — nothing in this repo's spike output is
hand-authored or fabricated.

## License

MIT — see [`LICENSE`](LICENSE).
