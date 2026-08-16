import { resolve } from 'node:path';
import { describe,expect,it } from 'vitest';
import { createAgentGuaranteeCatalogStatus } from '../../../packages/sdk/src/guarantees/contracts/agent-guarantee-status.ts';
import { discoverGuarantees } from '../../../packages/sdk/src/guarantees/index/parse-verifier-registry.ts';

const root=resolve(import.meta.dirname,'../../..');

describe('canonical agent catalog proof readiness',()=>{
	it('defines executable proof requirements for all fifteen ordered capabilities',()=>{
		const status=createAgentGuaranteeCatalogStatus({workspaceRoot:root,catalog:'agent.system'});
		expect(status.ok).toBe(true);
		expect(status.entries).toHaveLength(15);
		for(const entry of status.entries) {
			expect(entry.proofReadiness.requiredCommands.length,entry.capabilityId).toBeGreaterThan(0);
			expect(Object.values(entry.proofReadiness.outcomePredicates).flat().length,entry.capabilityId).toBeGreaterThan(0);
			expect(entry.proofReadiness.invocation).toContain('--prove-planned');
			if(entry.capabilityId!=='agent.context.dynamic-readiness') expect(entry.proofReadiness.requiresProofInput,entry.capabilityId).toBe(true);
		}
	});

	it('requires exact reads and repository postconditions for repository-writing capabilities',()=>{
		const status=createAgentGuaranteeCatalogStatus({workspaceRoot:root,catalog:'agent.system'});
		const byCapability=new Map(status.entries.map((entry)=>[entry.capabilityId,entry]));
		for(const capability of ['agent.profile.planning-outcome','agent.profile.acting-outcome','agent.profile.reviewing-outcome','agent.handoff.exact-and-independent','agent.profile.reporting-outcome','agent.lifecycle.replay-recovery-and-truthfulness','agent.system.source-golden','agent.system.guide-golden']) expect(byCapability.get(capability)?.proofReadiness.minimumRepositoryPostconditions,capability).toBeGreaterThanOrEqual(1);
		expect(byCapability.get('agent.system.source-golden')?.proofReadiness.requiredCommands).toContain('governance.proposal-show');
		expect(byCapability.get('agent.system.guide-golden')?.proofReadiness.requiredCommands).not.toContain('governance.proposal-list');
	});

	it('scopes deficient source and Guide project roles to their intended variants',()=>{
		const registry=discoverGuarantees({workspaceRoot:root,filter:{ids:['guarantee.agent.system.source-golden.917','guarantee.agent.system.guide-golden.918']}});
		const source=registry.guarantees.find((entry)=>entry.manifest?.id==='guarantee.agent.system.source-golden.917')!.manifest!.catalogContract!;
		const guide=registry.guarantees.find((entry)=>entry.manifest?.id==='guarantee.agent.system.guide-golden.918')!.manifest!.catalogContract!;
		expect(source.outcomes.find((entry)=>entry.id==='source.rejection-revision')?.variants).toEqual(['interruption-resume']);
		expect(guide.outcomes.find((entry)=>entry.id==='guide.ephemeral-baseline')?.variants).toEqual(['baseline']);
		expect(guide.outcomes.find((entry)=>entry.id==='guide.canonical-integration')?.variants).toEqual(['clean-repeat']);
		expect(guide.outcomes.find((entry)=>entry.id==='guide.ephemeral-interruption')?.variants).toEqual(['interruption-resume']);
		expect(guide.activation.distinctEntityRefs).toEqual([{subject:'ephemeralProject',variants:['baseline','interruption-resume']}]);
	});
});
