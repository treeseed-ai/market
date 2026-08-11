---
schemaVersion: treeseed.knowledge-page/v1
id: guide.guarantee.guarantee-project-repository-federation-promote-exact-repository-receipts-813
bookId: treeseed-guide
slug: deployment/development/guarantee-project-repository-federation-promote-exact-repository-receipts-813
title: "Promote Exact Repository Federation Receipts"
summary: "Join independent repositories through verified exact-ref receipts rather than parent gitlinks."
status: draft
visibility: public
order: 1003
parentId: guide.deployment.development
tags: [deployment, development, guarantee]
contributors: []
relatedBookIds: [treeseed-platform-architecture-development]
relatedKnowledgeIds: [guide.deployment.development]
relatedNoteIds: []
relatedQuestionIds: []
relatedObjectiveIds: []
relatedProposalIds: []
relatedDecisionIds: []
guaranteeIds: [guarantee.project.repository-federation.promote-exact-repository-receipts.813]
capabilityIds: []
routePatterns: []
resourceTypes: [treeseed-guide]
actionIds: []
keywords: [repository federation, integration receipt, exact refs, worksets]
documentationUrls: []
audiences: { primary: [operator, developer, ai-agent], secondary: [community], excluded: [] }
---

# Promote Exact Repository Federation Receipts

Run `trsd save` inside one project to save only that independent repository and produce a repository-scoped receipt. When a coordinated change is ready, materialize the Platform workset and run `trsd save --federated`; that records canonical repository identities, exact commits, dependency edges, contract digests, verification dispositions, and fresh remote evidence.

Stage accepts only the federated receipt and rejects moved refs instead of reconstructing integration state from parent gitlinks. Release consumes the receipt-derived staging candidate. Clean-clone stage, close, release-plan, interruption, and recovery scenarios now pass without `.gitmodules`; this guarantee remains **planned** until its verifier is registered and produces repeatable evidence.

[Back to Development](/t/treeseed/books/treeseed-guide/deployment/development)
