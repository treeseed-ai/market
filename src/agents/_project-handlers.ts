import type { AgentHandler, AgentHandlerOutput } from '@treeseed/agent/runtime-types';

type Inputs = {
  objective: string | null;
  triggerKind: string;
};

type Result = Inputs & {
  summary: string;
  messageType: string;
};

function objectiveText(context: Parameters<AgentHandler<Inputs, Result>['resolveInputs']>[0]) {
  return context.coreObjective?.content ?? context.coreObjective?.message ?? null;
}

function completed(summary: string, metadata: Record<string, unknown> = {}): AgentHandlerOutput {
  return { status: 'completed', summary, metadata };
}

function createProjectHandler(kind: string, messageType: string, verb: string): AgentHandler<Inputs, Result> {
  return {
    kind,
    async resolveInputs(context) {
      return {
        objective: objectiveText(context),
        triggerKind: context.trigger.kind,
      };
    },
    async execute(_context, inputs) {
      return {
        ...inputs,
        messageType,
        summary: `${verb}: ${inputs.objective ?? 'No core objective was provided.'}`,
      };
    },
    async emitOutputs(context, result) {
      await context.sdk.createMessage({
        type: result.messageType,
        payload: {
          handler: kind,
          runId: context.runId,
          triggerKind: result.triggerKind,
          objective: result.objective,
          projectOwnedHandler: true,
          approvalRequiredForMutation: true,
          contextSource: 'treedx-rendered-mdx',
        },
      });
      return {
        ...completed(result.summary, {
		projectOwnedHandler: true,
		approvalRequiredForMutation: true,
		contextSource: 'treedx-rendered-mdx',
        }),
        status: result.objective ? 'completed' : 'waiting',
      };
    },
  };
}

export const planHandler = createProjectHandler('plan', 'objective_priority_updated', 'Prepared planning proposal');
export const actHandler = createProjectHandler('act', 'task_waiting', 'Prepared implementation plan awaiting approval');
export const reviewHandler = createProjectHandler('review', 'task_verified', 'Prepared review report');
export const reportHandler = createProjectHandler('report', 'report_created', 'Prepared report');
