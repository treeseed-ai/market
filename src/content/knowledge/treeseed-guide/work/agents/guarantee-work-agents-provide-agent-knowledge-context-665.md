---
schemaVersion: treeseed.knowledge-page/v1
id: guide.guarantee.guarantee-work-agents-provide-agent-knowledge-context-665
bookId: treeseed-guide
slug: work/agents/guarantee-work-agents-provide-agent-knowledge-context-665
title: "Provide agent knowledge context"
summary: "Guarantee that TreeSeed can provide agent knowledge context."
status: draft
visibility: public
order: 36
parentId: guide.work.agents
tags: ["work","agents","guarantee"]
contributors: []
relatedBookIds: [treeseed-platform-architecture-development]
relatedKnowledgeIds: ["guide.work.agents","guide.foundation.treedx","guide.deployment.knowledge"]
relatedNoteIds: ["note:market:editorial:core","note:market:editorial:treeseed-guide:core"]
relatedQuestionIds: []
relatedObjectiveIds: []
relatedProposalIds: []
relatedDecisionIds: []
guaranteeIds: ["guarantee.work.agents.provide-agent-knowledge-context.665"]
capabilityIds: []
routePatterns: []
resourceTypes: [treeseed-guide]
actionIds: []
keywords: ["Provide agent knowledge context","work","agents"]
documentationUrls: []
audiences:
  primary: [developer, operator, ai-agent]
  secondary: [community]
  excluded: []
---

# Provide agent knowledge context

## What this guarantee promises

TreeSeed intends every agent assignment to receive a bounded, deterministic context rather than an untraceable copy of the repository. For Guide editorial work, that context begins with the core objective and then narrows through the project editorial core, book editorial core, chapter brief, target page, graph neighborhood, guarantees, evidence, and assignment instructions.

This is the intended contract of `guarantee.work.agents.provide-agent-knowledge-context.665`. The guarantee remains **planned** until an integrated verifier proves the full runtime path repeatedly. The current implementation and focused contract tests are supporting evidence, not an active product promise.

## When to use it

## Before you begin

## Procedure

## Expected result

## Safety and recovery

## Verification status

## Related guarantees

[Back to Agents](/t/treeseed/books/treeseed-guide/work/agents)
Use this contract when defining an agent assignment, investigating why an agent received a source, reviewing an editorial artifact, or deciding whether a reviewed draft may be published.

Community readers can use the provenance record to understand what informed an agent. Developers extend the SDK context contract and Agent runtime resolver. Operators inspect context identifiers, revisions, retrieval reasons, and digests in execution traces. AI agents must treat the compiled pack as bounded assignment context, not permission to widen their scope.
The assignment must identify its agent, activity profile, workday, and objective. Guide drafting additionally requires an unambiguous project editorial core, Guide book core, and approved chapter brief. Every supplied layer must have a stable identity, exact revision or digest, retrieval reason, and source location.

Missing core context blocks work. Missing evidence produces research or a linked question. Mixed revisions block review and publication.
1. Resolve the core objective and project editorial core through TreeDX.
2. For Guide work, resolve the book editorial core and applicable chapter brief.
3. Resolve the target page plus only the parent, children, related pages, guarantees, evidence, and sources needed for the assignment.
4. Compile the layers in canonical order as `treeseed.editorial-context/v1` and compute its digest.
5. Attach the context provenance to the work package and durable execution trace.
6. Require reviews and publication to cite the same content revision and context digest.
The agent receives a narrowly scoped context pack whose ordering and digest are deterministic. An operator can explain why every layer was included. A stale or mixed context cannot pass editorial review or exact-revision publication.
Do not insert secrets, unrestricted repository snapshots, or unrelated personal information into a context pack. Narrow retrieval by role and assignment. If a required layer is absent or ambiguous, stop the affected activity rather than selecting an arbitrary source.

Recover by correcting the canonical content or assignment reference and compiling a new pack. A changed pack has a new digest and invalidates approvals based on the previous context.
Status: **planned**. SDK context compilation, TreeDX-backed Agent resolution, trace provenance, and API editorial gates are implemented with focused tests. The guarantee remains non-active until its verifier references cover the integrated assignment, trace, review, stale-context rejection, and publication paths.
See [TreeDX](/t/treeseed/books/treeseed-guide/foundation/treedx), [Deployment Knowledge](/t/treeseed/books/treeseed-guide/deployment/knowledge), and the adjacent guarantees for TreeDX proxy access, assignment-scoped authorization, and complete execution traces.
