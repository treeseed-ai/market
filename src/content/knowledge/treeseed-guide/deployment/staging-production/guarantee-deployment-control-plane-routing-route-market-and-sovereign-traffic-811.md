---
schemaVersion: treeseed.knowledge-page/v1
id: guide.guarantee.guarantee-deployment-control-plane-routing-route-market-and-sovereign-traffic-811
bookId: treeseed-guide
slug: deployment/staging-production/guarantee-deployment-control-plane-routing-route-market-and-sovereign-traffic-811
title: "Route Market and Sovereign Control-Plane Traffic"
summary: "Keep Market operations on api.treeseed.dev while routing Admin operations through the selected control plane."
status: draft
visibility: public
order: 100
parentId: guide.deployment.staging-production
tags: [deployment, staging-production, guarantee]
contributors: []
relatedBookIds: [treeseed-platform-architecture-development]
relatedKnowledgeIds: [guide.deployment.staging-production]
relatedNoteIds: []
relatedQuestionIds: []
relatedObjectiveIds: []
relatedProposalIds: []
relatedDecisionIds: []
guaranteeIds: [guarantee.deployment.control-plane-routing.route-market-and-sovereign-traffic.811]
capabilityIds: []
routePatterns: []
resourceTypes: [treeseed-guide]
actionIds: []
keywords: [market gateway, control plane, sovereign deployment]
documentationUrls: []
---

# Route Market and Sovereign Control-Plane Traffic

Registry, ecommerce, licensing, and ecosystem-governance calls always use `api.treeseed.dev`. Admin calls use that same gateway by default, or bypass it when an external or managed sovereign control plane is selected.

This guarantee remains **planned** until hosted gateway and sovereign no-replication acceptance evidence is repeatable.

[Back to Staging / Production](/t/treeseed/books/treeseed-guide/deployment/staging-production)
