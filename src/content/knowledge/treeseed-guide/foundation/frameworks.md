---
schemaVersion: treeseed.knowledge-page/v1
id: guide.foundation.frameworks
bookId: treeseed-guide
slug: foundation/frameworks
title: "Frameworks"
summary: "The major package and runtime responsibilities that compose the TreeSeed platform."
status: draft
visibility: public
order: 300
parentId: guide.foundation
tags: ["foundation","frameworks","packages","guide"]
contributors: []
relatedBookIds: [treeseed-platform-architecture-development]
relatedKnowledgeIds: ["guide.foundation","guide.foundation.purpose","guide.foundation.architecture","guide.foundation.treedx","guide.foundation.platform","guide.deployment.development","guide.content.projects-templates","guide.work.agents","architecture.ui-architecture","architecture.ui-foundation-baseline","architecture.content-runtime-architecture"]
relatedNoteIds: []
relatedQuestionIds: []
relatedObjectiveIds: []
relatedProposalIds: []
relatedDecisionIds: []
guaranteeIds: []
capabilityIds: []
routePatterns: []
resourceTypes: [treeseed-guide, platform-framework]
actionIds: []
keywords: ["TreeSeed frameworks","SDK","Core","UI","Admin","API","Agent","CLI","Reviewer","Astro","Starlight","TreeDX"]
documentationUrls: []
audiences:
  primary: [community, developer, ai-agent]
  secondary: [operator]
  excluded: []
---

# Frameworks

TreeSeed composes focused packages and runtimes. The SDK owns portable platform and reconciliation contracts. UI owns reusable presentation. Core composes Astro and Starlight knowledge sites. Admin provides authenticated management surfaces. API owns durable control-plane behavior. Agent runs project-defined work on provider capacity. CLI exposes operator workflows, and Reviewer supports local evidence review. Market is the root hosted tenant. TreeDX remains the product-neutral repository and graph substrate.

These boundaries let projects and templates remain portable while hosted services, local development, and capacity providers use the same contracts. See [Development](../deployment/development), [Projects / Templates](../content/projects-templates), and [Agents](../work/agents) for their guarantee-backed user journeys.

Detailed interface and runtime composition belongs in the architecture book's [UI architecture](/t/treeseed/books/platform-architecture-development/ui-architecture), [UI foundation baseline](/t/treeseed/books/platform-architecture-development/ui-foundation-baseline), and [Content runtime architecture](/t/treeseed/books/platform-architecture-development/content-runtime-architecture) pages.

[Back to Foundation](/t/treeseed/books/treeseed-guide/foundation)
