import { streamText, UIMessage, convertToModelMessages } from 'ai';
import {
  WEB_SEARCH_MODEL,
  resolveAnthropicModel,
} from '@/lib/ai/models';
import { buildProviderOptions } from '@/lib/ai/provider-options';

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
  const providerOptions = !webSearch
    ? buildProviderOptions({
        model: selectedModel,
        extendedThinking,
      })
    : undefined;

  const modelId = webSearch ? WEB_SEARCH_MODEL : selectedModel;

  const result = streamText({
    model: modelId,
    messages: convertToModelMessages(messages),
    providerOptions,
    system:
      'You are a helpful assistant that can answer questions and help with tasks',
  });

  // send sources and reasoning back to the client
  return result.toUIMessageStreamResponse({
    sendSources: true,
    sendReasoning: true,
  });
}
