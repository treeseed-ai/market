type Inputs = {
  objective: string | null;
  triggerKind: string;
};

type Result = Inputs & {
  summary: string;
  messageType: string;
};

type AgentHandlerOutput = {
  status: 'completed' | 'waiting' | 'failed';
  summary: string;
  metadata?: Record<string, unknown>;
};

type ProjectHandlerContext = {
  runId: string;
  coreObjective?: {
    content?: string | null;
    message?: string | null;
  } | null;
  trigger: {
    kind: string;
  };
  sdk: {
    createMessage(message: {
      type: string;
      payload: Record<string, unknown>;
    }): Promise<unknown>;
  };
};

type AgentHandler<TInputs, TResult> = {
  kind: string;
  resolveInputs(context: ProjectHandlerContext): Promise<TInputs> | TInputs;
  execute(context: ProjectHandlerContext, inputs: TInputs): Promise<TResult> | TResult;
  emitOutputs(context: ProjectHandlerContext, result: TResult): Promise<AgentHandlerOutput> | AgentHandlerOutput;
};

function objectiveText(context: ProjectHandlerContext) {
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
