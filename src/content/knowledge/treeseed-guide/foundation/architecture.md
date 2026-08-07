---
schemaVersion: treeseed.knowledge-page/v1
id: guide.foundation.architecture
bookId: treeseed-guide
slug: foundation/architecture
title: "Architecture"
summary: "A high-level map of TreeSeed ownership, control-plane, content, runtime, and interaction boundaries."
status: draft
visibility: public
order: 200
parentId: guide.foundation
groupIds:
  - architecture
  - foundation
  - guide
contributors: []
relatedBookIds: [treeseed-platform-architecture-development]
relatedKnowledgeIds: ["guide.foundation","guide.foundation.purpose","guide.foundation.frameworks","guide.foundation.treedx","guide.foundation.platform","guide.deployment","guide.deployment.knowledge","guide.security","guide.content","guide.work","guide.governance","guide.market","architecture.auth-and-content-proxy","architecture.content-runtime-architecture","architecture.notification-architecture","architecture.overlay-editing-architecture","architecture.ui-architecture","architecture.ui-foundation-baseline","architecture.commons-governance","architecture.ecommerce"]
relatedNoteIds: []
relatedQuestionIds: []
relatedObjectiveIds: []
relatedProposalIds: []
relatedDecisionIds: []
guaranteeIds: []
capabilityIds: []
routePatterns: []
resourceTypes: [treeseed-guide, platform-architecture]
actionIds: []
keywords: ["TreeSeed architecture","ownership","control plane","content runtime"]
documentationUrls: []
audiences:
  primary: [community, developer, ai-agent]
  secondary: [operator]
  excluded: []
---

# Architecture

TreeSeed separates portable contracts, user interfaces, hosted applications, durable control-plane records, agent execution, operator workflows, and product-neutral knowledge storage into explicit owners. Projects hold knowledge and define work; teams establish participation and authority; platform services coordinate authenticated access, deployment, capacity, evidence, and governance.

The [Deployment](../deployment), [Security](../security), [Content](../content), [Work](../work), [Governance](../governance), and [Market](../market) sections describe the guarantees at each operational boundary. [Frameworks](./frameworks) names the major implementation roles, while [Platform](./platform) shows how the product concepts connect.

Detailed contributor references remain in the [TreeSeed Platform Architecture and Development](/t/treeseed/books/platform-architecture-development) book:

- [Authentication and content proxy](/t/treeseed/books/platform-architecture-development/auth-and-content-proxy)
- [Content runtime architecture](/t/treeseed/books/platform-architecture-development/content-runtime-architecture)
- [Notification architecture](/t/treeseed/books/platform-architecture-development/notification-architecture)
- [Overlay editing architecture](/t/treeseed/books/platform-architecture-development/overlay-editing-architecture)
- [UI architecture](/t/treeseed/books/platform-architecture-development/ui-architecture)
- [UI foundation baseline](/t/treeseed/books/platform-architecture-development/ui-foundation-baseline)
- [Commons governance](/t/treeseed/books/platform-architecture-development/commons-governance)
- [Ecommerce platform](/t/treeseed/books/platform-architecture-development/ecommerce)

[Back to Foundation](/t/treeseed/books/treeseed-guide/foundation)
