---
schemaVersion: treeseed.knowledge-page/v1
id: guide.work.agents
bookId: treeseed-guide
slug: work/agents
title: "Agents"
summary: "Agents usage and guarantees."
status: draft
visibility: public
order: 100
parentId: guide.work
tags: ["work","agents","guide"]
contributors: []
relatedBookIds: [treeseed-platform-architecture-development]
relatedKnowledgeIds: ["guide.work","guide.foundation.frameworks","guide.foundation.treedx","guide.foundation.platform","guide.deployment.knowledge","guide.guarantee.guarantee-agent-architecture-capture-question-tool-events-304","guide.guarantee.guarantee-agent-architecture-enforce-activity-profile-tool-scope-303","guide.guarantee.guarantee-agent-architecture-enforce-assignment-feature-branch-policy-305","guide.guarantee.guarantee-agent-architecture-normalize-activity-profile-agent-300","guide.guarantee.guarantee-agent-architecture-produce-structured-estimate-306","guide.guarantee.guarantee-agent-architecture-register-clean-handlers-only-302","guide.guarantee.guarantee-agent-architecture-reject-legacy-agent-config-301","guide.guarantee.guarantee-agent-content-link-generated-note-to-subject-155","guide.guarantee.guarantee-agent-content-read-context-through-treedx-proxy-153","guide.guarantee.guarantee-agent-content-write-artifact-through-treedx-proxy-154","guide.guarantee.guarantee-agent-control-plane-create-provider-assignment-172","guide.guarantee.guarantee-agent-control-plane-persist-agent-mode-run-174","guide.guarantee.guarantee-agent-control-plane-persist-provider-availability-session-171","guide.guarantee.guarantee-agent-control-plane-persist-usage-actual-175","guide.guarantee.guarantee-agent-control-plane-transition-assignment-lease-state-173","guide.guarantee.guarantee-agent-execution-provider-run-codex-provider-156","guide.guarantee.guarantee-agent-execution-provider-run-discord-provider-158","guide.guarantee.guarantee-agent-execution-provider-run-github-issues-provider-157","guide.guarantee.guarantee-agent-execution-provider-run-jira-provider-159","guide.guarantee.guarantee-agent-execution-provider-run-workflow-provider-160","guide.guarantee.guarantee-agent-graph-block-acting-until-graph-ready-311","guide.guarantee.guarantee-agent-graph-compile-decision-assignment-graph-310","guide.guarantee.guarantee-agent-graph-release-downstream-after-deliverable-approval-312","guide.guarantee.guarantee-agent-kernel-block-acting-without-approved-decision-150","guide.guarantee.guarantee-agent-kernel-release-active-leases-152","guide.guarantee.guarantee-agent-kernel-run-acting-mode-with-approved-decision-151","guide.guarantee.guarantee-agent-kernel-run-planning-mode-149","guide.guarantee.guarantee-agent-runtime-enforce-provider-local-budget-161","guide.guarantee.guarantee-agent-runtime-report-runtime-readiness-162","guide.guarantee.guarantee-agent-treedx-authorize-assignment-scoped-proxy-177","guide.guarantee.guarantee-agent-treedx-deny-cross-project-proxy-access-178","guide.guarantee.guarantee-work-agents-configure-agent-tools-and-permissions-664","guide.guarantee.guarantee-work-agents-configure-an-agent-class-663","guide.guarantee.guarantee-work-agents-create-a-project-agent-662","guide.guarantee.guarantee-work-agents-inspect-a-complete-agent-execution-trace-670","guide.guarantee.guarantee-work-agents-provide-agent-knowledge-context-665","guide.guarantee.guarantee-work-agents-recover-a-failed-agent-execution-669","guide.guarantee.guarantee-work-agents-review-an-agent-estimate-668","guide.guarantee.guarantee-work-agents-run-an-agent-in-acting-mode-667","guide.guarantee.guarantee-work-agents-run-an-agent-in-planning-mode-666"]
relatedNoteIds: []
relatedQuestionIds: []
relatedObjectiveIds: []
relatedProposalIds: []
relatedDecisionIds: []
guaranteeIds: []
capabilityIds: []
routePatterns: []
resourceTypes: [treeseed-guide]
actionIds: []
keywords: ["Agents","work","agents"]
documentationUrls: []
audiences:
  primary: [operator, developer, ai-agent]
  secondary: [community]
  excluded: []
---

# Agents

[Back to Work](/t/treeseed/books/treeseed-guide/work)

## In this section

