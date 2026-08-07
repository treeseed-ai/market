---
schemaVersion: treeseed.knowledge-page/v1
id: guide.foundation.treedx
bookId: treeseed-guide
slug: foundation/treedx
title: "TreeDX"
summary: "How TreeDX exposes repository-native Markdown, structured frontmatter, and connected knowledge as a human- and machine-readable graph."
status: draft
visibility: public
order: 400
parentId: guide.foundation
groupIds:
  - foundation
  - frontmatter
  - guide
  - knowledge
  - treedx
contributors: []
relatedBookIds: [treeseed-platform-architecture-development]
relatedKnowledgeIds: ["guide.foundation","guide.foundation.purpose","guide.foundation.architecture","guide.foundation.frameworks","guide.deployment.knowledge","guide.content.projects-templates","guide.content.management","guide.content.export-integration","guide.work.agents","guide.security.authentication","guide.security.service-vault","architecture.auth-and-content-proxy","architecture.content-runtime-architecture","architecture.overlay-editing-architecture"]
relatedNoteIds: []
relatedQuestionIds: []
relatedObjectiveIds: []
relatedProposalIds: []
relatedDecisionIds: []
guaranteeIds: []
capabilityIds: []
routePatterns: []
resourceTypes: [treeseed-guide, knowledge-graph]
actionIds: []
keywords: ["TreeDX","Markdown","MDX","frontmatter","knowledge graph","repository workspace","content routing"]
documentationUrls: []
audiences:
  primary: [community, developer, ai-agent]
  secondary: [operator]
  excluded: []
---

# TreeDX

TreeDX is TreeSeed's product-neutral knowledge access and graph substrate. Repository-native Markdown and MDX bodies remain readable by people, while parsed frontmatter exposes stable IDs, hierarchy, relationships, guarantees, capabilities, routes, and resources to machines.

A knowledge page's `parentId` places it in a book tree. `relatedKnowledgeIds` connect it across sections and books. Repository workspaces and content routing let authorized operations discover and update content without bypassing TreeDX. Frontmatter must survive those operations intact so the graph and the document remain one durable artifact.

Continue with [Deployment Knowledge](../deployment/knowledge), [Projects / Templates](../content/projects-templates), [Management](../content/management), [Export / Integration](../content/export-integration), and [Agents](../work/agents). Security-sensitive access is covered by [Authentication](../security/authentication) and [Service Vault](../security/service-vault).

The architecture book provides deeper treatment in [Authentication and content proxy](/t/treeseed/books/platform-architecture-development/auth-and-content-proxy), [Content runtime architecture](/t/treeseed/books/platform-architecture-development/content-runtime-architecture), and [Overlay editing architecture](/t/treeseed/books/platform-architecture-development/overlay-editing-architecture).

[Back to Foundation](/t/treeseed/books/treeseed-guide/foundation)
