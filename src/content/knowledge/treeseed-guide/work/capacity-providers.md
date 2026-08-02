---
schemaVersion: treeseed.knowledge-page/v1
id: guide.work.capacity-providers
bookId: treeseed-guide
slug: work/capacity-providers
title: "Capacity Providers"
summary: "Capacity Providers usage and guarantees."
status: draft
visibility: public
order: 200
parentId: guide.work
tags: ["work","capacity-providers","guide"]
contributors: []
relatedBookIds: [treeseed-platform-architecture-development]
relatedKnowledgeIds: ["guide.work","guide.foundation.platform","guide.deployment.capacity","guide.guarantee.guarantee-agent-control-plane-settle-capacity-ledger-once-176","guide.guarantee.guarantee-agent-graph-enforce-mode-split-capacity-314","guide.guarantee.guarantee-agent-graph-reserve-planning-capacity-313","guide.guarantee.guarantee-api-endpoints-capacity-and-provider-control-plane-406","guide.guarantee.guarantee-capacity-assignment-complete-assignment-146","guide.guarantee.guarantee-capacity-assignment-fail-assignment-147","guide.guarantee.guarantee-capacity-assignment-inspect-assignment-leases-082","guide.guarantee.guarantee-capacity-assignment-integrate-reviewed-agent-checkpoint-512","guide.guarantee.guarantee-capacity-assignment-poll-next-assignment-143","guide.guarantee.guarantee-capacity-assignment-preserve-execution-run-evidence-502","guide.guarantee.guarantee-capacity-assignment-preserve-terminal-recovery-evidence-505","guide.guarantee.guarantee-capacity-assignment-recover-failed-assignment-084","guide.guarantee.guarantee-capacity-assignment-render-complete-forensic-evidence-503","guide.guarantee.guarantee-capacity-assignment-renew-assignment-lease-144","guide.guarantee.guarantee-capacity-assignment-return-assignment-145","guide.guarantee.guarantee-capacity-concurrency-verify-real-two-project-provider-concurrency-511","guide.guarantee.guarantee-capacity-engineering-verify-autonomous-engineering-starter-509","guide.guarantee.guarantee-capacity-lifecycle-verify-full-local-capacity-lifecycle-507","guide.guarantee.guarantee-capacity-parity-verify-cli-api-configuration-parity-508","guide.guarantee.guarantee-capacity-provider-coordinate-multi-team-memberships-142","guide.guarantee.guarantee-capacity-provider-inspect-provider-check-ins-081","guide.guarantee.guarantee-capacity-provider-register-capacity-provider-080","guide.guarantee.guarantee-capacity-provider-require-synthesis-authority-504","guide.guarantee.guarantee-capacity-provider-run-membership-admission-workflow-501","guide.guarantee.guarantee-capacity-recovery-verify-failure-concurrency-matrix-506","guide.guarantee.guarantee-capacity-research-verify-autonomous-cited-research-starter-510","guide.guarantee.guarantee-capacity-usage-record-execution-usage-148","guide.guarantee.guarantee-capacity-usage-review-capacity-usage-083","guide.guarantee.guarantee-work-capacity-providers-allocate-capacity-across-teams-674","guide.guarantee.guarantee-work-capacity-providers-configure-provider-availability-672","guide.guarantee.guarantee-work-capacity-providers-enforce-provider-concurrency-673","guide.guarantee.guarantee-work-capacity-providers-recover-abandoned-capacity-assignments-677","guide.guarantee.guarantee-work-capacity-providers-register-provider-capabilities-671","guide.guarantee.guarantee-work-capacity-providers-reserve-capacity-for-approved-work-675","guide.guarantee.guarantee-work-capacity-providers-settle-provider-usage-exactly-once-676"]
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
keywords: ["Capacity Providers","work","capacity-providers"]
documentationUrls: []
audiences:
  primary: [operator, developer, ai-agent]
  secondary: [community]
  excluded: []
---

# Capacity Providers

[Back to Work](/t/treeseed/books/treeseed-guide/work)

## In this section

