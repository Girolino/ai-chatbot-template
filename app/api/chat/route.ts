import {
  createUIMessageStream,
  createUIMessageStreamResponse,
  streamText,
  type UIMessage,
  convertToModelMessages,
} from 'ai';
import { auth, createClerkClient } from '@clerk/nextjs/server';
import { resolveAnthropicModel } from '@/lib/ai/models';
import { buildProviderOptions } from '@/lib/ai/provider-options';
import { buildAnthropicTools, DEFAULT_SKILLS } from '@/lib/ai/tools';
import { chatRunArtifact } from '@/lib/ai/artifacts';
import { ConvexMemoryProvider } from '@/lib/ai/convex-memory-provider';
import { createConvexClient, api } from '@/lib/convex/server';
import type { Id } from '@/convex/_generated/dataModel';

const toProjectId = (value: string): Id<'projects'> => value as Id<'projects'>;

type ChatRequestBody = {
  id?: string;
  projectId?: string;
  messages: UIMessage[];
  model?: string;
  webSearch?: boolean;
  extendedThinking?: boolean;
};

// Allow streaming responses up to 30 seconds
export const maxDuration = 30;

type AuthResult = Awaited<ReturnType<typeof auth>>;

type AuthResolution = {
  auth: AuthResult;
  headers?: Headers;
};

async function resolveAuth(req: Request): Promise<AuthResolution> {
  try {
    const result = await auth();
    if (!result?.userId) {
      console.warn('[chat auth] auth() returned without userId; continuing to check fallback');
    }
    return { auth: result };
  } catch (error) {
    console.warn('[chat auth] auth() threw, attempting fallback', {
      error: error instanceof Error ? error.message : error,
      cookies: req.headers.get('cookie') ?? '<none>',
    });
    const secretKey = process.env.CLERK_SECRET_KEY;
    const publishableKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;

    if (!secretKey || !publishableKey) {
      throw new Error('Missing Clerk environment variables for fallback authentication.');
    }

    const clerk = createClerkClient({ secretKey, publishableKey });
    const requestState = await clerk.authenticateRequest(req);
    console.warn('[chat auth] fallback authenticateRequest state', {
      status: requestState.status,
      isSignedIn: requestState.isSignedIn,
      reason: requestState.reason,
      headers: Array.from(requestState.headers.entries()),
    });
    const authObject = requestState.toAuth();

    if (authObject?.sessionId) {
      const sessionId = authObject.sessionId as string;
      const getToken: AuthResult['getToken'] = async (options) => {
        const token = await clerk.sessions.getToken(
          sessionId,
          options?.template,
          options?.expiresInSeconds,
        );
        return token.jwt;
      };

      console.info('[chat auth] fallback authenticated session', {
        userId: authObject.userId,
        sessionId,
        cookies: req.headers.get('cookie') ?? '<none>',
      });

      return {
        auth: {
          ...authObject,
          getToken,
        } as AuthResult,
        headers: requestState.headers,
      };
    }

    const getNullToken: AuthResult['getToken'] = async () => null;

    console.warn('[chat auth] fallback completed without session; treating as signed out', {
      userId: authObject?.userId,
      cookies: req.headers.get('cookie') ?? '<none>',
    });

    return {
      auth: {
        ...authObject,
        getToken: getNullToken,
      } as AuthResult,
      headers: requestState.headers,
    };
  }
}

