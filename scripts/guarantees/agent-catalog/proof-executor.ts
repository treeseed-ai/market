import { mkdirSync,writeFileSync } from 'node:fs';
import { relative,resolve } from 'node:path';
import type { AgentGuaranteeProofInput,GuaranteeVerifierResult } from '../../../packages/sdk/src/guarantees/contracts/agent-guarantee-contracts.ts';
import { redactProofArgs,redactProofValue,runProofCli,type ProofCommandResult } from './cli-runtime.ts';
import { evidenceValues,evaluatePredicate,scalarEvidence } from './json-evidence.ts';

const numberEvidence=(results:Map<string,ProofCommandResult>,ref:Parameters<typeof evidenceValues>[1])=>Number(evidenceValues(results,ref)[0]??Number.NaN);
const booleanEvidence=(results:Map<string,ProofCommandResult>,ref:Parameters<typeof evidenceValues>[1])=>evidenceValues(results,ref)[0]===true;

export function executeProof(input:{workspaceRoot:string;outputRoot:string;guaranteeId:string;sourceGeneration:string;proof:AgentGuaranteeProofInput}) : GuaranteeVerifierResult {
	const evidenceRoot=resolve(input.outputRoot,'agent-catalog',input.proof.capabilityId.replaceAll('.','-'));
	mkdirSync(evidenceRoot,{recursive:true});
	const results=new Map<string,ProofCommandResult>(); const evidenceByCommand=new Map<string,string>();
	for(const command of input.proof.commands) {
		const result=runProofCli(input.workspaceRoot,command.id,command.args); results.set(command.id,result);
		const path=resolve(evidenceRoot,`${command.id}.json`);
		writeFileSync(path,`${JSON.stringify(redactProofValue({command:['trsd',...redactProofArgs(command.args)],expectedExitCode:command.expectedExitCode,exitCode:result.exitCode,payload:result.payload}),null,2)}\n`);
		evidenceByCommand.set(command.id,relative(input.workspaceRoot,path).replaceAll('\\','/'));
	}
	const assertions=input.proof.outcomes.map((outcome)=>{
		const commandFailures=outcome.evidenceCommands.filter((id)=>{
			const command=input.proof.commands.find((entry)=>entry.id===id); return !command||results.get(id)?.exitCode!==command.expectedExitCode;
		});
		const predicateResults=outcome.predicates.map((predicate)=>evaluatePredicate(results,predicate));
		const diagnostics=[...commandFailures.map((id)=>`Command ${id} did not return its declared exit code.`),...predicateResults.filter((entry)=>!entry.passed).map((entry)=>entry.diagnostic)];
		return {id:outcome.outcomeId,status:diagnostics.length?'failed' as const:'passed' as const,evidence:outcome.evidenceCommands.map((id)=>evidenceByCommand.get(id)!).filter(Boolean),entityRefs:Object.fromEntries(Object.entries(outcome.entityRefs).map(([key,value])=>[key,scalarEvidence(results,value)])),diagnostics};
	});
	const repositoryPostconditions=input.proof.repositoryPostconditions.map((entry)=>({
		repository:entry.repository,baseRef:scalarEvidence(results,entry.baseRef),effectiveRef:scalarEvidence(results,entry.effectiveRef),...(entry.targetRef?{targetRef:scalarEvidence(results,entry.targetRef)}:{}),changedPaths:evidenceValues(results,entry.changedPaths).flatMap((value)=>Array.isArray(value)?value:[value]).map(String),readBackVerified:booleanEvidence(results,entry.readBackVerified),
	}));
	const cleanup=input.proof.cleanup;
	return {schemaVersion:'treeseed.guarantee-verifier-result/v1',guaranteeId:input.guaranteeId,capabilityId:input.proof.capabilityId,variant:input.proof.variant,sourceGeneration:input.sourceGeneration,assertions,repositoryPostconditions,cleanup:{verified:booleanEvidence(results,cleanup.verified),activeAssignments:numberEvidence(results,cleanup.activeAssignments),activeLeases:numberEvidence(results,cleanup.activeLeases),activeReservations:numberEvidence(results,cleanup.activeReservations),activeDemands:numberEvidence(results,cleanup.activeDemands),activeWorkspaces:numberEvidence(results,cleanup.activeWorkspaces),activeWorktrees:numberEvidence(results,cleanup.activeWorktrees),unpublishedBranches:numberEvidence(results,cleanup.unpublishedBranches),staleAuthorities:numberEvidence(results,cleanup.staleAuthorities)},evidence:[...evidenceByCommand.values()]};
}
