import { v } from 'convex/values';
import { mutation } from './_generated/server';
import { ensureChatAccess } from './chats';
import { requireIdentity } from './utils';

export const record = mutation({
  args: {
    chatId: v.id('chats'),
    toolName: v.string(),
    input: v.optional(v.any()),
    output: v.optional(v.any()),
    status: v.string(),
    durationMs: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const identity = await requireIdentity(ctx);
    const chat = await ensureChatAccess(ctx, args.chatId, identity.subject);

    await ctx.db.insert('toolUsage', {
      chatId: args.chatId,
      userId: identity.subject,
      projectId: chat.projectId ?? undefined,
      toolName: args.toolName,
      input: args.input,
      output: args.output,
      status: args.status,
      durationMs: args.durationMs,
      createdAt: Date.now(),
    });
  },
});
