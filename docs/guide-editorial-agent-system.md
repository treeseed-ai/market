# TreeSeed Guide Editorial Agent System

This document defines the canonical operating model for maintaining the TreeSeed Guide. It specializes the existing TreeSeed agent runtime, workdays, TreeDX content access, governance, and exact-revision publication flow; it does not create a parallel documentation orchestrator.

The binding principle is:

> Agent identities remain stable; each assignment receives a narrowly compiled, revision-pinned knowledge context.

## Authority and workflow

The human Book Owner approves the project and book editorial cores, structural changes, chapter briefs, disputed claims, chapter gates, and the exact revision proposed for publication. The Guide Steward coordinates work but has no approval or publication authority.

Editorial artifacts move through this dependency chain:

```text
objective and editorial cores
  -> approved chapter brief
  -> graph and coverage analysis
  -> evidence and claim ledger
  -> draft
  -> independent technical review
  -> independent audience review
  -> graph review when structure changes
  -> revision
  -> human exact-revision approval
  -> publication
  -> workday report and maintenance queue
```

No agent may research, author, approve, and publish the same artifact. Publication fails closed if content, evidence context, editorial cores, chapter brief, or approval revision changes.

## Standing roles

| Agent class | Primary responsibility | May not |
| --- | --- | --- |
| `guide-steward` | narrative, priorities, cores, and chapter briefs | self-approve or publish |
| `knowledge-cartography` | taxonomy, graph health, coverage, and relationships | invent behavior or make unapproved structural changes |
| `evidence-research` | internal/external evidence, claim status, contradictions, and questions | mutate canonical Guide pages |
| `guide-writing` | evidence-grounded drafts and navigation | self-review, publish, or fill evidence gaps with plausible prose |
| `technical-verification` | claims, guarantees, commands, ownership, risks, and status | author and independently approve the same draft |
| `audience-review` | community, developer, operator, and AI-agent usefulness | override technical rejection |
| `knowledge-publication` | exact approved revision and graph closure | rewrite during publication or bypass a gate |
| `editorial-reporting` | durable workday outcomes, costs, failures, and next work | alter canonical pages |

Engineer, Tester, security, and operator expertise can be assigned as bounded subject-matter reviews. They do not form a separate management hierarchy.

## Editorial needs and audience lenses

Work is evaluated in this order: governance and safety; truth and provenance; structure and retrieval; audience usefulness; narrative coherence; editorial and operational quality; publication integrity; then maintenance and learning. A higher-quality presentation never compensates for an unsupported claim or an unauthorized mutation.

Each page declares primary, secondary, and intentionally excluded audiences. Review applies four lenses—community, developer, operator, and AI agent—but does not require four duplicate prose sections. Separate audience pages are justified only by materially different workflows, disclosure needs, or machine contracts.

## Deterministic context

The SDK owns `treeseed.editorial-context/v1` and the page, book, audience, review, and context contracts. The Agent runtime resolves production context through TreeDX and compiles these layers in canonical order:

1. core project objective;
2. project editorial core;
3. Guide book editorial core;
4. applicable chapter brief;
5. target page;
6. parent, children, and selected related pages;
7. relevant guarantees and their statuses;
8. evidence notes and claim ledger;
9. relevant architecture, source, tests, releases, and external sources;
10. exact assignment instructions and output contract.

Every layer records its stable ID, revision, source identity, retrieval reason, and digest. The compiled context digest is carried in the work package and durable mode-run trace. Role-specific retrieval narrows the pack: graph metadata for the Cartographer, evidence and source policy for the Researcher, approved brief and adjacent narrative for the Writer, exact claims and evidence for reviewers, and the approval closure for publication.

Missing objective or ambiguous editorial cores block all affected work. Missing chapter briefs permit gap research but block canonical drafting. Missing evidence creates a question or research assignment. Mixed revisions and stale approvals block review or publication.

## Review and publication contract

The API owns durable editorial review state and exact-revision publication. A Guide submission requires a SHA-256 context digest. Technical and audience reviews must independently approve the exact author, content revision, and context digest. Structural Guide changes additionally require graph approval. One reviewer cannot fill multiple required review roles for the same submission, and the author cannot review the submission.

Human approval is recorded only after the editorial closure succeeds. The operations runner rechecks that closure before publication. Git remains canonical history, TreeDX remains the content and graph plane, and PostgreSQL stores review and publication workflow metadata.

## Content organization

The project core is `src/content/notes/editorial/core.mdx`. The Guide core, chapter briefs, evidence, reviews, and reports are grouped beneath `src/content/notes/editorial/books/treeseed-guide/`. Questions, proposals, and decisions use equivalent book/chapter/subsection/domain grouping. Direct directory counts target eight files and must not exceed ten; semantic domain directories are introduced before that limit.

The first end-to-end pilot is Deployment / Knowledge because it joins TreeDX routing and frontmatter, authentication, developer integration, operator verification, and machine-readable context. Planned guarantees must remain explicitly planned until repeatable integrated verifier evidence exists.

## Workday outcome

A normal editorial workday orients, plans with every eligible agent before repetition, researches, drafts only from an approved brief and adequate evidence, performs independent reviews, requests human approval, publishes the exact approved revision, and records its results. Research-only or blocked workdays are valid when they leave durable evidence, questions, reviews, or plans.

The report records pages assessed or changed, context revisions, evidence, graph and audience effects, review outcomes, questions, blockers, capacity usage, unfinished assignments, freshness risks, and a prioritized next queue.
