import { v } from 'convex/values';
import type { MutationCtx } from './_generated/server';
import { mutation } from './_generated/server';
import type { Id } from './_generated/dataModel';
import type { Doc } from './_generated/dataModel';
import { ensureChatAccess } from './chats';
import { requireIdentity } from './utils';

type AssistantMessageArgs = {
  messageId?: string;
  parts: unknown[];
  providerMetadata?: unknown;
  usage?: unknown;
  toolCalls?: unknown[];
  status?: string;
  createdAt?: number;
};

type ToolCall = {
  toolName?: string;
  toolCallId?: string;
  input?: unknown;
  durationMs?: number;
};

type ToolResult = {
  toolCallId?: string;
  output?: unknown;
  status?: string;
  durationMs?: number;
};

type RunArtifactArgs = {
  type: string;
  status: string;
  payload: unknown;
  toolCallId?: string;
  version?: number;
};

async function ensureMessageIdUnique(
  ctx: MutationCtx,
  chatId: Id<'chats'>,
  messageId?: string,
) {
  if (!messageId) return null;
  const existing = await ctx.db
    .query('messages')
    .withIndex('by_chat_messageId', (q) => q.eq('chatId', chatId).eq('messageId', messageId))
    .first();
  return existing;
}

async function upsertAssistantMessage(
  ctx: MutationCtx,
  chat: Doc<'chats'>,
  userId: string,
  chatId: Id<'chats'>,
  args: AssistantMessageArgs,
) {
  const now = Date.now();
  const createdAt = args.createdAt ?? now;

  const existing = await ensureMessageIdUnique(ctx, chatId, args.messageId);
  if (existing) {
    await ctx.db.patch(existing._id, {
      parts: args.parts,
      providerMetadata: args.providerMetadata,
      usage: args.usage,
      toolCalls: args.toolCalls,
      status: args.status ?? existing.status,
      updatedAt: now,
    });
    return { messageId: existing._id, createdAt, updatedAt: now };
  }

  const insertedId = await ctx.db.insert('messages', {
    chatId,
    userId,
    projectId: chat.projectId ?? undefined,
    messageId: args.messageId,
    role: 'assistant',
    parts: args.parts,
    providerMetadata: args.providerMetadata,
    usage: args.usage,
    toolCalls: args.toolCalls,
    status: args.status ?? 'complete',
    version: 1,
    createdAt,
    updatedAt: now,
  });

  return { messageId: insertedId, createdAt, updatedAt: now };
}

async function updateChatTimestamps(
  ctx: MutationCtx,
  chatId: Id<'chats'>,
  lastMessageAt: number,
) {
  const now = Date.now();
  await ctx.db.patch(chatId, {
    lastMessageAt,
    updatedAt: now,
  });
}

async function recordToolUsage(
  ctx: MutationCtx,
  chat: Doc<'chats'>,
  userId: string,
  toolCalls: unknown[] | undefined,
  toolResults: unknown[] | undefined,
) {
  if (!toolCalls || toolCalls.length === 0) {
    return;
  }

  const now = Date.now();
  const resultsById = new Map(
    (toolResults as ToolResult[] | undefined)?.map((result) => [result.toolCallId, result]) ?? [],
  );

  for (const rawCall of toolCalls as ToolCall[]) {
    const result = rawCall.toolCallId ? resultsById.get(rawCall.toolCallId) : undefined;
    await ctx.db.insert('toolUsage', {
      chatId: chat._id,
      userId,
      projectId: chat.projectId ?? undefined,
      toolName: rawCall.toolName ?? 'unknown',
      input: rawCall.input,
      output: result?.output ?? result,
      status: result ? (result.status ?? 'complete') : 'pending',
      durationMs: result?.durationMs ?? rawCall.durationMs,
      createdAt: now,
    });
  }
}

async function upsertRunArtifact(
  ctx: MutationCtx,
  chatId: Id<'chats'>,
  args: RunArtifactArgs,
) {
  const existing = await ctx.db
    .query('artifacts')
    .withIndex('by_chat_type', (q) => q.eq('chatId', chatId).eq('type', args.type))
    .first();

  const now = Date.now();
  if (existing) {
    await ctx.db.patch(existing._id, {
      payload: args.payload,
      status: args.status,
      version: args.version ?? (existing.version ?? 0) + 1,
      toolCallId: args.toolCallId ?? existing.toolCallId,
      updatedAt: now,
    });
    return existing._id;
  }

  const artifactId = await ctx.db.insert('artifacts', {
    chatId,
    type: args.type,
    payload: args.payload,
    status: args.status,
    version: args.version ?? 1,
    toolCallId: args.toolCallId,
    createdAt: now,
    updatedAt: now,
  });
  return artifactId;
}

export const complete = mutation({
  args: {
    chatId: v.id('chats'),
    assistantMessage: v.object({
      messageId: v.optional(v.string()),
      parts: v.array(v.any()),
      providerMetadata: v.optional(v.any()),
      usage: v.optional(v.any()),
      toolCalls: v.optional(v.array(v.any())),
      status: v.optional(v.string()),
      createdAt: v.optional(v.number()),
    }),
    toolCalls: v.optional(v.array(v.any())),
    toolResults: v.optional(v.array(v.any())),
    runArtifact: v.object({
      type: v.string(),
      status: v.string(),
      payload: v.any(),
      toolCallId: v.optional(v.string()),
      version: v.optional(v.number()),
    }),
    lastMessageAt: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const identity = await requireIdentity(ctx);
    const chat = await ensureChatAccess(ctx, args.chatId, identity.subject);

    const assistantResult = await upsertAssistantMessage(
      ctx,
      chat,
      identity.subject,
      args.chatId,
      args.assistantMessage,
    );

    const lastMessageAt = args.lastMessageAt ?? assistantResult.createdAt;
    await updateChatTimestamps(ctx, args.chatId, lastMessageAt);

    await recordToolUsage(ctx, chat, identity.subject, args.toolCalls, args.toolResults);

    await upsertRunArtifact(ctx, args.chatId, args.runArtifact);

    return {
      messageId: assistantResult.messageId,
      lastMessageAt,
    };
  },
});
