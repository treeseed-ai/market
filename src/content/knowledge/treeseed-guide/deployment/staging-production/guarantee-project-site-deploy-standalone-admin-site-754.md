---
schemaVersion: treeseed.knowledge-page/v1
id: guide.guarantee.guarantee-project-site-deploy-standalone-admin-site-754
bookId: treeseed-guide
slug: deployment/staging-production/guarantee-project-site-deploy-standalone-admin-site-754
title: "Deploy the Standalone Admin Site"
summary: "Run Admin independently against the public API and published TreeDX-backed content runtime."
status: draft
visibility: public
order: 20
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
guaranteeIds: [guarantee.project.site.deploy-standalone-admin-site.754]
capabilityIds: []
routePatterns: [/app]
resourceTypes: [treeseed-guide]
actionIds: []
keywords: [admin, standalone site, Cloudflare, deployment]
documentationUrls: []
audiences: { primary: [operator, developer, ai-agent], secondary: [community], excluded: [] }
---

# Deploy the Standalone Admin Site

Admin owns its package-local application manifest and can build independently while Market continues to consume its plugin during migration. Its logical package knowledge hub remains under `docs/`, separate from the deployable app root.

This page documents `guarantee.project.site.deploy-standalone-admin-site.754`. Its current guarantee status is **planned** because hosted deployment remains suspended until reviewed OpenTofu acceptance restores the canonical automation.

[Back to Staging / Production](/t/treeseed/books/treeseed-guide/deployment/staging-production)
