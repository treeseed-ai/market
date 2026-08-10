---
schemaVersion: treeseed.knowledge-page/v1
id: guide.guarantee.guarantee-project-package-initialize-ai-appliance-package-752
bookId: treeseed-guide
slug: deployment/capacity/guarantee-project-package-initialize-ai-appliance-package-752
title: "Install and Verify the AI Appliance"
summary: "Install the private local inference appliance and verify its package, gateway, management, and reconciliation contracts."
status: draft
visibility: public
order: 8
parentId: guide.deployment.capacity
tags: [deployment, capacity, guarantee]
contributors: []
relatedBookIds: [treeseed-platform-architecture-development]
relatedKnowledgeIds: [guide.deployment.capacity]
relatedNoteIds: []
relatedQuestionIds: []
relatedObjectiveIds: []
relatedProposalIds: []
relatedDecisionIds: []
guaranteeIds: [guarantee.project.package.initialize-ai-appliance-package.752]
capabilityIds: []
routePatterns: []
resourceTypes: [treeseed-guide]
actionIds: []
keywords: [AI appliance, inference gateway, vLLM, hardware diagnostics]
documentationUrls: []
audiences: { primary: [operator, developer, ai-agent], secondary: [community], excluded: [] }
---

# Install and Verify the AI Appliance

Run `npm run verify` in `packages/ai` for the hardware-independent package gate, then use `treeseed-ai diagnose` before applying the SDK-reconciled vLLM resource on a supported NVIDIA host. The appliance remains private from package publication and owns no project scheduling or repository mutation.

This page documents the active `guarantee.project.package.initialize-ai-appliance-package.752`. Axolotl training and adapter promotion remain planned.

[Back to Capacity Deployment](/t/treeseed/books/treeseed-guide/deployment/capacity)