export async function POST(req: Request) {
  const { auth: authResult, headers: authHeaders } = await resolveAuth(req);
  if (!authResult.userId) {
    return new Response('Unauthorized', { status: 401 });
  }

  const body = (await req.json()) as ChatRequestBody;
  const {
    id: clientChatId,
    projectId,
    messages,
    model,
    webSearch = false,
    extendedThinking = false,
  } = body;

  if (!Array.isArray(messages) || messages.length === 0) {
    return new Response('Missing messages in request body.', { status: 400 });
  }

  const convexToken = await authResult.getToken({ template: 'convex' });
  const convex = createConvexClient(convexToken ?? undefined);

  const resolvedClientChatId =
    typeof clientChatId === 'string' && clientChatId.length > 0
      ? clientChatId
      : crypto.randomUUID();

  let chat = await convex
    .query(api.chats.getByClientId, { clientId: resolvedClientChatId })
    .catch(() => null);

  if (!chat) {
    const newChatId = await convex.mutation(api.chats.create, {
      clientId: resolvedClientChatId,
      projectId: projectId ? toProjectId(projectId) : undefined,
    });
    chat = await convex.query(api.chats.get, { chatId: newChatId });
  }

  if (!chat) {
    return new Response('Failed to initialize chat session.', { status: 500 });
  }

  const chatId = chat._id;
  const resolvedProjectId = chat.projectId ?? (projectId ? toProjectId(projectId) : undefined);
  const projectIdForContext = resolvedProjectId ? String(resolvedProjectId) : undefined;

  await persistUserMessages(convex, chatId, messages);

  if (chat.titleStatus === 'pending') {
    const firstUserMessage = messages.find((message) => message.role === 'user');
    const promptText = firstUserMessage
      ? extractTextFromParts(normalizeMessageParts(firstUserMessage))
      : '';

    if (promptText) {
      convex
        .mutation(api.chats.setTitleStatus, {
          chatId,
          status: 'generating',
        })
        .then(() => convex.action(api.chatTitles.generate, { chatId, prompt: promptText }))
        .catch((error) => {
          console.error('[chat title] scheduling failed', error);
        });
    }
  }

  const selectedModel = resolveAnthropicModel(model);
  const enableSkills = true;
  const startedAt = new Date().toISOString();

  const memoryProvider = new ConvexMemoryProvider(convex, {
    chatId: String(chatId),
    projectId: projectIdForContext,
    userId: authResult.userId,
  });

  const tools = buildAnthropicTools({
    enableMemory: true,
    enableWebFetch: true,
    enableSkills,
    enableWebSearch: webSearch,
    memoryContext: {
      convex,
      chatId,
      projectId: projectIdForContext,
    },
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
            'You are a helpful assistant that can answer questions and help with tasks. ' +
            'When a structured summary or set of highlights would help the user, call the `note` tool to share a titled note panel.',
        });

        writer.merge(
          result.toUIMessageStream({
            sendSources: true,
            sendReasoning: true,
          }),
        );

        const [assistantContent, responseMetadata, totalUsage, toolCalls, toolResults] =
          await Promise.all([
            result.content.catch(() => []),
            result.response.catch(() => null),
            result.totalUsage.catch(() => undefined),
            result.toolCalls.catch(() => []),
            result.toolResults.catch(() => []),
          ]);

        const providerMetadata =
          responseMetadata && typeof responseMetadata === 'object' && responseMetadata !== null
            ? (responseMetadata as Record<string, unknown>).providerMetadata
            : undefined;

        const tokens = {
          totalTokens: totalUsage?.totalTokens ?? null,
          inputTokens: totalUsage?.inputTokens ?? null,
          outputTokens: totalUsage?.outputTokens ?? null,
        };

        const toolsUsed = Array.from(
          new Set(
            toolCalls
              .map((call) => call.toolName)
              .filter((value): value is string => Boolean(value)),
          ),
        );

        await convex.mutation(api.messages.appendAssistantMessage, {
          chatId,
          messageId: undefined,
          parts: assistantContent,
          providerMetadata: providerMetadata as unknown,
          usage: totalUsage ?? undefined,
          toolCalls,
          status: 'complete',
          createdAt: Date.now(),
        });

        await convex.mutation(api.chats.touch, { chatId, lastMessageAt: Date.now() });

        await persistToolUsage(convex, chatId, toolCalls, toolResults);

        const workingMemorySnippet = buildWorkingMemorySnippet(messages, assistantContent);
        if (workingMemorySnippet) {
          await memoryProvider.updateWorkingMemory({
            scope: 'chat',
            content: workingMemorySnippet,
          });
        }

        const finishedAt = new Date().toISOString();
        const runSummary = {
          status: 'complete' as const,
          model: selectedModel,
          webSearch,
          extendedThinking,
          startedAt,
          finishedAt,
          totalTokens: tokens.totalTokens,
          inputTokens: tokens.inputTokens,
          outputTokens: tokens.outputTokens,
          toolsUsed,
          error: null as string | null,
        };

        await convex.mutation(api.artifacts.upsert, {
          chatId,
          type: 'chat-run',
          payload: runSummary,
          status: runSummary.status,
        });

        await runArtifact.complete(runSummary);
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';

        await convex.mutation(api.artifacts.upsert, {
          chatId,
          type: 'chat-run',
          payload: {
            status: 'error',
            model: selectedModel,
            webSearch,
            extendedThinking,
            startedAt,
            finishedAt: new Date().toISOString(),
            error: message,
          },
          status: 'error',
        });

        await runArtifact.error(message);
        throw error;
      }
    },
  });

  const response = createUIMessageStreamResponse({ stream });
  if (authHeaders) {
    authHeaders.forEach((value, key) => {
      response.headers.set(key, value);
    });
  }
  return response;
}

