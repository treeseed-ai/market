import type { AgentGuaranteeProofPredicate,AgentGuaranteeProofValueRef } from '../../../packages/sdk/src/guarantees/contracts/agent-guarantee-contracts.ts';
import type { ProofCommandResult } from './cli-runtime.ts';

function children(value:unknown,token:string):unknown[] {
	const wildcard=token.endsWith('[*]'); const key=wildcard?token.slice(0,-3):token;
	const indexed=wildcard?null:key.match(/^(.*)\[(\d+)\]$/u);
	if(indexed) {
		const selected=indexed[1] ? (value&&typeof value==='object'&&!Array.isArray(value)?(value as Record<string,unknown>)[indexed[1]]:undefined) : value;
		return Array.isArray(selected)?[selected[Number(indexed[2])]]:[];
	}
	const selected=key ? (value&&typeof value==='object'&&!Array.isArray(value)?(value as Record<string,unknown>)[key]:undefined) : value;
	return wildcard ? (Array.isArray(selected)?selected:[]) : [selected];
}

export function evidenceValues(results:Map<string,ProofCommandResult>,ref:AgentGuaranteeProofValueRef):unknown[] {
	let values:unknown[]=[results.get(ref.commandId)?.payload];
	for(const token of ref.path.split('.').filter(Boolean)) values=values.flatMap((value)=>children(value,token));
	return values.filter((value)=>value!==undefined);
}

function normalized(value:unknown){ return JSON.stringify(value); }
function expectedValue(results:Map<string,ProofCommandResult>,predicate:AgentGuaranteeProofPredicate):unknown {
	if(predicate.expectedRef) { const values=evidenceValues(results,predicate.expectedRef); return values.length===1?values[0]:values; }
	return predicate.expected;
}

export function evaluatePredicate(results:Map<string,ProofCommandResult>,predicate:AgentGuaranteeProofPredicate) {
	const values=evidenceValues(results,predicate); const expected=expectedValue(results,predicate);
	let passed=false;
	if(predicate.operator==='exists') passed=values.some((value)=>value!==null&&value!==''&&(!Array.isArray(value)||value.length>0));
	if(predicate.operator==='equals') passed=values.length>0&&values.every((value)=>normalized(value)===normalized(expected));
	if(predicate.operator==='not-equals') passed=values.length>0&&values.every((value)=>normalized(value)!==normalized(expected));
	if(predicate.operator==='includes') passed=values.length>0&&values.every((value)=>typeof value==='string'?value.includes(String(expected)):Array.isArray(value)&&value.some((entry)=>normalized(entry)===normalized(expected)));
	if(predicate.operator==='matches') { try { const pattern=new RegExp(String(expected),'u'); passed=values.length>0&&values.every((value)=>pattern.test(String(value))); } catch { passed=false; } }
	if(predicate.operator==='length-at-least') passed=values.length>0&&values.every((value)=>(typeof value==='string'||Array.isArray(value))&&value.length>=Number(expected));
	if(predicate.operator==='distinct') { const flattened=values.flatMap((value)=>Array.isArray(value)?value:[value]).filter((value)=>value!==null&&value!==''); passed=flattened.length>=2&&new Set(flattened.map(normalized)).size===flattened.length; }
	return {passed,diagnostic:passed?'':`${predicate.id} failed: ${predicate.path} ${predicate.operator} ${normalized(expected)}; observed ${normalized(values)}.`};
}

export function scalarEvidence(results:Map<string,ProofCommandResult>,ref:AgentGuaranteeProofValueRef) {
	const values=evidenceValues(results,ref).flatMap((value)=>Array.isArray(value)?value:[value]).filter((value)=>value!==undefined&&value!==null&&value!=='');
	return values.length===1?String(values[0]):values.map(String).join(',');
}
