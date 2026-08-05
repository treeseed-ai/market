# TreeDX Performance Modernization

## Production objective

Public reader traffic must be served from the immutable publication plane. Warm repository reads have a 100 ms p99 budget, repository queries 250 ms, and graph queries 500 ms. The single-node release profile must sustain at least 500 primary requests per second for ten minutes with no correctness failures. Three public federation nodes are the initial desired capacity; scaling may grow to twelve nodes through reconciliation after hosted deployment suspension is lifted.

These are release gates, not timeout values. Queue waits are capped at 250 ms for repository queries and 500 ms for graph queries so overload fails quickly and can be retried or shifted instead of consuming every scheduler and returning seconds later.

## Canonical request path

1. Git and TreeDX remain the mutable source and operational graph planes.
2. The operations runner snapshots only the changed project at an exact commit. An initial publication snapshots the team; later publications retain unchanged manifest entries and immutable objects.
3. The API verifies the atomic manifest once per digest, loads immutable objects with bounded concurrency, and coalesces concurrent catalog loads.
4. The reader endpoint returns one selected page plus compact navigation metadata. It never sends every page body.
5. Core coalesces anonymous server-side requests and conditionally revalidates by ETag. Authenticated responses remain request-specific and uncached.
6. Public HTML remains eligible for the existing Cloudflare cache policy because middleware does not create a CSRF cookie on anonymous reads. Forms and authenticated layouts create CSRF state at their owning surface.

There is no direct-filesystem reader fallback and no second publication implementation.

## TreeDX hot paths

- A direct document read resolves exactly one Git blob. Repository-wide traversal is reserved for explicit search/index operations.
- ETS cache misses use per-key single-flight loading, preventing concurrent cold requests from rebuilding the same value.
- Authorized repository contexts coalesce durable catalog lookup and Git ref resolution for 250 ms. Authorization still runs on every request, while static publication traffic avoids repeating identical storage work.
- Graph indexes are decoded into Rust resources once per cached graph version. Query NIFs receive the resource and decode only the small request.
- Append-only storage builds its in-process current-record indexes during service initialization, keyed by log path and record ID. Point reads no longer replay full log history; external replacement, restore, migration, or compaction invalidates the index through file metadata and causes a validated rebuild.
- Tree-path discovery follows every cursor while pinning the first resolved commit, preventing both silent truncation and mixed-revision catalogs.

## Resource model

The API-owned `treeseed.site.yaml` declares CPU, memory, cache fraction, worker counts, queue bounds, and queue deadlines. SDK reconciliation is the only owner that translates those values into TreeDX runtime variables. Both the hosting graph and Railway service compiler consume one SDK helper so they cannot drift.

The initial per-node shape is four scheduler CPUs, 4 GiB memory, a 35% cache budget, thirty-two repository-query workers, and four graph workers. This is desired state only while hosted deployment remains suspended; no provider mutation is authorized by this document or the implementation.

## Verification and rollout

- Unit and contract suites verify exact-ref pagination, incremental publication retention, compact reader contracts, cache coalescing, public cache eligibility, and resource-variable compilation.
- Reader responses expose bounded `Server-Timing` phases for catalog loading and authorization so edge/API traces can distinguish storage misses from policy work without logging content or identities.
- Prometheus recording and alert rules retain route RPS, p95/p99 latency, error ratio, cache hit ratio, worker-pool rejection, audit failure, and runtime resource pressure over time. Main, staging, and tagged performance reports remain durable release artifacts for per-revision comparison.
- Rust graph, store, and native tests cover the native hot path; Elixir cache and graph suites cover BEAM integration.
- The TreeDX performance profile enforces p99 category budgets and 500 primary RPS on both amd64 and arm64. It no longer substitutes an errors-only budget or clears the throughput failure threshold.
- Before hosted rollout resumes, run the local ten-minute performance profile on production-shaped fixtures, then the canonical read-only Railway observation and isolated acceptance lifecycle. Increase node count only from evidence such as queue depth, cache hit rate, p99, CPU, and memory—not from request count alone.

The API latency guarantee remains planned until the full production-shaped profile and hosted acceptance evidence are available. It must not be marked active from unit tests alone.
