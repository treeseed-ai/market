import { execFileSync } from "node:child_process";
import { resolve } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CapacityAllocationService } from "../../packages/api/src/api/capacity/services/allocation-service.ts";
import { CapacityGrantService } from "../../packages/api/src/api/capacity/services/grant-service.ts";
import { leaseNextProviderAssignment } from "../../packages/api/src/api/capacity/services/assignment-lease-service.ts";
import { ProviderAssignmentLifecycleService } from "../../packages/api/src/api/capacity/services/assignment-lifecycle-service.ts";
import { reportCapacityUsage } from "../../packages/api/src/api/capacity/services/usage-report-service.ts";
import { settleCapacityReservationExactlyOnce } from "../../packages/api/src/api/capacity/services/settlement-service.ts";
import { tickCapacityWorkdayRun } from "../../packages/api/src/api/capacity/services/workday-tick-service.ts";
import { listCapacityWorkdayContentArtifactRefs } from "../../packages/api/src/api/capacity/services/workday-assignment-context-service.ts";
import { runAgentTestCatalogChecks } from "../../packages/agent/src/agents/testing/agent-test-catalog.ts";
import {
  DeterministicToolExecutionProviderAdapter,
  type DeterministicExecutionStep,
} from "../../packages/agent/src/agents/testing/deterministic-tool-provider.ts";
import {
  compileEngineeringAgentTestDefinition,
  compileEngineeringWorkflowPromotionConfig,
} from "../../packages/agent/src/agents/testing/engineering-agent-test-definition.ts";
import { resolveProviderConfig } from "../../packages/agent/src/provider/config.ts";
import { runProviderRunnerOnce } from "../../packages/agent/src/provider/runner-lifecycle.ts";
import {
  createServiceWorkflowDatabaseHarness,
  createServiceWorkflowFixture,
  createServiceWorkflowTreeDxFetch,
  removeServiceWorkflowFixture,
} from "./capacity-service-workflow-harness.ts";

const roots: string[] = [];

function fixtureRepository() {
  const fixture = createServiceWorkflowFixture({
    templatePath: "starters/engineering/template",
    temporaryPrefix: "treeseed-engineering-service-",
    initializeGit: true,
    files: {
      "src/lib/normalize-release-channel.ts":
        "export const normalizeReleaseChannel = (value: string) => value;\n",
    },
  });
  const root = fixture.root;
  roots.push(root);
  return { root, exactBaseRef: fixture.exactBaseRef as string };
}

afterEach(() => {
  vi.unstubAllGlobals();
  for (const root of roots.splice(0))
    removeServiceWorkflowFixture(root);
});