- [Capture Question Tool Events](/t/treeseed/books/treeseed-guide/work/agents/guarantee-agent-architecture-capture-question-tool-events-304)
- [Enforce Activity Profile Tool Scope](/t/treeseed/books/treeseed-guide/work/agents/guarantee-agent-architecture-enforce-activity-profile-tool-scope-303)
- [Enforce Assignment Feature Branch Policy](/t/treeseed/books/treeseed-guide/work/agents/guarantee-agent-architecture-enforce-assignment-feature-branch-policy-305)
- [Normalize Activity Profile Agent](/t/treeseed/books/treeseed-guide/work/agents/guarantee-agent-architecture-normalize-activity-profile-agent-300)
- [Produce Structured Estimate](/t/treeseed/books/treeseed-guide/work/agents/guarantee-agent-architecture-produce-structured-estimate-306)
- [Register Clean Handlers Only](/t/treeseed/books/treeseed-guide/work/agents/guarantee-agent-architecture-register-clean-handlers-only-302)
- [Reject Legacy Agent Config](/t/treeseed/books/treeseed-guide/work/agents/guarantee-agent-architecture-reject-legacy-agent-config-301)
- [Link Generated Note To Subject](/t/treeseed/books/treeseed-guide/work/agents/guarantee-agent-content-link-generated-note-to-subject-155)
- [Read Context Through Treedx Proxy](/t/treeseed/books/treeseed-guide/work/agents/guarantee-agent-content-read-context-through-treedx-proxy-153)
- [Write Artifact Through Treedx Proxy](/t/treeseed/books/treeseed-guide/work/agents/guarantee-agent-content-write-artifact-through-treedx-proxy-154)
- [Create Provider Assignment](/t/treeseed/books/treeseed-guide/work/agents/guarantee-agent-control-plane-create-provider-assignment-172)
- [Persist Agent Mode Run](/t/treeseed/books/treeseed-guide/work/agents/guarantee-agent-control-plane-persist-agent-mode-run-174)
- [Persist Provider Availability Session](/t/treeseed/books/treeseed-guide/work/agents/guarantee-agent-control-plane-persist-provider-availability-session-171)
- [Persist Usage Actual](/t/treeseed/books/treeseed-guide/work/agents/guarantee-agent-control-plane-persist-usage-actual-175)
- [Transition Assignment Lease State](/t/treeseed/books/treeseed-guide/work/agents/guarantee-agent-control-plane-transition-assignment-lease-state-173)
- [Run Codex Provider](/t/treeseed/books/treeseed-guide/work/agents/guarantee-agent-execution-provider-run-codex-provider-156)
- [Run Discord Provider](/t/treeseed/books/treeseed-guide/work/agents/guarantee-agent-execution-provider-run-discord-provider-158)
- [Run Github Issues Provider](/t/treeseed/books/treeseed-guide/work/agents/guarantee-agent-execution-provider-run-github-issues-provider-157)
- [Run Jira Provider](/t/treeseed/books/treeseed-guide/work/agents/guarantee-agent-execution-provider-run-jira-provider-159)
- [Run Workflow Provider](/t/treeseed/books/treeseed-guide/work/agents/guarantee-agent-execution-provider-run-workflow-provider-160)
- [Block Acting Until Graph Ready](/t/treeseed/books/treeseed-guide/work/agents/guarantee-agent-graph-block-acting-until-graph-ready-311)
- [Compile Decision Assignment Graph](/t/treeseed/books/treeseed-guide/work/agents/guarantee-agent-graph-compile-decision-assignment-graph-310)
- [Release Downstream After Deliverable Approval](/t/treeseed/books/treeseed-guide/work/agents/guarantee-agent-graph-release-downstream-after-deliverable-approval-312)
- [Block Acting Without Approved Decision](/t/treeseed/books/treeseed-guide/work/agents/guarantee-agent-kernel-block-acting-without-approved-decision-150)
- [Release Active Leases](/t/treeseed/books/treeseed-guide/work/agents/guarantee-agent-kernel-release-active-leases-152)
- [Run Acting Mode With Approved Decision](/t/treeseed/books/treeseed-guide/work/agents/guarantee-agent-kernel-run-acting-mode-with-approved-decision-151)
- [Run Planning Mode](/t/treeseed/books/treeseed-guide/work/agents/guarantee-agent-kernel-run-planning-mode-149)
- [Enforce Provider Local Budget](/t/treeseed/books/treeseed-guide/work/agents/guarantee-agent-runtime-enforce-provider-local-budget-161)
- [Report Capacity Provider Runtime Readiness](/t/treeseed/books/treeseed-guide/work/agents/guarantee-agent-runtime-report-runtime-readiness-162)
- [Authorize Assignment Scoped Proxy](/t/treeseed/books/treeseed-guide/work/agents/guarantee-agent-treedx-authorize-assignment-scoped-proxy-177)
- [Deny Cross Project Proxy Access](/t/treeseed/books/treeseed-guide/work/agents/guarantee-agent-treedx-deny-cross-project-proxy-access-178)
- [Configure agent tools and permissions](/t/treeseed/books/treeseed-guide/work/agents/guarantee-work-agents-configure-agent-tools-and-permissions-664)
- [Configure an agent class](/t/treeseed/books/treeseed-guide/work/agents/guarantee-work-agents-configure-an-agent-class-663)
- [Create a project agent](/t/treeseed/books/treeseed-guide/work/agents/guarantee-work-agents-create-a-project-agent-662)
- [Inspect a complete agent execution trace](/t/treeseed/books/treeseed-guide/work/agents/guarantee-work-agents-inspect-a-complete-agent-execution-trace-670)
- [Provide agent knowledge context](/t/treeseed/books/treeseed-guide/work/agents/guarantee-work-agents-provide-agent-knowledge-context-665)
- [Recover a failed agent execution](/t/treeseed/books/treeseed-guide/work/agents/guarantee-work-agents-recover-a-failed-agent-execution-669)
- [Review an agent estimate](/t/treeseed/books/treeseed-guide/work/agents/guarantee-work-agents-review-an-agent-estimate-668)
- [Run an agent in acting mode](/t/treeseed/books/treeseed-guide/work/agents/guarantee-work-agents-run-an-agent-in-acting-mode-667)
- [Run an agent in planning mode](/t/treeseed/books/treeseed-guide/work/agents/guarantee-work-agents-run-an-agent-in-planning-mode-666)