- [Settle Capacity Ledger Once](/t/treeseed/books/treeseed-guide/work/capacity-providers/guarantee-agent-control-plane-settle-capacity-ledger-once-176)
- [Enforce Mode Split Capacity](/t/treeseed/books/treeseed-guide/work/capacity-providers/guarantee-agent-graph-enforce-mode-split-capacity-314)
- [Reserve Planning Capacity](/t/treeseed/books/treeseed-guide/work/capacity-providers/guarantee-agent-graph-reserve-planning-capacity-313)
- [Capacity And Provider Endpoint Reliability](/t/treeseed/books/treeseed-guide/work/capacity-providers/guarantee-api-endpoints-capacity-and-provider-control-plane-406)
- [Complete Assignment](/t/treeseed/books/treeseed-guide/work/capacity-providers/guarantee-capacity-assignment-complete-assignment-146)
- [Fail Assignment](/t/treeseed/books/treeseed-guide/work/capacity-providers/guarantee-capacity-assignment-fail-assignment-147)
- [Inspect Assignment Leases](/t/treeseed/books/treeseed-guide/work/capacity-providers/guarantee-capacity-assignment-inspect-assignment-leases-082)
- [Integrate Reviewed Agent Checkpoint](/t/treeseed/books/treeseed-guide/work/capacity-providers/guarantee-capacity-assignment-integrate-reviewed-agent-checkpoint-512)
- [Poll Next Assignment](/t/treeseed/books/treeseed-guide/work/capacity-providers/guarantee-capacity-assignment-poll-next-assignment-143)
- [Preserve Execution Run Evidence](/t/treeseed/books/treeseed-guide/work/capacity-providers/guarantee-capacity-assignment-preserve-execution-run-evidence-502)
- [Preserve Terminal Recovery Evidence](/t/treeseed/books/treeseed-guide/work/capacity-providers/guarantee-capacity-assignment-preserve-terminal-recovery-evidence-505)
- [Recover Failed Assignment](/t/treeseed/books/treeseed-guide/work/capacity-providers/guarantee-capacity-assignment-recover-failed-assignment-084)
- [Render Complete Forensic Evidence](/t/treeseed/books/treeseed-guide/work/capacity-providers/guarantee-capacity-assignment-render-complete-forensic-evidence-503)
- [Renew Assignment Lease](/t/treeseed/books/treeseed-guide/work/capacity-providers/guarantee-capacity-assignment-renew-assignment-lease-144)
- [Return Assignment](/t/treeseed/books/treeseed-guide/work/capacity-providers/guarantee-capacity-assignment-return-assignment-145)
- [Verify Real Two Project Provider Concurrency](/t/treeseed/books/treeseed-guide/work/capacity-providers/guarantee-capacity-concurrency-verify-real-two-project-provider-concurrency-511)
- [Verify Autonomous Engineering Starter](/t/treeseed/books/treeseed-guide/work/capacity-providers/guarantee-capacity-engineering-verify-autonomous-engineering-starter-509)
- [Verify Full Local Capacity Lifecycle](/t/treeseed/books/treeseed-guide/work/capacity-providers/guarantee-capacity-lifecycle-verify-full-local-capacity-lifecycle-507)
- [Verify Capacity CLI API And Configuration Parity](/t/treeseed/books/treeseed-guide/work/capacity-providers/guarantee-capacity-parity-verify-cli-api-configuration-parity-508)
- [Coordinate Multi-Team Provider Memberships](/t/treeseed/books/treeseed-guide/work/capacity-providers/guarantee-capacity-provider-coordinate-multi-team-memberships-142)
- [Inspect Provider Check-Ins](/t/treeseed/books/treeseed-guide/work/capacity-providers/guarantee-capacity-provider-inspect-provider-check-ins-081)
- [Register Capacity Provider](/t/treeseed/books/treeseed-guide/work/capacity-providers/guarantee-capacity-provider-register-capacity-provider-080)
- [Require Provider Synthesis Authority](/t/treeseed/books/treeseed-guide/work/capacity-providers/guarantee-capacity-provider-require-synthesis-authority-504)
- [Run Membership Admission Workflow](/t/treeseed/books/treeseed-guide/work/capacity-providers/guarantee-capacity-provider-run-membership-admission-workflow-501)
- [Verify Capacity Failure And Concurrency Matrix](/t/treeseed/books/treeseed-guide/work/capacity-providers/guarantee-capacity-recovery-verify-failure-concurrency-matrix-506)
- [Verify Autonomous Cited Research Starter](/t/treeseed/books/treeseed-guide/work/capacity-providers/guarantee-capacity-research-verify-autonomous-cited-research-starter-510)
- [Record Execution Usage](/t/treeseed/books/treeseed-guide/work/capacity-providers/guarantee-capacity-usage-record-execution-usage-148)
- [Review Capacity Usage](/t/treeseed/books/treeseed-guide/work/capacity-providers/guarantee-capacity-usage-review-capacity-usage-083)
- [Allocate capacity across teams](/t/treeseed/books/treeseed-guide/work/capacity-providers/guarantee-work-capacity-providers-allocate-capacity-across-teams-674)
- [Configure provider availability](/t/treeseed/books/treeseed-guide/work/capacity-providers/guarantee-work-capacity-providers-configure-provider-availability-672)
- [Enforce provider concurrency](/t/treeseed/books/treeseed-guide/work/capacity-providers/guarantee-work-capacity-providers-enforce-provider-concurrency-673)
- [Recover abandoned capacity assignments](/t/treeseed/books/treeseed-guide/work/capacity-providers/guarantee-work-capacity-providers-recover-abandoned-capacity-assignments-677)
- [Register provider capabilities](/t/treeseed/books/treeseed-guide/work/capacity-providers/guarantee-work-capacity-providers-register-provider-capabilities-671)
- [Reserve capacity for approved work](/t/treeseed/books/treeseed-guide/work/capacity-providers/guarantee-work-capacity-providers-reserve-capacity-for-approved-work-675)
- [Settle provider usage exactly once](/t/treeseed/books/treeseed-guide/work/capacity-providers/guarantee-work-capacity-providers-settle-provider-usage-exactly-once-676)
