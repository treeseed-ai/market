---
schemaVersion: treeseed.knowledge-page/v1
id: guide.guarantee.guarantee-project-treedx-preserve-markdown-frontmatter-730
bookId: treeseed-guide
slug: deployment/knowledge/guarantee-project-treedx-preserve-markdown-frontmatter-730
title: "Preserve Markdown Frontmatter Through TreeDX"
summary: "Preserve complete structured Markdown and MDX frontmatter consistently through TreeDX repository and graph operations."
status: draft
visibility: public
order: 4
parentId: guide.deployment.knowledge
tags: ["deployment","knowledge","guarantee"]
contributors: []
relatedBookIds: [treeseed-platform-architecture-development]
relatedKnowledgeIds: ["guide.deployment.knowledge"]
relatedNoteIds: [note:market:editorial:treeseed-guide:evidence:frontmatter-preservation]
relatedQuestionIds: []
relatedObjectiveIds: []
relatedProposalIds: []
relatedDecisionIds: []
guaranteeIds: ["guarantee.project.treedx.preserve-markdown-frontmatter.730"]
capabilityIds: []
routePatterns: []
resourceTypes: [treeseed-guide]
actionIds: []
keywords: ["Preserve Markdown Frontmatter Through TreeDX","deployment","knowledge"]
documentationUrls: []
audiences:
  primary: [developer, operator, ai-agent]
  secondary: [community]
  excluded: []
---

# Preserve Markdown Frontmatter Through TreeDX

## What this guarantee promises

This planned guarantee defines an important content boundary: Markdown and MDX frontmatter must survive repository reads, graph indexing, workspace edits, and publication as structured data rather than being flattened into body text.

The guarantee is not active yet. TreeDX and TreeSeed contain supporting parser and graph behavior, but the guarantee has no integrated API verifier and therefore must not be presented as release-proven.

## When to use it

Use this guidance when creating or diagnosing books, knowledge pages, notes, objectives, questions, proposals, decisions, or agent definitions. These models depend on frontmatter for stable identity, status, ownership, relationships, audience, guarantees, and machine retrieval.

## Before you begin

- Work against an exact repository or workspace revision.
- Confirm that the document begins with a closed YAML frontmatter block.
- Keep the top level as a mapping rather than a scalar or list.
- Know which SDK content model and schema version owns the document.

## Procedure

1. Read the document through the assignment-scoped TreeDX repository or workspace operation.
2. Inspect the parsed frontmatter returned with the document; do not infer metadata from rendered Markdown.
3. Preserve nested objects, arrays, booleans, numbers, and relationship identifiers when updating the body or metadata.
4. Validate the resulting document against its TreeSeed content model before committing it.
5. Commit through the TreeDX workspace and read the exact committed revision back.
6. Refresh or query the graph and confirm that identity and relationship fields match the committed frontmatter.

When TreeDX reports invalid or missing frontmatter for a document that requires it, stop the content workflow and repair the document. A body-only fallback would discard machine-readable authority.

## Expected result

Repository reads, workspace reads, graph nodes, and the committed document agree on the complete structured frontmatter. Stable IDs and relationship arrays remain queryable, while the Markdown body remains independently readable by people.

## Safety and recovery

- Do not publish from an unverified working copy or mixed revision.
- Do not silently replace invalid frontmatter with an empty object.
- Preserve the last reviewed commit when parsing or graph refresh fails.
- Reopen review whenever a repair changes the reviewed content revision or its editorial context digest.

## Verification status

Status: **planned**.

TreeDX has focused Rust coverage for structured YAML, nested values, invalid frontmatter diagnostics, and graph preservation. The SDK parses frontmatter for content and graph operations, and the API rejects federated knowledge documents when TreeDX omits parsed frontmatter. The owning guarantee remains planned because no integrated API verifier is registered.

See the linked [editorial evidence note](/t/treeseed/notes/editorial/books/treeseed-guide/evidence/deployment/knowledge/treedx/frontmatter-preservation) for the current source map and limitations.

## Related guarantees

- [Configure TreeDX Routing](/t/treeseed/books/treeseed-guide/deployment/knowledge/guarantee-project-treedx-configure-treedx-routing-088)
- [Verify TreeDX Access](/t/treeseed/books/treeseed-guide/deployment/knowledge/guarantee-project-treedx-verify-treedx-access-089)
- [DX Repository Workspace Endpoint Reliability](/t/treeseed/books/treeseed-guide/deployment/knowledge/guarantee-api-endpoints-dx-repository-workspaces-409)

[Back to Knowledge](/t/treeseed/books/treeseed-guide/deployment/knowledge)
