# Web Deployment Release Notes

## Summary

TreeSeed Market now exposes a governed web deployment path for hosted projects. Operators can inspect deployment readiness, queue staging and production web actions, publish content, run monitors, watch progress, inspect history/events, and use matching CLI commands. The feature reuses existing project, host, repository, environment, platform operation, deployment, runner, monitor, and audit records.

## Included

* Deploy page under `/app/projects/:projectId/deploy`.
* Deployment API/read model routes under `/v1/projects/:projectId`.
* `project:web_deployment` execution through the existing Market operations runner.
* `trsd projects deploy`, `publish`, `monitor`, list, inspect, retry, resume, and cancel parity.
* Launch-to-Deploy redirect and launch recovery display.
* Normalized monitor results visible in UI, API, and CLI.
* Deployment governance, production confirmation, recursive redaction, and audit events.
* Mocked local acceptance through:

```bash
npm run market:operations-runner -- --market local --once --operation project:web_deployment --mock-external
```

## Deferred External Proof

Automated release readiness uses mocked external execution. One real external staging deploy remains deferred unless safe disposable GitHub and Cloudflare credentials and targets are available. The actionable blocker is to provision a disposable repository and web target, then run staging deploy and monitor without `--mock-external`.

## Not Included

* No new deployment system or runner family.
* No legacy deployment routes or compatibility aliases.
* No capacity-provider lanes, grants, worker pools, runtime hosts, Railway service ids, runner tokens, or provider secrets in web deployment UI/API/CLI output.
