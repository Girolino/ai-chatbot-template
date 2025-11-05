import { v } from 'convex/values';
import type { MutationCtx } from './_generated/server';
import { mutation, query } from './_generated/server';
import type { Id } from './_generated/dataModel';
import { ensureChatAccess } from './chats';
import { requireIdentity } from './utils';

const MESSAGE_PART = v.any();

async function ensureMessageIdUnique(
  ctx: MutationCtx,
  chatId: Id<'chats'>,
  messageId?: string,
) {
  if (!messageId) return null;
  const existing = await ctx.db
    .query('messages')
    .withIndex('by_chat_messageId', (q) =>
      q.eq('chatId', chatId).eq('messageId', messageId),
    )
    .first();
  return existing;
}

export const appendUserMessage = mutation({
  args: {
    chatId: v.id('chats'),
    messageId: v.optional(v.string()),
    parts: v.array(MESSAGE_PART),
    createdAt: v.optional(v.number()),
    metadata: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    const identity = await requireIdentity(ctx);
    const chat = await ensureChatAccess(ctx, args.chatId, identity.subject);

    const existing = await ensureMessageIdUnique(ctx, args.chatId, args.messageId ?? undefined);
    if (existing) {
      return existing._id;
    }

    const now = args.createdAt ?? Date.now();
    const messageId = await ctx.db.insert('messages', {
      chatId: args.chatId,
      userId: identity.subject,
      projectId: chat.projectId ?? undefined,
      messageId: args.messageId ?? undefined,
      role: 'user',
      parts: args.parts,
      providerMetadata: args.metadata,
      usage: undefined,
      toolCalls: undefined,
      status: 'complete',
      version: 1,
      createdAt: now,
      updatedAt: now,
    });

    await ctx.db.patch(args.chatId, {
      lastMessageAt: now,
      updatedAt: now,
    });

    return messageId;
  },
});

export const appendAssistantMessage = mutation({
  args: {
    chatId: v.id('chats'),
    messageId: v.optional(v.string()),
    parts: v.array(MESSAGE_PART),
    providerMetadata: v.optional(v.any()),
    usage: v.optional(v.any()),
    toolCalls: v.optional(v.array(v.any())),
    status: v.optional(v.string()),
    createdAt: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const identity = await requireIdentity(ctx);
    const chat = await ensureChatAccess(ctx, args.chatId, identity.subject);

    const existing = await ensureMessageIdUnique(ctx, args.chatId, args.messageId ?? undefined);
    if (existing) {
      await ctx.db.patch(existing._id, {
        parts: args.parts,
        providerMetadata: args.providerMetadata,
        usage: args.usage,
        toolCalls: args.toolCalls,
        status: args.status ?? existing.status,
        updatedAt: Date.now(),
      });
      return existing._id;
    }

    const now = args.createdAt ?? Date.now();
    const messageId = await ctx.db.insert('messages', {
      chatId: args.chatId,
      userId: identity.subject,
      projectId: chat.projectId ?? undefined,
      messageId: args.messageId ?? undefined,
      role: 'assistant',
      parts: args.parts,
      providerMetadata: args.providerMetadata,
      usage: args.usage,
      toolCalls: args.toolCalls,
      status: args.status ?? 'complete',
      version: 1,
      createdAt: now,
      updatedAt: now,
    });

    await ctx.db.patch(args.chatId, {
      lastMessageAt: now,
      updatedAt: now,
    });

    return messageId;
  },
});

export const list = query({
  args: {
    chatId: v.id('chats'),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const identity = await requireIdentity(ctx);
    await ensureChatAccess(ctx, args.chatId, identity.subject);

    const limit = args.limit ?? 200;
    const messages = await ctx.db
      .query('messages')
      .withIndex('by_chat_createdAt', (q) => q.eq('chatId', args.chatId))
      .order('asc')
      .take(limit);
    return messages;
  },
});