function normalizeMessageParts(message: UIMessage): unknown[] {
  if ('parts' in message && Array.isArray((message as { parts?: unknown[] }).parts)) {
    return (message as { parts: unknown[] }).parts;
  }
  const maybeContent = (message as unknown as Record<string, unknown>).content;
  if (typeof maybeContent === 'string') {
    return [{ type: 'text', text: maybeContent }];
  }
  return [];
}

async function persistUserMessages(
  convex: ReturnType<typeof createConvexClient>,
  chatId: Id<'chats'>,
  messages: UIMessage[],
) {
  const userMessages = messages.filter((message) => message.role === 'user');
  for (const message of userMessages) {
    const parts = normalizeMessageParts(message);
    await convex.mutation(api.messages.appendUserMessage, {
      chatId,
      messageId: message.id,
      parts,
      metadata: undefined,
      createdAt: Date.now(),
    });
  }
}

async function persistToolUsage(
  convex: ReturnType<typeof createConvexClient>,
  chatId: Id<'chats'>,
  toolCalls: unknown[],
  toolResults: unknown[],
) {
  if (!toolCalls || toolCalls.length === 0) {
    return;
  }

  const resultsById = new Map(
    (toolResults as Array<{ toolCallId?: string }>).map((result) => [result.toolCallId, result]),
  );

  await Promise.all(
    (toolCalls as Array<{ toolName?: string; toolCallId?: string; input?: unknown }>).map(
      async (call) => {
        const result = call.toolCallId ? resultsById.get(call.toolCallId) : undefined;
        await convex.mutation(api.tools.record, {
          chatId,
          toolName: call.toolName ?? 'unknown',
          input: call.input,
          output: result as unknown,
          status: result ? 'complete' : 'pending',
          durationMs: undefined,
        });
      },
    ),
  );
}

function extractTextFromParts(parts: unknown[]): string {
  return parts
    .filter(
      (part): part is { type: string; text: string } =>
        typeof part === 'object' &&
        part !== null &&
        (part as { type?: unknown }).type === 'text' &&
        typeof (part as { text?: unknown }).text === 'string',
    )
    .map((part) => part.text)
    .join('\n\n');
}

function buildWorkingMemorySnippet(
  messages: UIMessage[],
  assistantParts: unknown[],
): string | null {
  const lastUserMessage = [...messages].reverse().find((message) => message.role === 'user');
  const userText = lastUserMessage ? extractTextFromParts(normalizeMessageParts(lastUserMessage)) : '';
  const assistantText = extractTextFromParts(assistantParts);

  if (!userText && !assistantText) {
    return null;
  }

  return [
    '# Latest exchange',
    userText ? `**User**\n${userText}` : null,
    assistantText ? `**Assistant**\n${assistantText}` : null,
  ]
    .filter(Boolean)
    .join('\n\n');
}

export const __resolveAuthForTests = resolveAuth;
