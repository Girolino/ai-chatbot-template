import { streamText, UIMessage, convertToModelMessages } from 'ai';
import { resolveAnthropicModel } from '@/lib/ai/models';
import { buildProviderOptions } from '@/lib/ai/provider-options';
import { buildAnthropicTools, DEFAULT_SKILLS } from '@/lib/ai/tools';

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

  const result = streamText({
    model: selectedModel,
    messages: convertToModelMessages(messages),
    providerOptions,
    tools,
    system:
      'You are a helpful assistant that can answer questions and help with tasks',
  });

  // send sources and reasoning back to the client
  return result.toUIMessageStreamResponse({
    sendSources: true,
    sendReasoning: true,
  });
}
