import { v } from 'convex/values';
import { mutation, query } from './_generated/server';
import { ensureChatAccess } from './chats';
import { requireIdentity } from './utils';

export const upsert = mutation({
  args: {
    chatId: v.id('chats'),
    type: v.string(),
    payload: v.any(),
    status: v.string(),
    toolCallId: v.optional(v.string()),
    version: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const identity = await requireIdentity(ctx);
    await ensureChatAccess(ctx, args.chatId, identity.subject);

    const existing = await ctx.db
      .query('artifacts')
      .withIndex('by_chat_type', (q) => q.eq('chatId', args.chatId).eq('type', args.type))
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
      chatId: args.chatId,
      type: args.type,
      payload: args.payload,
      status: args.status,
      version: args.version ?? 1,
      toolCallId: args.toolCallId,
      createdAt: now,
      updatedAt: now,
    });
    return artifactId;
  },
});

export const list = query({
  args: {
    chatId: v.id('chats'),
  },
  handler: async (ctx, args) => {
    const identity = await requireIdentity(ctx);
    await ensureChatAccess(ctx, args.chatId, identity.subject);

    return await ctx.db
      .query('artifacts')
      .withIndex('by_chat', (q) => q.eq('chatId', args.chatId))
      .collect();
  },
});