describe("engineering capacity service workflow", () => {
  it("runs a promoted test-first graph stage through admission, lease, AgentKernel, TreeDX, checkpoint, usage, settlement, and projection", async () => {
    const fixture = fixtureRepository();
    const { database, store } = createServiceWorkflowDatabaseHarness();
    const now = new Date().toISOString();
    const principal = {
      membershipId: "membership-a",
      teamId: "team-a",
      capacityProviderId: "provider-a",
    };
    const workspaceFiles = new Map<string, string>();
    const fetchImpl = createServiceWorkflowTreeDxFetch({ repoRoot: fixture.root, workspaceFiles });
    vi.stubGlobal("fetch", fetchImpl);
    try {
      await store.ensureInitialized();
      const catalog = await runAgentTestCatalogChecks({
        repoRoot: fixture.root,
        reportPath: resolve(
          fixture.root,
          ".treeseed/test-reports/agent-test-catalog.md",
        ),
        now: new Date(now),
      });
      expect(catalog.ok).toBe(true);
      expect(catalog.entries).toHaveLength(1);
      const definition = compileEngineeringAgentTestDefinition(
        catalog.entries[0]!,
      );
      expect(definition).toMatchObject({
        fixturePath: "src/lib/normalize-release-channel.ts",
        exactBaseRef: "fixture-head",
        requireRevisionCycle: true,
      });
      await store.run(
        `INSERT INTO teams (id, slug, name, created_at, updated_at) VALUES ('team-a', 'team-a', 'Team A', ?, ?)`,
        [now, now],
      );
      const projectMetadata = {
        architecture: {
          topology: "single_repository_site",
          rootPath: ".",
          sitePath: ".",
          contentPath: "src/content",
          contentRuntimeSource: "local_directory",
          localContentMaterialization: "existing_path",
        },
        repository: {
          provider: "git",
          owner: "local",
          name: "engineering-fixture",
          defaultBranch: "main",
          cloneUrl: fixture.root,
          checkoutPath: ".",
        },
        agentSpecs: {
          root: "src/content/agents",
          testsRoot: "src/content/agent-tests",
        },
      };
      await store.run(
        `INSERT INTO projects (id, team_id, slug, name, metadata_json, created_at, updated_at) VALUES ('project-a', 'team-a', 'project-a', 'Project A', ?, ?, ?)`,
        [JSON.stringify(projectMetadata), now, now],
      );
      const roles = {
        tester: "testing",
        engineer: "engineering",
        reviewer: "review",
        technicalWriter: "technical-writing",
        releaser: "release",
        researcher: "research",
        architect: "architecture",
      };
      for (const [slug, agent] of [
        ["research", "researcher"],
        ["architecture", "architect"],
        ["testing", "tester"],
        ["engineering", "engineer"],
        ["review", "reviewer"],
        ["technical-writing", "technical-writer"],
        ["release", "releaser"],
        ["reporting", "reporter"],
      ] as const) {
        const handler =
          agent === "reporter"
            ? "reporter"
            : agent === "researcher" ||
                agent === "architect" ||
                agent === "reviewer" ||
                agent === "technical-writer"
              ? "writer"
              : agent === "releaser"
                ? "releaser"
                : "actor";
        const agentRef =
          agent === "architect"
            ? {
                slug: agent,
                activities: {
                  planning: {
                    handler: "writer",
                    planningPriority: 100,
					outputs: { modelMutations: ["proposal:create"] },
                    planningIntent: {
                      artifactKind: "planning_proposal",
                      subjectModel: "objective",
                      subjectId: definition.objectiveId,
                    },
                  },
                  acting: { handler },
                },
              }
            : agent === "engineer"
              ? {
                  slug: agent,
	                  activities: {
					planning: {
						handler: "writer",
						planningPriority: 80,
						outputs: { modelMutations: ["linked_note:create"] },
						planningIntent: { artifactKind: "planning_note", subjectModel: "objective", subjectId: definition.objectiveId },
					},
	                    estimating: {
                      handler: "estimate",
                      planningPriority: 90,
					  outputs: { modelMutations: ["estimate:create"] },
                      planningIntent: { subjectModel: "proposal" },
                    },
                    acting: { handler },
                  },
                }
              : agent === "reporter"
                ? {
                    slug: agent,
                    activities: {
                      reporting: {
                        handler,
                        planningPriority: 50,
						outputs: {
                          modelMutations: ["workday_report:create"],
                        },
                        planningIntent: { includeWorkdayArtifacts: true },
                      },
                    },
                  }
				: {
					slug: agent,
					activities: {
						planning: {
							handler: "writer",
							planningPriority: 70,
							outputs: { modelMutations: ["linked_note:create"] },
							planningIntent: { artifactKind: "planning_note", subjectModel: "objective", subjectId: definition.objectiveId },
						},
						acting: { handler },
					},
				};
	        const allowedModes = '["planning"]';
        await store.run(
          `INSERT INTO project_agent_classes (id, team_id, project_id, slug, name, status, allowed_modes_json, required_capabilities_json, kernel_profile_json, kernel_policy_json, handler_refs_json, output_contracts_json, metadata_json, created_at, updated_at) VALUES (?, 'team-a', 'project-a', ?, ?, 'active', ?, '["engineering"]', '{}', '{}', ?, '{}', '{}', ?, ?)`,
          [
            `project-a:${slug}`,
            slug,
            slug,
            allowedModes,
            JSON.stringify({ agents: [agentRef] }),
            now,
            now,
          ],
        );
      }
      expect(new Set(definition.requiredAgents)).toEqual(
        new Set([
          "architect",
          "researcher",
          "tester",
          "engineer",
          "reviewer",
          "technical-writer",
          "releaser",
          "reporter",
        ]),
      );
      const workflow = compileEngineeringWorkflowPromotionConfig(definition, {
        projectId: "project-a",
        resolvedExactBaseRef: fixture.exactBaseRef,
        roles,
      });
      const decisionId = workflow.decisionId;
      const parameters = {
        projects: ["project-a"],
        engineeringWorkflows: [workflow],
        durationSeconds: 3600,
      };
      await store.run(
        `INSERT INTO capacity_workday_runs (id, team_id, capacity_provider_id, scenario_id, status, environment, parameters_json, summary_json, metrics_json, expected_json, actual_json, report_refs_json, error_json, started_at, created_at, updated_at) VALUES ('run-a', 'team-a', 'provider-a', 'engineering', 'queued', 'local', ?, '{}', '{}', '{}', '{}', '{}', '{}', NULL, ?, ?)`,
        [JSON.stringify(parameters), now, now],
      );
	      await store.createWorkdayCapacityEnvelope({
        id: "workday-a",
        workdayRunId: "run-a",
        projectId: "project-a",
        status: "active",
        startedAt: now,
	        availableCredits: 20,
	      });
	      await store.run(
	        `INSERT INTO capacity_workday_runs (id, team_id, capacity_provider_id, scenario_id, status, environment, parameters_json, summary_json, metrics_json, expected_json, actual_json, report_refs_json, error_json, started_at, created_at, updated_at) VALUES ('run-planning', 'team-a', 'provider-a', 'engineering-planning-only', 'running', 'local', ?, '{}', '{}', '{}', '{}', '{}', '{}', ?, ?, ?)`,
	        [JSON.stringify({ projects: ["project-a"], planningOnly: true, durationSeconds: 3600 }), now, now, now],
	      );
	      await store.createWorkdayCapacityEnvelope({
	        id: "workday-planning",
	        workdayRunId: "run-planning",
	        projectId: "project-a",
	        status: "active",
	        startedAt: now,
	        availableCredits: 8,
	      });
      await store.run(
        `INSERT INTO capacity_providers (id, fingerprint, public_jwk_json, display_name, identity_version, status, metadata_json, created_at, updated_at) VALUES ('provider-a', 'sha256:provider-a', '{}', 'Provider A', 1, 'active', '{}', ?, ?)`,
        [now, now],
      );
      await store.run(
        `INSERT INTO capacity_provider_team_memberships (id, team_id, capacity_provider_id, status, approved_at, approved_by_id, metadata_json, created_at, updated_at) VALUES ('membership-a', 'team-a', 'provider-a', 'approved', ?, 'owner', '{}', ?, ?)`,
        [now, now, now],
      );
      const engineeringCapabilities = [
        "engineering",
        "engineering:research",
        "engineering:architecture",
        "engineering:test",
        "engineering:implementation",
        "engineering:verification",
        "engineering:review",
        "engineering:documentation",
        "engineering:release",
      ];
      const session = await store.createProviderAvailabilitySession(principal, {
        id: "session-a",
        environment: "local",
        capabilities: engineeringCapabilities,
        executionProviders: [
          {
            id: "deterministic-tool",
            adapter: "deterministic",
            capabilities: engineeringCapabilities,
            maxConcurrentRunners: 1,
	            nativeLimits: { availableCredits: 40 },
          },
        ],
	        nativeLimits: { availableCredits: 40, maxConcurrentRunners: 1 },
        runnerPressure: { activeRunners: 0, maxConcurrentRunners: 1 },
        constraints: {
	          availableCredits: 40,
          activeRunners: 0,
          maxConcurrentRunners: 1,
        },
      });
      const allocation = new CapacityAllocationService(store);
      await allocation.create("team-a", {
        id: "allocation-a",
        reservePolicy: { percent: 0, overflow: "deny" },
        slices: [
          {
            id: "project:project-a",
            scope: "project",
            targetId: "project-a",
            policy: {
              minPercent: 0,
              targetPercent: 100,
              maxPercent: 100,
              hardCapPercent: 100,
            },
          },
        ],
        borrowingRules: [],
      }, null, "engineering:allocation:create");
      await allocation.activate("team-a", "allocation-a", "engineering:allocation:activate");
      const grants = new CapacityGrantService(store);
      await grants.create("team-a", {
        id: "grant-a",
        membershipId: "membership-a",
        projectId: "project-a",
        environment: "local",
        executionProviderIds: ["deterministic-tool"],
        capabilities: engineeringCapabilities,
        allowedModes: ["planning", "acting"],
	        dailyCreditLimit: 40,
	        monthlyCreditLimit: 80,
        maxConcurrentAssignments: 1,
      }, "engineering:grant:create");
      await grants.transition("team-a", "grant-a", "active", "engineering:grant:activate");
      await store.run(
	        `UPDATE workday_capacity_envelopes SET allocation_set_id = 'allocation-a', metadata_json = '{"grantId":"grant-a"}' WHERE id IN ('workday-a','workday-planning')`,
      );
      (
        store as unknown as {
          createCapacityWorkdayTreeDxWorkspace: (
            ...args: unknown[]
          ) => Promise<Record<string, unknown>>;
        }
      ).createCapacityWorkdayTreeDxWorkspace = async () => ({
        workspaceId: "workspace-a",
      });
      const lifecycle = new ProviderAssignmentLifecycleService(store);
	  type LeasedAssignment = NonNullable<Awaited<ReturnType<typeof leaseNextProviderAssignment>>["assignment"]>;
      const clientFor = (
	        leasedAssignment: LeasedAssignment,
      ) => ({
        async nextAssignment() {
          return { ok: true, payload: null };
        },
        async createAssignmentModeRun(
          id: string,
          body: Record<string, unknown>,
        ) {
          return {
            ok: true,
            payload: await store.createAgentModeRun({
              ...body,
              teamId: principal.teamId,
              providerAssignmentId: id,
            }),
          };
        },
        async renewAssignment(id: string, body: Record<string, unknown>) {
          const result = await lifecycle.renew(principal, id, body);
          return { ok: true, payload: result?.assignment ?? null };
        },
        async reportAssignmentUsage(
          id: string,
          body: Record<string, unknown>,
          key: string,
        ) {
          return reportCapacityUsage(store, {
            ...body,
            idempotencyKey: key,
            source: "deterministic-service-workflow",
            teamId: principal.teamId,
            membershipId: principal.membershipId,
            reservationId: leasedAssignment.reservationId!,
            assignmentId: id,
          } as never);
        },
        async settleAssignment(
          id: string,
          body: Record<string, unknown>,
          key: string,
        ) {
          return settleCapacityReservationExactlyOnce(store, {
            ...body,
            settlementKey: key,
            source: "deterministic-service-workflow",
            teamId: principal.teamId,
            membershipId: principal.membershipId,
            reservationId: leasedAssignment.reservationId!,
            assignmentId: id,
          } as never);
        },
        async completeAssignment(id: string, body: Record<string, unknown>) {
          const result = await lifecycle.complete(principal, id, body);
          return { ok: true, payload: result?.assignment ?? null };
        },
        async failAssignment(id: string, body: Record<string, unknown>) {
          const result = await lifecycle.fail(principal, id, body);
          return { ok: true, payload: result?.assignment ?? null };
        },
      });
      const hostConfig = resolveProviderConfig({
        env: {
          TREESEED_PROVIDER_DATA_DIR: resolve(fixture.root, ".provider"),
          TREESEED_PROVIDER_ENVIRONMENT: "local",
          TREESEED_PROVIDER_WORKSPACE_ROOT: fixture.root,
          HOME: fixture.root,
        },
      });
      const runConfiguredAssignment = async (
        tickId: string,
        offsetMs: number,
	        expectedAgent: string | null,
        expectedMode: "planning" | "acting",
	        steps: DeterministicExecutionStep[] | ((assignment: LeasedAssignment) => DeterministicExecutionStep[]),
	        workdayRunId = "run-a",
      ) => {
        await tickCapacityWorkdayRun(
          store,
          "team-a",
	          workdayRunId,
          new Date(Date.parse(now) + offsetMs).toISOString(),
          tickId,
        );
        const stageLease = await leaseNextProviderAssignment(store, principal, {
          providerSessionId: session.id,
          runnerId: "runner-a",
          leaseSeconds: 300,
        });
        if (!stageLease.assignment)
          throw new Error(
            JSON.stringify(
              {
                tickId,
                expectedAgent,
                expectedMode,
                diagnostics: stageLease.diagnostics,
                demands: await store.all(
                  `SELECT source_id, status, mode, activity_type, payload_json FROM capacity_workday_demands ORDER BY created_at`,
                ),
              },
              null,
              2,
            ),
          );
	        if (expectedAgent) expect(stageLease.assignment.agentId).toBe(expectedAgent);
        expect(stageLease.assignment.mode).toBe(expectedMode);
        const adapter = new DeterministicToolExecutionProviderAdapter({
          repoRoot: fixture.root,
          apiBaseUrl: "https://api.fixture.test",
          providerAccessToken: "membership-token",
	          steps: () => typeof steps === "function" ? steps(stageLease.assignment) : steps,
        });
        const stageResult = await runProviderRunnerOnce({
          config: {
            ...hostConfig,
            connectionId: "connection-a",
            marketUrl: "https://api.fixture.test",
            marketAudience: "https://api.fixture.test",
            teamId: "team-a",
            providerId: "provider-a",
            membershipId: "membership-a",
            accessToken: "membership-token",
          },
          client: clientFor(stageLease.assignment),
          runnerId: "runner-a",
          leasedAssignment: {
            ok: true,
            leaseToken: stageLease.leaseToken,
            leaseSeconds: stageLease.leaseSeconds,
            payload: stageLease.assignment,
          },
          executionAdapter: adapter,
        });
        expect(stageResult).toMatchObject({ ok: true, assigned: 1 });
        const terminal = await store.getProviderAssignment(
          "team-a",
          stageLease.assignment.id,
        );
        if (terminal?.status !== "completed")
          throw new Error(
            JSON.stringify({ tickId, stageResult, terminal }, null, 2),
          );
        return stageLease.assignment;
      };
	  const planningAgents = new Set<string>();
	  for (let index = 0; index < definition.requiredAgents.length; index += 1) {
		const planningAssignment = await runConfiguredAssignment(
		  `tick-planning-${index + 1}`,
		  index,
		  null,
		  "planning",
		  (assignment) => {
			const agentId = String(assignment.agentId);
			return [
			  {
				kind: "tool",
				toolId: "treeseed.content.create",
				input: {
				  model: agentId === "architect" ? "proposal" : "note",
				  title: `${agentId} planning-only contribution`,
				  body: `${agentId} contributed bounded planning evidence before any configured agent repeated.`,
				  relations: [{ field: "relatedObjectives", targetModel: "objective", targetSlug: definition.objectiveId }],
				},
			  },
			  { kind: "output", verification: { status: "passed", summary: `${agentId} planning contribution completed.` } },
			];
		  },
		  "run-planning",
		);
		const agentId = String(planningAssignment.agentId);
		expect(planningAgents.has(agentId)).toBe(false);
		planningAgents.add(agentId);
	  }
	  expect(planningAgents).toEqual(new Set(definition.requiredAgents));
	  expect(await store.first(`SELECT COUNT(*) AS count FROM capacity_provider_assignments assignment JOIN capacity_workday_demands demand ON demand.assignment_id = assignment.id WHERE demand.workday_run_id = 'run-planning' AND assignment.status = 'completed'`)).toEqual({ count: 8 });
	  await store.updateCapacityWorkdayRun("team-a", "run-planning", { status: "completed", summary: { participatingAgents: [...planningAgents].sort() } });
	  expect(await store.first(`SELECT COUNT(*) AS count FROM capacity_workday_demands WHERE workday_run_id = 'run-planning' AND status IN ('pending','claimed')`)).toEqual({ count: 0 });
	  await store.updateCapacityWorkdayRun("team-a", "run-a", { status: "running", startedAt: now });
	  await store.run(`UPDATE project_agent_classes SET allowed_modes_json = '["acting"]' WHERE project_id = 'project-a'`);
	  const engineeringClass = await store.first(`SELECT handler_refs_json FROM project_agent_classes WHERE id = 'project-a:engineering'`);
	  const engineeringRefs = JSON.parse(String(engineeringClass?.handler_refs_json)) as { agents: Array<{ activities: Record<string, unknown> }> };
	  delete engineeringRefs.agents[0]!.activities.planning;
	  await store.run(`UPDATE project_agent_classes SET handler_refs_json = ? WHERE id = 'project-a:engineering'`, [JSON.stringify(engineeringRefs)]);
	  await store.run(`UPDATE project_agent_classes SET allowed_modes_json = '["planning","acting"]' WHERE id = 'project-a:architecture'`);
	  await store.upsertDecisionPlanningStatus({
		projectId: "project-a",
		decisionId,
		humanApprovalState: "approved",
		executionReadiness: "blocked",
		planningInputsStatus: "complete",
		scopeHash: "decision-scope",
	  });
	  await store.createPlanningInputRequest(decisionId, {
		id: "planning-proposal-a",
		projectId: "project-a",
		projectAgentClassId: "project-a:architecture",
		prompt: "Create the linked proposal for the approved release-channel decision.",
		metadata: { agentId: "architect", planningSource: "engineering-acceptance-proposal", priority: 100 },
	  });
	  const proposal = await runConfiguredAssignment(
        "tick-proposal",
        0,
        "architect",
        "planning",
        [
          {
            kind: "tool",
            toolId: "treeseed.content.create",
            input: {
              model: "proposal",
              title: "Normalize release-channel inputs",
              body: "Normalize release-channel inputs deterministically with a test-first implementation and explicit empty-input handling.",
              relations: [
                {
                  field: "relatedObjectives",
                  targetModel: "objective",
                  targetSlug: definition.objectiveId,
                },
              ],
            },
          },
          {
            kind: "output",
            verification: {
              status: "passed",
              summary: "Decision-linked engineering proposal created.",
            },
          },
        ],
      );
      expect(proposal).toMatchObject({ handlerId: "writer", decisionId });
      expect([...workspaceFiles.keys()]).toContain(
        "src/content/proposals/normalize-release-channel-inputs.mdx",
      );
      const proposalArtifacts = await listCapacityWorkdayContentArtifactRefs(
        store,
        (await store.getCapacityWorkdayRun("team-a", "run-a"))!,
        "project-a",
      );
      expect(proposalArtifacts).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            model: "proposal",
            contentPath:
              "src/content/proposals/normalize-release-channel-inputs.mdx",
          }),
        ]),
      );
      expect(await store.listPlanningInputRequests(decisionId)).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            id: "planning-proposal-a",
            status: "complete",
          }),
        ]),
      );
      await store.run(
        `UPDATE project_agent_classes SET allowed_modes_json = '["acting"]' WHERE id = 'project-a:architecture'`,
      );
      await store.run(
        `UPDATE project_agent_classes SET allowed_modes_json = '["planning","acting"]' WHERE id = 'project-a:engineering'`,
      );
      await store.createPlanningInputRequest(decisionId, {
        id: "planning-estimate-a",
        projectId: "project-a",
        projectAgentClassId: "project-a:engineering",
        prompt: "Estimate the accepted release-channel proposal.",
        metadata: {
          agentId: "engineer",
          planningSource: "engineering-acceptance-estimate",
          priority: 90,
        },
      });
      const estimate = await runConfiguredAssignment(
        "tick-estimate",
        1_000,
        "engineer",
        "planning",
        [
          {
            kind: "output",
            outputs: {
              structuredEstimate: {
                id: "estimate-a",
                minCredits: 1,
                expectedCredits: 2,
                maxCredits: 3,
                confidence: "medium",
                riskLevel: "low",
                assumptions: [
                  "The fixture helper remains independently testable.",
                ],
                blockers: [],
                dependencies: [],
                expectedOutputs: [
                  { outputType: "implementation", required: true },
                ],
                acceptanceCriteria: ["Focused regression tests pass."],
                completionEvidence: ["Proposal and fixture source inspected."],
              },
            },
            verification: {
              status: "passed",
              summary: "Structured implementation estimate completed.",
            },
          },
        ],
      );
      expect(estimate).toMatchObject({
        handlerId: "estimate",
        proposalId: "normalize-release-channel-inputs",
        decisionId,
      });
      expect(
        await store.getStructuredAgentEstimate("estimate-a"),
      ).toMatchObject({
        status: "submitted",
        proposalId: "normalize-release-channel-inputs",
        metadata: { assignmentId: estimate.id },
      });
      await store.acceptStructuredAgentEstimate("estimate-a", {
        metadata: { source: "fixture-approved-estimate" },
      });
      expect(
        await store.getStructuredAgentEstimate("estimate-a"),
      ).toMatchObject({ status: "accepted" });
      expect(await store.listPlanningInputRequests(decisionId)).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            id: "planning-estimate-a",
            status: "complete",
          }),
        ]),
      );
      await store.run(
        `UPDATE project_agent_classes SET allowed_modes_json = '["acting"]' WHERE id = 'project-a:engineering'`,
      );
      await runConfiguredAssignment(
        "tick-research",
        2_000,
        "researcher",
        "acting",
        [
          {
            kind: "tool",
            toolId: "treeseed.content.create",
            input: {
              model: "note",
              title: "Release-channel research evidence",
              body: "Repository evidence confirms normalization is isolated to the release-channel helper.",
              relations: [
                {
                  field: "relatedDecisions",
                  targetModel: "decision",
                  targetSlug: decisionId,
                },
              ],
            },
          },
          {
            kind: "output",
            verification: {
              status: "passed",
              summary: "Research preparation completed.",
            },
          },
        ],
      );
      await runConfiguredAssignment(
        "tick-architecture",
        3_000,
        "architect",
        "acting",
        [
          {
            kind: "tool",
            toolId: "treeseed.content.create",
            input: {
              model: "note",
              title: "Release-channel architecture plan",
              body: "Keep normalization deterministic, local, and independently testable.",
              relations: [
                {
                  field: "relatedDecisions",
                  targetModel: "decision",
                  targetSlug: decisionId,
                },
              ],
            },
          },
          {
            kind: "output",
            verification: {
              status: "passed",
              summary: "Architecture preparation completed.",
            },
          },
        ],
      );

      await tickCapacityWorkdayRun(
        store,
        "team-a",
        "run-a",
        new Date(Date.parse(now) + 4_000).toISOString(),
        "tick-a",
      );
      const leased = await leaseNextProviderAssignment(store, principal, {
        providerSessionId: session.id,
        runnerId: "runner-a",
        leaseSeconds: 300,
      });
      if (!leased.assignment)
        throw new Error(
          JSON.stringify(
            {
              diagnostics: leased.diagnostics,
              demands: await store.all(
                `SELECT id, status, mode, metadata_json FROM capacity_workday_demands`,
              ),
              audits: await store.all(
                `SELECT action, metadata_json FROM capacity_audit_events ORDER BY created_at DESC LIMIT 10`,
              ),
            },
            null,
            2,
          ),
        );
      expect(leased.assignment).toMatchObject({
        mode: "acting",
        agentId: "tester",
        handlerId: "actor",
      });
      const assignment = leased.assignment!;
      const execution = new DeterministicToolExecutionProviderAdapter({
        repoRoot: fixture.root,
        apiBaseUrl: "https://api.fixture.test",
        providerAccessToken: "membership-token",
        steps: () => [
          {
            kind: "write-file",
            path: "tests/normalize-release-channel.test.ts",
            content:
              "import { normalizeReleaseChannel } from '../src/lib/normalize-release-channel';\nthrow new Error(String(normalizeReleaseChannel(' BETA ')));\n",
          },
          {
            kind: "tool",
            toolId: "treeseed.content.create",
            input: {
              model: "note",
              title: "Failing release-channel regression proof",
              body: "The regression test fails before implementation.",
              relations: [
                {
                  field: "relatedDecisions",
                  targetModel: "decision",
                  targetSlug: decisionId,
                },
              ],
            },
          },
          {
            kind: "tool",
            toolId: "treeseed.checkpoint",
            input: { message: "test: prove release-channel regression" },
          },
          {
            kind: "output",
            verification: {
              status: "failed",
              summary: "Expected regression failure before implementation.",
            },
          },
        ],
      });
      const result = await runProviderRunnerOnce({
        config: {
          ...hostConfig,
          connectionId: "connection-a",
          marketUrl: "https://api.fixture.test",
          marketAudience: "https://api.fixture.test",
          teamId: "team-a",
          providerId: "provider-a",
          membershipId: "membership-a",
          accessToken: "membership-token",
        },
        client: clientFor(assignment),
        runnerId: "runner-a",
        leasedAssignment: {
          ok: true,
          leaseToken: leased.leaseToken,
          leaseSeconds: leased.leaseSeconds,
          payload: assignment,
        },
        executionAdapter: execution,
      });
      expect(result).toMatchObject({ ok: true, assigned: 1 });
      const completedAssignment = await store.getProviderAssignment(
        "team-a",
        assignment.id,
      );
      if (completedAssignment?.status !== "completed")
        throw new Error(
          JSON.stringify(
            {
              assignment: completedAssignment,
              modeRuns: await store.all(
                `SELECT status, outputs_json, fallback_reason FROM agent_mode_runs WHERE provider_assignment_id = ? ORDER BY created_at`,
                [assignment.id],
              ),
            },
            null,
            2,
          ),
        );
      expect(completedAssignment).toMatchObject({
        status: "completed",
        leaseState: "released",
      });
      expect(
        await store.first(
          `SELECT state, consumed_credits FROM capacity_reservations WHERE id = ?`,
          [assignment.reservationId],
        ),
      ).toMatchObject({ state: "consumed" });
      expect(
        await store.all(
          `SELECT phase FROM capacity_ledger_entries WHERE assignment_id = ?`,
          [assignment.id],
        ),
      ).toEqual([{ phase: "task_completed_actual_settlement" }]);
      const graph = (
        await store.listDecisionAssignmentGraphsForDecision(decisionId)
      )[0]!;
      expect(
        graph.nodes.find((node) => node.metadata?.stage === "test")?.status,
      ).toBe("completed");
      expect(
        graph.nodes.find((node) => node.metadata?.stage === "implementation")
          ?.status,
      ).toBe("ready");
      expect([...workspaceFiles.keys()]).toContain(
        "src/content/notes/failing-release-channel-regression-proof.mdx",
      );

      const testContractId = String(
        graph.nodes.find((node) => node.metadata?.stage === "test")?.metadata
          ?.producesDeliverableContractId,
      );
      const testManifestRow = await store.first(
        `SELECT manifest_json FROM deliverable_manifests WHERE deliverable_contract_id = ?`,
        [testContractId],
      );
      const testerCheckpoint = String(
        (
          JSON.parse(String(testManifestRow?.manifest_json)) as {
            sourceAuthority: { effectiveRef: string };
          }
        ).sourceAuthority.effectiveRef,
      );
      await tickCapacityWorkdayRun(
        store,
        "team-a",
        "run-a",
        new Date(Date.parse(now) + 5_000).toISOString(),
        "tick-b",
      );
      const implementationLease = await leaseNextProviderAssignment(
        store,
        principal,
        {
          providerSessionId: session.id,
          runnerId: "runner-a",
          leaseSeconds: 300,
        },
      );
      if (!implementationLease.assignment)
        throw new Error(
          JSON.stringify(
            {
              diagnostics: implementationLease.diagnostics,
              graph: await store.getDecisionAssignmentGraph(graph.id),
            },
            null,
            2,
          ),
        );
      const implementationAssignment = implementationLease.assignment;
      expect(implementationAssignment).toMatchObject({
        mode: "acting",
        agentId: "engineer",
        handlerId: "actor",
        decisionInput: { input: { exactBaseRef: testerCheckpoint } },
      });
      const implementationExecution =
        new DeterministicToolExecutionProviderAdapter({
          repoRoot: fixture.root,
          apiBaseUrl: "https://api.fixture.test",
          providerAccessToken: "membership-token",
          steps: () => [
            {
              kind: "write-file",
              path: "src/lib/normalize-release-channel.ts",
              content:
                "export const normalizeReleaseChannel = (value: string) => value.trim().toLowerCase();\n",
            },
            {
              kind: "tool",
              toolId: "treeseed.content.create",
              input: {
                model: "note",
                title: "Release-channel normalization implementation",
                body: "The implementation now trims and lowercases release-channel input.",
                relations: [
                  {
                    field: "relatedDecisions",
                    targetModel: "decision",
                    targetSlug: decisionId,
                  },
                ],
              },
            },
            {
              kind: "tool",
              toolId: "treeseed.checkpoint",
              input: { message: "fix: normalize release channel input" },
            },
            {
              kind: "output",
              verification: {
                status: "passed",
                summary:
                  "Implementation satisfies the bounded normalization behavior.",
              },
            },
          ],
        });
      await expect(
        runProviderRunnerOnce({
          config: {
            ...hostConfig,
            connectionId: "connection-a",
            marketUrl: "https://api.fixture.test",
            marketAudience: "https://api.fixture.test",
            teamId: "team-a",
            providerId: "provider-a",
            membershipId: "membership-a",
            accessToken: "membership-token",
          },
          client: clientFor(implementationAssignment),
          runnerId: "runner-a",
          leasedAssignment: {
            ok: true,
            leaseToken: implementationLease.leaseToken,
            leaseSeconds: implementationLease.leaseSeconds,
            payload: implementationAssignment,
          },
          executionAdapter: implementationExecution,
        }),
      ).resolves.toMatchObject({ ok: true, assigned: 1 });
      const advancedGraph = await store.getDecisionAssignmentGraph(graph.id);
      expect(
        advancedGraph?.nodes.find(
          (node) => node.metadata?.stage === "implementation",
        )?.status,
      ).toBe("completed");
      expect(
        advancedGraph?.nodes.find(
          (node) => node.metadata?.stage === "verification",
        )?.status,
      ).toBe("ready");
      const implementationContractId = String(
        advancedGraph?.nodes.find(
          (node) => node.metadata?.stage === "implementation",
        )?.metadata?.producesDeliverableContractId,
      );
      const implementationManifestRow = await store.first(
        `SELECT manifest_json FROM deliverable_manifests WHERE deliverable_contract_id = ?`,
        [implementationContractId],
      );
      const implementationCheckpoint = String(
        (
          JSON.parse(String(implementationManifestRow?.manifest_json)) as {
            sourceAuthority: { effectiveRef: string };
          }
        ).sourceAuthority.effectiveRef,
      );
      expect(() =>
        execFileSync(
          "git",
          [
            "merge-base",
            "--is-ancestor",
            testerCheckpoint,
            implementationCheckpoint,
          ],
          { cwd: fixture.root },
        ),
      ).not.toThrow();

      const runStage = async (
        tickId: string,
        offsetMs: number,
        expectedAgent: string,
        steps: DeterministicExecutionStep[],
      ) => {
        const tick = await tickCapacityWorkdayRun(
          store,
          "team-a",
          "run-a",
          new Date(Date.parse(now) + offsetMs).toISOString(),
          tickId,
        );
        const stageLease = await leaseNextProviderAssignment(store, principal, {
          providerSessionId: session.id,
          runnerId: "runner-a",
          leaseSeconds: 300,
        });
        if (!stageLease.assignment)
          throw new Error(
            JSON.stringify(
              {
                tickId,
                tick,
                diagnostics: stageLease.diagnostics,
                graph: await store.getDecisionAssignmentGraph(graph.id),
                plans: await store.listAgentCapacityPlans(decisionId),
                inputs: await store.listDecisionExecutionInputs(decisionId),
                demands: await store.all(
                  `SELECT source_id, status, payload_json FROM capacity_workday_demands ORDER BY created_at`,
                ),
              },
              null,
              2,
            ),
          );
        expect(stageLease.assignment.agentId).toBe(expectedAgent);
        const adapter = new DeterministicToolExecutionProviderAdapter({
          repoRoot: fixture.root,
          apiBaseUrl: "https://api.fixture.test",
          providerAccessToken: "membership-token",
          steps: () => steps,
        });
        const stageResult = await runProviderRunnerOnce({
          config: {
            ...hostConfig,
            connectionId: "connection-a",
            marketUrl: "https://api.fixture.test",
            marketAudience: "https://api.fixture.test",
            teamId: "team-a",
            providerId: "provider-a",
            membershipId: "membership-a",
            accessToken: "membership-token",
          },
          client: clientFor(stageLease.assignment),
          runnerId: "runner-a",
          leasedAssignment: {
            ok: true,
            leaseToken: stageLease.leaseToken,
            leaseSeconds: stageLease.leaseSeconds,
            payload: stageLease.assignment,
          },
          executionAdapter: adapter,
        });
        expect(stageResult).toMatchObject({ ok: true, assigned: 1 });
        const terminal = await store.getProviderAssignment(
          "team-a",
          stageLease.assignment.id,
        );
        if (terminal?.status !== "completed")
          throw new Error(
            JSON.stringify({ tickId, stageResult, terminal }, null, 2),
          );
        return stageLease.assignment;
      };
      const verificationAssignment = await runStage("tick-c", 6_000, "tester", [
        {
          kind: "tool",
          toolId: "treeseed.content.create",
          input: {
            model: "note",
            title: "Release-channel verification",
            body: "The regression and focused verification now pass.",
            relations: [
              {
                field: "relatedDecisions",
                targetModel: "decision",
                targetSlug: decisionId,
              },
            ],
          },
        },
        {
          kind: "output",
          verification: {
            status: "passed",
            summary: "Focused regression verification passed.",
          },
        },
      ]);
      expect(verificationAssignment.decisionInput).toMatchObject({
        input: { exactBaseRef: implementationCheckpoint },
      });
      const reviewAssignment = await runStage("tick-d", 7_000, "reviewer", [
        {
          kind: "tool",
          toolId: "treeseed.content.create",
          input: {
            model: "note",
            title: "Release-channel review revision",
            body: "The implementation must also reject empty normalized input.",
            relations: [
              {
                field: "relatedDecisions",
                targetModel: "decision",
                targetSlug: decisionId,
              },
            ],
          },
        },
        {
          kind: "output",
          signals: [
            {
              code: "revision_required",
              severity: "warning",
              message: "Handle empty normalized input before approval.",
            },
          ],
          verification: {
            status: "passed",
            summary: "Review completed with a required revision.",
          },
        },
      ]);
      expect(reviewAssignment.decisionInput).toMatchObject({
        input: { exactBaseRef: implementationCheckpoint },
      });
      const revisionGraph = await store.getDecisionAssignmentGraph(graph.id);
      const revisionNodes =
        revisionGraph?.nodes.filter(
          (node) => node.metadata?.revisionCycle === 1,
        ) ?? [];
      if (!revisionNodes.length)
        throw new Error(
          JSON.stringify(
            {
              reviewAssignment,
              revisionGraph,
              modeRuns: await store.all(
                `SELECT status, outputs_json FROM agent_mode_runs WHERE provider_assignment_id = ?`,
                [reviewAssignment.id],
              ),
              contracts: await store.all(
                `SELECT deliverable_type, status, metadata_json FROM deliverable_contracts WHERE decision_id = ? ORDER BY deliverable_type`,
                [decisionId],
              ),
            },
            null,
            2,
          ),
        );
      expect(
        revisionNodes.map((node) => [node.metadata?.stage, node.status]),
      ).toEqual([
        ["implementation", "ready"],
        ["verification", "pending"],
        ["review", "pending"],
      ]);
      const revisionImplementation = await runStage(
        "tick-e",
        8_000,
        "engineer",
        [
          {
            kind: "write-file",
            path: "src/lib/normalize-release-channel.ts",
            content:
              "export const normalizeReleaseChannel = (value: string) => {\n  const normalized = value.trim().toLowerCase();\n  if (!normalized) throw new Error('release channel is required');\n  return normalized;\n};\n",
          },
          {
            kind: "tool",
            toolId: "treeseed.content.create",
            input: {
              model: "note",
              title: "Release-channel empty-input revision",
              body: "The revision rejects empty normalized release-channel input.",
              relations: [
                {
                  field: "relatedDecisions",
                  targetModel: "decision",
                  targetSlug: decisionId,
                },
              ],
            },
          },
          {
            kind: "tool",
            toolId: "treeseed.checkpoint",
            input: { message: "fix: reject empty release channels" },
          },
          {
            kind: "output",
            verification: {
              status: "passed",
              summary:
                "Revision implements the requested empty-input behavior.",
            },
          },
        ],
      );
      expect(revisionImplementation.decisionInput).toMatchObject({
        input: { exactBaseRef: implementationCheckpoint },
      });
      const afterRevisionImplementation =
        await store.getDecisionAssignmentGraph(graph.id);
      const revisionImplementationNode =
        afterRevisionImplementation?.nodes.find(
          (node) =>
            node.metadata?.revisionCycle === 1 &&
            node.metadata?.stage === "implementation",
        );
      const revisionImplementationManifest = await store.first(
        `SELECT manifest_json FROM deliverable_manifests WHERE deliverable_contract_id = ?`,
        [
          String(
            revisionImplementationNode?.metadata?.producesDeliverableContractId,
          ),
        ],
      );
      const revisionCheckpoint = String(
        (
          JSON.parse(String(revisionImplementationManifest?.manifest_json)) as {
            sourceAuthority: { effectiveRef: string };
          }
        ).sourceAuthority.effectiveRef,
      );
      expect(() =>
        execFileSync(
          "git",
          [
            "merge-base",
            "--is-ancestor",
            implementationCheckpoint,
            revisionCheckpoint,
          ],
          { cwd: fixture.root },
        ),
      ).not.toThrow();
      const revisionVerification = await runStage("tick-f", 9_000, "tester", [
        {
          kind: "tool",
          toolId: "treeseed.content.create",
          input: {
            model: "note",
            title: "Release-channel revision verification",
            body: "The original and empty-input regression cases pass.",
            relations: [
              {
                field: "relatedDecisions",
                targetModel: "decision",
                targetSlug: decisionId,
              },
            ],
          },
        },
        {
          kind: "output",
          verification: {
            status: "passed",
            summary: "Revision regression verification passed.",
          },
        },
      ]);
      expect(revisionVerification.decisionInput).toMatchObject({
        input: { exactBaseRef: revisionCheckpoint },
      });
      const revisionReview = await runStage("tick-g", 10_000, "reviewer", [
        {
          kind: "tool",
          toolId: "treeseed.content.create",
          input: {
            model: "note",
            title: "Release-channel revision approval",
            body: "The revision addresses the blocking empty-input finding.",
            relations: [
              {
                field: "relatedDecisions",
                targetModel: "decision",
                targetSlug: decisionId,
              },
            ],
          },
        },
        {
          kind: "output",
          signals: [
            {
              code: "review_approved",
              severity: "info",
              message: "Revision approved.",
            },
          ],
          verification: {
            status: "passed",
            summary: "Revision review passed.",
          },
        },
      ]);
      expect(revisionReview.decisionInput).toMatchObject({
        input: { exactBaseRef: revisionCheckpoint },
      });
      const documentation = await runStage(
        "tick-h",
        11_000,
        "technical-writer",
        [
          {
            kind: "tool",
            toolId: "treeseed.content.create",
            input: {
              model: "note",
              title: "Release-channel behavior documentation",
              body: "Release-channel inputs are trimmed, lowercased, and must be non-empty.",
              relations: [
                {
                  field: "relatedDecisions",
                  targetModel: "decision",
                  targetSlug: decisionId,
                },
              ],
            },
          },
          {
            kind: "output",
            verification: {
              status: "passed",
              summary: "Owned behavior documentation is complete.",
            },
          },
        ],
      );
      expect(documentation.decisionInput).toMatchObject({
        input: { exactBaseRef: revisionCheckpoint },
      });
      const release = await runStage("tick-i", 12_000, "releaser", [
        {
          kind: "tool",
          toolId: "treeseed.content.create",
          input: {
            model: "note",
            title: "Release-channel readiness",
            body: "Test, implementation, revision, review, and documentation evidence are complete; hosted release remains suspended.",
            relations: [
              {
                field: "relatedDecisions",
                targetModel: "decision",
                targetSlug: decisionId,
              },
            ],
          },
        },
        {
          kind: "output",
          signals: [
            {
              code: "release_ready",
              severity: "info",
              message: "Locally ready; hosted release remains fail-closed.",
            },
          ],
          verification: {
            status: "passed",
            summary: "Local release-readiness checks passed.",
          },
        },
      ]);
      expect(release.decisionInput).toMatchObject({
        input: { exactBaseRef: revisionCheckpoint },
      });
      const completedGraph = await store.getDecisionAssignmentGraph(graph.id);
      expect(completedGraph).toMatchObject({ status: "completed" });
      expect(
        completedGraph?.nodes.every((node) => node.status === "completed"),
      ).toBe(true);
      await store.run(
        `UPDATE project_agent_classes SET allowed_modes_json = '["planning"]' WHERE id = 'project-a:reporting'`,
      );
      const reporter = await runStage("tick-report", 13_000, "reporter", [
        {
          kind: "tool",
          toolId: "treeseed.content.create",
          input: {
            model: "note",
            title: "Engineering workday summary",
            body: "Research, architecture, test-first implementation, revision, verification, review, documentation, and local release-readiness completed with traceable usage and settlement.",
            relations: [
              {
                field: "relatedDecisions",
                targetModel: "decision",
                targetSlug: decisionId,
              },
            ],
          },
        },
        {
          kind: "output",
          verification: {
            status: "passed",
            summary: "Deterministic workday summary completed.",
          },
        },
      ]);
      expect(reporter).toMatchObject({
        mode: "planning",
        handlerId: "reporter",
      });
      expect(
        [...workspaceFiles.keys()].filter((path) =>
          path.endsWith("/engineering-workday-summary.mdx"),
        ),
      ).toHaveLength(1);
      expect(
        await store.first(
          `SELECT COUNT(*) AS count FROM capacity_provider_assignments WHERE status = 'completed'`,
        ),
	  ).toEqual({ count: 22 });
      expect(
        await store.first(
          `SELECT COUNT(*) AS count FROM capacity_ledger_entries WHERE phase = 'task_completed_actual_settlement'`,
        ),
	  ).toEqual({ count: 22 });

      const demandCount = await store.first(
        `SELECT COUNT(*) AS count FROM capacity_workday_demands`,
      );
      const replayA = await tickCapacityWorkdayRun(
        store,
        "team-a",
        "run-a",
        new Date(Date.parse(now) + 13_000).toISOString(),
        "tick-report",
      );
      const replayB = await tickCapacityWorkdayRun(
        store,
        "team-a",
        "run-a",
        new Date(Date.parse(now) + 14_000).toISOString(),
        "tick-report",
      );
      expect(replayB).toEqual(replayA);
      expect(
        await store.first(
          `SELECT COUNT(*) AS count FROM capacity_workday_demands`,
        ),
      ).toEqual(demandCount);
      await store.updateCapacityWorkdayRun("team-a", "run-a", {
        status: "completed",
        summary: { reporterAssignmentId: reporter.id },
      });
      expect(
        await store.getCapacityWorkdayRun("team-a", "run-a"),
      ).toMatchObject({ status: "completed" });
      expect(
        await store.first(
          `SELECT COUNT(*) AS count FROM capacity_provider_assignments WHERE status IN ('leased','accepted','running')`,
        ),
      ).toEqual({ count: 0 });
      expect(
        await store.first(
          `SELECT COUNT(*) AS count FROM capacity_reservations WHERE state = 'reserved'`,
        ),
      ).toEqual({ count: 0 });
      expect(
        await store.first(
          `SELECT COUNT(*) AS count FROM capacity_workday_demands WHERE status IN ('pending','claimed')`,
        ),
      ).toEqual({ count: 0 });
    } finally {
      await database.close();
    }
  }, 120_000);
});
