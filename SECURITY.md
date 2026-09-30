# Security Policy

## Reporting a vulnerability

Please do not open a public GitHub issue for a security vulnerability. Instead, use GitHub's
[private vulnerability reporting](https://github.com/stellarbrief/upgrade-drill/security/advisories/new)
for this repository, or open a regular issue asking a maintainer to reach out privately if
that option isn't available to you.

## Scope

This project runs local, ephemeral `stellar-core` containers on a private network, with a
network passphrase and keys unique to each run; it never connects to Testnet or Mainnet.
Relevant concerns include (but aren't limited to):

- A generated test secret key leaking into logs, reports, or CI output. `src/driver/gen-seed.ts`
  never logs a secret, and only public keys flow into any report — but a new code path that
  threads a secret into a log line would be a real finding.
- A scenario file from an untrusted source causing unexpected `docker`/`docker compose`
  arguments — the topology generator (`src/topology/`) only ever produces fixed, known flags
  from a scenario's validated fields; report if you find a way to inject arbitrary arguments
  through a scenario value.
- The GitHub Action or CI workflow running with more permissions or network access than needed.

## Supported versions

This project is pre-1.0; only the `main` branch receives fixes.
