import { existsSync,readFileSync } from 'node:fs';
import { isAbsolute,relative,resolve } from 'node:path';
import type { GuaranteeCatalogContract } from '../../../packages/sdk/src/guarantees/contracts/agent-guarantee-contracts.ts';
import { parseAgentGuaranteeProofInput } from '../../../packages/sdk/src/guarantees/contracts/parse-agent-guarantee-proof.ts';

export function loadProofInput(input:{workspaceRoot:string;contract:GuaranteeCatalogContract;variant:string;sourceGeneration:string}) {
	let state:Record<string,unknown>={};
	try { state=JSON.parse(process.env.TREESEED_GUARANTEE_RUN_STATE??'{}') as Record<string,unknown>; } catch { /* diagnosed below */ }
	const configured=typeof state.agentProofInput==='string'?state.agentProofInput.trim():'';
	if(!configured) return {ok:false as const,issues:['This capability requires --proof-input <workspace-relative-json>.']};
	const path=resolve(input.workspaceRoot,configured); const traversal=relative(input.workspaceRoot,path);
	if(isAbsolute(configured)||traversal.startsWith('..')||isAbsolute(traversal)) return {ok:false as const,issues:['Proof input must be workspace-relative.']};
	if(!existsSync(path)) return {ok:false as const,issues:[`Proof input ${configured} does not exist.`]};
	let parsed:unknown;
	try { parsed=JSON.parse(readFileSync(path,'utf8')); } catch(error) { return {ok:false as const,issues:[`Proof input is not valid JSON: ${error instanceof Error?error.message:String(error)}`]}; }
	const result=parseAgentGuaranteeProofInput(parsed,input.contract,input.variant,input.sourceGeneration);
	return result.ok?{ok:true as const,proof:result.proof,path}:{ok:false as const,issues:result.issues};
}
