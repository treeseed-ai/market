# Web Deployment Release Notes

TreeSeed exposes API and CLI contracts for governed project-web deployment records, operation lifecycle, monitoring, redaction, and audit. Provider mutation and provider-state verification must run through canonical reconciliation and real provider clients.

Hosted deployment acceptance is currently blocked by the intentional Railway and Cloudflare deployment suspension. Local plans and non-provider operation-lifecycle tests do not prove hosted deployment. No simulated external-provider execution is available or accepted as release evidence.

After the reviewed OpenTofu environments and disposable acceptance targets are restored, the required proof is:

```bash
npx trsd ready staging --json
npx trsd reconcile test-live --mode cleanup --provider all --environment staging --yes --json
npx trsd reconcile test-live --mode acceptance --provider all --environment staging --yes --json
npx trsd reconcile test-live --mode cleanup --provider all --environment staging --yes --json
```

Until that succeeds, hosted web deployment remains incomplete and must fail closed.
