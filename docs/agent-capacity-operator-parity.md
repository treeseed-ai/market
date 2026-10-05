# Agent Capacity Operator Parity

> Generated from `CAPACITY_OPERATOR_CAPABILITIES`. Do not hand-edit this file.

| Capability | CLI action | API route descriptors | Kind | Pagination | Configuration |
| --- | --- | --- | --- | --- | --- |
| `registration-key.show` | `trsd capacity registration-key` | `get.v1.teams.teamId.capacity-registration-key` | read | — | — |
| `registration-key.reveal` | `trsd capacity registration-key-reveal` | `get.v1.teams.teamId.capacity-registration-key.reveal` | read | — | — |
| `registration-key.rotate` | `trsd capacity registration-key-rotate` | `post.v1.teams.teamId.capacity-registration-key.rotate` | mutation | — | — |
| `registration-key.enable` | `trsd capacity registration-key-enable` | `post.v1.teams.teamId.capacity-registration-key.enable` | mutation | — | — |
| `registration-key.disable` | `trsd capacity registration-key-disable` | `post.v1.teams.teamId.capacity-registration-key.disable` | mutation | — | — |
| `registration-requests.list` | `trsd capacity provider-requests` | `get.v1.teams.teamId.capacity-provider-requests` | read | bounded cursor | — |
| `registration-requests.show` | `trsd capacity provider-request` | `get.v1.teams.teamId.capacity-provider-requests.requestId` | read | — | — |
| `registration-requests.approve` | `trsd capacity provider-approve` | `post.v1.teams.teamId.capacity-provider-requests.requestId.approve` | mutation | — | — |
| `registration-requests.reject` | `trsd capacity provider-reject` | `post.v1.teams.teamId.capacity-provider-requests.requestId.reject` | mutation | — | — |
| `registration-requests.cancel` | `trsd capacity provider-cancel` | `post.v1.teams.teamId.capacity-provider-requests.requestId.cancel` | mutation | — | — |
| `memberships.list` | `trsd capacity provider-memberships` | `get.v1.teams.teamId.capacity-provider-memberships` | read | bounded cursor | — |
| `memberships.show` | `trsd capacity provider-membership` | `get.v1.teams.teamId.capacity-provider-memberships.membershipId` | read | — | — |
| `memberships.suspend` | `trsd capacity provider-suspend` | `post.v1.teams.teamId.capacity-provider-memberships.membershipId.suspend` | mutation | — | — |
| `memberships.resume` | `trsd capacity provider-resume` | `post.v1.teams.teamId.capacity-provider-memberships.membershipId.resume` | mutation | — | — |
| `memberships.revoke` | `trsd capacity provider-revoke` | `post.v1.teams.teamId.capacity-provider-memberships.membershipId.revoke` | mutation | — | — |
| `credentials.list` | `trsd capacity provider-credentials` | `get.v1.teams.teamId.capacity-provider-memberships.membershipId.credentials` | read | bounded cursor | — |
| `credentials.rotate` | `trsd capacity provider-team-credential-rotate` | `post.v1.teams.teamId.capacity-provider-memberships.membershipId.credentials.rotate` | mutation | — | — |
| `credentials.revoke` | `trsd capacity provider-credential-revoke` | `post.v1.teams.teamId.capacity-provider-memberships.membershipId.credentials.credentialId.revoke` | mutation | — | — |
| `grants.list` | `trsd capacity grants` | `get.v1.teams.teamId.capacity-grants` | read | bounded cursor | capacity-grant |
| `grants.show` | `trsd capacity grant` | `get.v1.teams.teamId.capacity-grants.grantId` | read | — | — |
| `grants.validate` | `trsd capacity grant-validate` | `post.v1.teams.teamId.capacity-grants.plan` | validate | — | capacity-grant |
| `grants.plan` | `trsd capacity grant-plan` | `post.v1.teams.teamId.capacity-grants.plan` | plan | — | capacity-grant |
| `grants.apply` | `trsd capacity grant-apply` | `post.v1.teams.teamId.capacity-grants` | mutation | — | capacity-grant |
| `grants.activate` | `trsd capacity grant-activate` | `post.v1.teams.teamId.capacity-grants.grantId.activate` | mutation | — | — |
| `grants.pause` | `trsd capacity grant-pause` | `post.v1.teams.teamId.capacity-grants.grantId.pause` | mutation | — | — |
| `grants.resume` | `trsd capacity grant-resume` | `post.v1.teams.teamId.capacity-grants.grantId.resume` | mutation | — | — |
| `grants.revoke` | `trsd capacity grant-revoke` | `post.v1.teams.teamId.capacity-grants.grantId.revoke` | mutation | — | — |
| `allocations.list` | `trsd capacity allocation-sets` | `get.v1.teams.teamId.capacity.allocation-sets` | read | bounded cursor | allocation-set |
| `allocations.show` | `trsd capacity allocation` | `get.v1.teams.teamId.capacity.allocation-sets.allocationSetId` | read | — | — |
| `allocations.validate` | `trsd capacity allocation-validate` | `post.v1.teams.teamId.capacity.allocation-sets.plan` | validate | — | allocation-set |
| `allocations.plan` | `trsd capacity allocation-plan` | `post.v1.teams.teamId.capacity.allocation-sets.plan` | plan | — | allocation-set |
| `allocations.create` | `trsd capacity allocation-create` | `post.v1.teams.teamId.capacity.allocation-sets` | mutation | — | allocation-set |
| `allocations.activate` | `trsd capacity allocation-activate` | `post.v1.teams.teamId.capacity.allocation-sets.allocationSetId.activate` | mutation | — | — |
| `allocations.supersede` | `trsd capacity allocation-supersede` | `post.v1.teams.teamId.capacity.allocation-sets.allocationSetId.supersede` | mutation | — | — |
| `allocations.archive` | `trsd capacity allocation-archive` | `post.v1.teams.teamId.capacity.allocation-sets.allocationSetId.archive` | mutation | — | — |
| `allocations.explain` | `trsd capacity allocation-explain` | `post.v1.teams.teamId.capacity.allocation-sets.allocationSetId.explain` | read | — | — |
| `agent-classes.list` | `trsd capacity agent-classes` | `get.v1.projects.projectId.agent-classes` | read | bounded cursor | project-agent-class |
| `agent-classes.show` | `trsd capacity agent-class` | `get.v1.projects.projectId.agent-classes.classId` | read | — | — |
| `agent-classes.sync` | `trsd capacity agent-classes-sync` | `post.v1.projects.projectId.agent-classes`<br>`patch.v1.projects.projectId.agent-classes.classId` | mutation | — | project-agent-class |
| `workdays.create` | `trsd capacity workday-create` | `post.v1.workdays` | mutation | — | — |
| `workdays.start` | `trsd capacity workday-start` | `post.v1.workdays.workdayId.start` | mutation | — | — |
| `workdays.pause` | `trsd capacity workday-pause` | `post.v1.workdays.workdayId.pause` | mutation | — | — |
| `workdays.resume` | `trsd capacity workday-resume` | `post.v1.workdays.workdayId.resume` | mutation | — | — |
| `workdays.complete` | `trsd capacity workday-complete` | `post.v1.workdays.workdayId.complete` | mutation | — | — |
| `workdays.cancel` | `trsd capacity workday-cancel` | `post.v1.workdays.workdayId.cancel` | mutation | — | — |
| `workdays.tick` | `trsd capacity workday-tick` | `post.v1.teams.teamId.workday-runs.runId.tick` | mutation | — | — |
| `workdays.status` | `trsd capacity workday-status` | `get.v1.workdays.workdayId` | read | — | — |
| `workdays.summary` | `trsd capacity workday-summary` | `get.v1.workdays.workdayId.summary` | read | bounded cursor | — |
| `assignments.list` | `trsd capacity assignments` | `get.v1.teams.teamId.capacity.assignments` | read | bounded cursor | — |
| `assignments.show` | `trsd capacity assignment` | `get.v1.teams.teamId.capacity.assignments.assignmentId` | read | — | — |
| `assignments.explain` | `trsd capacity assignment-explanation` | `get.v1.teams.teamId.capacity.assignments.assignmentId.explanation` | read | — | — |
| `assignments.cancel` | `trsd capacity assignment-cancel` | `post.v1.teams.teamId.capacity.assignments.assignmentId.cancel` | mutation | — | — |
| `assignments.requeue` | `trsd capacity assignment-requeue` | `post.v1.teams.teamId.capacity.assignments.assignmentId.requeue` | mutation | — | — |
| `reservations.list` | `trsd capacity reservations` | `get.v1.teams.teamId.capacity.reservations` | read | bounded cursor | — |
| `reservations.explain` | `trsd capacity reservation-explanation` | `get.v1.teams.teamId.capacity.reservations.reservationId.explanation` | read | — | — |
| `usage.show` | `trsd capacity usage` | `get.v1.teams.teamId.capacity.usage` | read | bounded cursor | — |
| `usage.export` | `trsd capacity usage-export` | `get.v1.teams.teamId.capacity.usage` | export | bounded cursor | — |
| `ledger.show` | `trsd capacity ledger` | `get.v1.teams.teamId.capacity.ledger` | read | bounded cursor | — |
| `ledger.export` | `trsd capacity ledger-export` | `get.v1.teams.teamId.capacity.ledger` | export | bounded cursor | — |
| `audit.list` | `trsd capacity audit-events` | `get.v1.teams.teamId.capacity-audit-events` | read | bounded cursor | — |
| `audit.export` | `trsd capacity audit-export` | `get.v1.teams.teamId.capacity-audit-events` | export | bounded cursor | — |
| `provider.identity.init` | `trsd capacity provider-identity-init` | local | mutation | — | provider-manifest |
| `provider.identity.show` | `trsd capacity provider-identity-show` | local | read | — | — |
| `provider.identity.rotate` | `trsd capacity provider-identity-rotate` | `post.v1.provider.identity.rotate` | mutation | — | — |
| `provider.manifest.init` | `trsd capacity provider-manifest-init` | local | mutation | — | provider-manifest |
| `provider.join` | `trsd capacity provider-join` | `post.v1.provider-registrations` | mutation | — | provider-offer |
| `provider.registration-status` | `trsd capacity provider-registration-status` | `get.v1.provider-registrations.requestId` | read | — | — |
| `provider.credential-exchange` | `trsd capacity provider-credential-exchange` | `post.v1.provider-registrations.requestId.credential` | mutation | — | — |
| `provider.credential-rotate` | `trsd capacity provider-credential-rotate` | `post.v1.provider.credential-rotation` | mutation | — | — |
| `provider.connections.list` | `trsd capacity provider-connections` | local | read | — | provider-manifest |
| `provider.connections.show` | `trsd capacity provider-connection` | local | read | — | — |
| `provider.connections.leave` | `trsd capacity provider-leave` | `post.v1.provider.membership.leave` | mutation | — | — |
| `provider.offer.validate` | `trsd capacity provider-offer-validate` | local | validate | — | provider-offer |
| `provider.offer.plan` | `trsd capacity provider-offer-plan` | local | plan | — | provider-offer |
| `provider.offer.apply` | `trsd capacity provider-offer-apply` | `post.v1.provider.availability-sessions` | mutation | — | provider-offer |
| `provider.runtime.build` | `trsd capacity build` | local | local-runtime | — | — |
| `provider.runtime.up` | `trsd capacity up` | local | local-runtime | — | — |
| `provider.runtime.status` | `trsd capacity status` | local | local-runtime | — | — |
| `provider.runtime.logs` | `trsd capacity logs` | local | local-runtime | — | — |
| `provider.runtime.down` | `trsd capacity down` | local | local-runtime | — | — |
| `provider.runtime.test-local` | `trsd capacity test-local` | local | local-runtime | — | — |
