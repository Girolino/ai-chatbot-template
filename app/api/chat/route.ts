import {
  createUIMessageStream,
  createUIMessageStreamResponse,
  streamText,
  UIMessage,
  convertToModelMessages,
} from 'ai';
import { resolveAnthropicModel } from '@/lib/ai/models';
import { buildProviderOptions } from '@/lib/ai/provider-options';
import { buildAnthropicTools, DEFAULT_SKILLS } from '@/lib/ai/tools';
import { chatRunArtifact } from '@/lib/ai/artifacts';

// Allow streaming responses up to 30 seconds
export const maxDuration = 30;

export async function POST(req: Request) {
  const {
    messages,
    model,
    webSearch = false,
    extendedThinking = false,
  }: { 
    messages: UIMessage[]; 
    model?: string;
    webSearch?: boolean;
    extendedThinking?: boolean;
  } = await req.json();

  const selectedModel = resolveAnthropicModel(model);
  const enableSkills = true;
  const startedAt = new Date().toISOString();

  const tools = buildAnthropicTools({
    enableMemory: true,
    enableWebFetch: true,
    enableSkills,
    enableWebSearch: webSearch,
  });

  const providerOptions = buildProviderOptions({
    model: selectedModel,
    extendedThinking,
    skills: enableSkills ? DEFAULT_SKILLS : undefined,
  });

  const stream = createUIMessageStream({
    execute: async ({ writer }) => {
      const runArtifact = chatRunArtifact.stream(
        {
          status: 'running',
          model: selectedModel,
          webSearch,
          extendedThinking,
          startedAt,
        },
        writer,
      );

      try {
        const result = streamText({
          model: selectedModel,
          messages: convertToModelMessages(messages),
          providerOptions,
          tools,
          experimental_context: { writer },
          system:
            'You are a helpful assistant that can answer questions and help with tasks. '
            + 'When a structured summary or set of highlights would help the user, call the `note` tool to share a titled note panel.',
        });

        writer.merge(
          result.toUIMessageStream({
            sendSources: true,
            sendReasoning: true,
          }),
        );

        const [usage, toolCalls] = await Promise.all([
          result.totalUsage.catch(() => undefined),
          result.toolCalls.catch(() => []),
        ]);

        const tokens = {
          totalTokens: usage?.totalTokens ?? null,
          inputTokens: usage?.inputTokens ?? null,
          outputTokens: usage?.outputTokens ?? null,
        };

        const toolsUsed = Array.from(
          new Set(
            toolCalls
              .map((call) => call.toolName)
              .filter((value): value is string => Boolean(value)),
          ),
        );

        await runArtifact.complete({
          status: 'complete',
          model: selectedModel,
          webSearch,
          extendedThinking,
          startedAt,
          finishedAt: new Date().toISOString(),
          totalTokens: tokens.totalTokens,
          inputTokens: tokens.inputTokens,
          outputTokens: tokens.outputTokens,
          toolsUsed,
          error: null,
        });
      } catch (error) {
        await runArtifact.error(
          error instanceof Error ? error.message : 'Unknown error',
        );
        throw error;
      }
    },
  });

  return createUIMessageStreamResponse({ stream });
}
