import { loadAppContext } from './app-access.js';
import { type OperationalContext, type OperationalMetric } from './shared.js';
import {
	buildGovernanceApprovalProjection,
	buildGovernanceProjection,
	type GovernanceApprovalProjection,
	type GovernanceCapacityConstraint,
	type GovernanceEvent,
	type GovernancePolicyItem,
	type GovernanceReviewItem,
} from '../lib/market/governance-projection.js';

export interface GovernanceViewModel {
	context: OperationalContext;
	metrics: OperationalMetric[];
	pendingApprovals: GovernanceReviewItem[];
	escalations: GovernanceReviewItem[];
	reviewQueue: GovernanceReviewItem[];
	reviewTimeline: GovernanceEvent[];
	policies: GovernancePolicyItem[];
	policyViolations: GovernanceCapacityConstraint[];
	capacityConstraints: GovernanceCapacityConstraint[];
	auditTrail: GovernanceEvent[];
}

export async function loadGovernanceViewModel(input: any): Promise<GovernanceViewModel> {
	const context = await loadAppContext(input);
	const projection = await buildGovernanceProjection({
		store: context.store,
		principal: context.principal,
		teams: context.teams,
		projects: context.projects,
	});

	return {
		context,
		...projection,
	};
}

export interface GovernanceApprovalViewModel {
	context: OperationalContext;
	detail: GovernanceApprovalProjection | null;
}

export async function loadGovernanceApprovalViewModel(input: any, approvalId: string): Promise<GovernanceApprovalViewModel> {
	const context = await loadAppContext(input);
	const detail = await buildGovernanceApprovalProjection({
		store: context.store,
		principal: context.principal,
		teams: context.teams,
		projects: context.projects,
		approvalId,
	});
	return {
		context,
		detail,
	};
}
