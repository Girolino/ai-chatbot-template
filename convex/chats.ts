import { v } from 'convex/values';
import type { MutationCtx, QueryCtx } from './_generated/server';
import { mutation, query } from './_generated/server';
import type { Id } from './_generated/dataModel';
import { assertProjectAccess, requireIdentity } from './utils';

export const create = mutation({
  args: {
    projectId: v.optional(v.id('projects')),
    clientId: v.optional(v.string()),
    title: v.optional(v.string()),
    settings: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    const identity = await requireIdentity(ctx);
    if (args.projectId) {
      await assertProjectAccess(ctx, args.projectId, identity.subject);
    }

    if (args.clientId) {
      const existing = await ctx.db
        .query('chats')
        .withIndex('by_client', (q) => q.eq('clientId', args.clientId))
        .first();
      if (existing) {
        return existing._id;
      }
    }

    const now = Date.now();
    const chatId = await ctx.db.insert('chats', {
      userId: identity.subject,
      projectId: args.projectId ?? undefined,
      clientId: args.clientId,
      title: args.title,
      titleStatus: args.title ? 'provided' : 'pending',
      titleGeneratedAt: args.title ? now : undefined,
      lastMessageAt: now,
      settings: args.settings,
      createdAt: now,
      updatedAt: now,
    });

    return chatId;
  },
});

export const list = query({
  args: {
    projectId: v.optional(v.id('projects')),
  },
  handler: async (ctx, args) => {
    const identity = await requireIdentity(ctx);

    if (args.projectId) {
      await assertProjectAccess(ctx, args.projectId, identity.subject);
      return await ctx.db
        .query('chats')
        .withIndex('by_project_updatedAt', (q) => q.eq('projectId', args.projectId))
        .order('desc')
        .take(100);
    }

    return await ctx.db
      .query('chats')
      .withIndex('by_user_lastMessageAt', (q) => q.eq('userId', identity.subject))
      .order('desc')
      .take(100);
  },
});

export const rename = mutation({
  args: {
    chatId: v.id('chats'),
    title: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await requireIdentity(ctx);
    const chat = await ctx.db.get(args.chatId);
    if (!chat) {
      throw new Error('Chat not found');
    }
    if (chat.userId !== identity.subject) {
      throw new Error('Forbidden');
    }

    await ctx.db.patch(args.chatId, {
      title: args.title,
      titleStatus: 'manual',
      titleGeneratedAt: Date.now(),
      updatedAt: Date.now(),
    });
  },
});

export const setTitle = mutation({
  args: {
    chatId: v.id('chats'),
    title: v.string(),
    status: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await requireIdentity(ctx);
    const chat = await ctx.db.get(args.chatId);
    if (!chat) {
      throw new Error('Chat not found');
    }
    if (chat.userId !== identity.subject) {
      throw new Error('Forbidden');
    }

    await ctx.db.patch(args.chatId, {
      title: args.title,
      titleStatus: args.status,
      titleGeneratedAt: Date.now(),
      updatedAt: Date.now(),
    });
  },
});

export const setTitleStatus = mutation({
  args: {
    chatId: v.id('chats'),
    status: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await requireIdentity(ctx);
    const chat = await ctx.db.get(args.chatId);
    if (!chat) {
      throw new Error('Chat not found');
    }
    if (chat.userId !== identity.subject) {
      throw new Error('Forbidden');
    }

    await ctx.db.patch(args.chatId, {
      titleStatus: args.status,
      updatedAt: Date.now(),
    });
  },
});

export const touch = mutation({
  args: {
    chatId: v.id('chats'),
    lastMessageAt: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const identity = await requireIdentity(ctx);
    const chat = await ctx.db.get(args.chatId);
    if (!chat) {
      throw new Error('Chat not found');
    }
    if (chat.userId !== identity.subject) {
      throw new Error('Forbidden');
    }

    await ctx.db.patch(args.chatId, {
      lastMessageAt: args.lastMessageAt ?? Date.now(),
      updatedAt: Date.now(),
    });
  },
});

export const move = mutation({
  args: {
    chatId: v.id('chats'),
    projectId: v.optional(v.id('projects')),
  },
  handler: async (ctx, args) => {
    const identity = await requireIdentity(ctx);
    const chat = await ensureChatAccess(ctx, args.chatId, identity.subject);

    let projectId: Id<'projects'> | undefined = undefined;
    if (args.projectId) {
      await assertProjectAccess(ctx, args.projectId, identity.subject);
      projectId = args.projectId;
    }

    const updatedAt = Date.now();

    await ctx.db.patch(args.chatId, {
      projectId,
      updatedAt,
    });

    const messages = await ctx.db
      .query('messages')
      .withIndex('by_chat', (q) => q.eq('chatId', args.chatId))
      .collect();
    await Promise.all(
      messages.map((message) =>
        ctx.db.patch(message._id, {
          projectId: projectId ?? undefined,
          updatedAt,
        }),
      ),
    );

    const memoryFiles = await ctx.db
      .query('memoryFiles')
      .withIndex('by_chat', (q) => q.eq('chatId', args.chatId))
      .collect();
    await Promise.all(
      memoryFiles.map((file) =>
        ctx.db.patch(file._id, {
          projectId: projectId ?? undefined,
          updatedAt,
        }),
      ),
    );

    const memories = await ctx.db
      .query('memories')
      .withIndex('by_chat', (q) => q.eq('chatId', args.chatId))
      .collect();
    await Promise.all(
      memories.map((memory) =>
        ctx.db.patch(memory._id, {
          projectId: projectId ?? undefined,
          updatedAt,
        }),
      ),
    );

    const toolUsage = await ctx.db
      .query('toolUsage')
      .withIndex('by_chat_tool', (q) => q.eq('chatId', args.chatId))
      .collect();
    await Promise.all(
      toolUsage.map((usage) =>
        ctx.db.patch(usage._id, {
          projectId: projectId ?? undefined,
        }),
      ),
    );
  },
});

export const remove = mutation({
  args: {
    chatId: v.id('chats'),
  },
  handler: async (ctx, args) => {
    const identity = await requireIdentity(ctx);
    await ensureChatAccess(ctx, args.chatId, identity.subject);

    const messages = await ctx.db
      .query('messages')
      .withIndex('by_chat', (q) => q.eq('chatId', args.chatId))
      .collect();
    await Promise.all(messages.map((message) => ctx.db.delete(message._id)));

    const artifacts = await ctx.db
      .query('artifacts')
      .withIndex('by_chat', (q) => q.eq('chatId', args.chatId))
      .collect();
    await Promise.all(artifacts.map((artifact) => ctx.db.delete(artifact._id)));

    const memoryFiles = await ctx.db
      .query('memoryFiles')
      .withIndex('by_chat', (q) => q.eq('chatId', args.chatId))
      .collect();
    await Promise.all(memoryFiles.map((file) => ctx.db.delete(file._id)));

    const memories = await ctx.db
      .query('memories')
      .withIndex('by_chat', (q) => q.eq('chatId', args.chatId))
      .collect();
    await Promise.all(memories.map((memory) => ctx.db.delete(memory._id)));

    const toolUsage = await ctx.db
      .query('toolUsage')
      .withIndex('by_chat_tool', (q) => q.eq('chatId', args.chatId))
      .collect();
    await Promise.all(toolUsage.map((usage) => ctx.db.delete(usage._id)));

    await ctx.db.delete(args.chatId);
  },
});

export async function ensureChatAccess(
  ctx: MutationCtx | QueryCtx,
  chatId: Id<'chats'>,
  userId: string,
) {
  const chat = await ctx.db.get(chatId);
  if (!chat) {
    throw new Error('Chat not found');
  }
  if (chat.userId !== userId) {
    throw new Error('Forbidden');
  }
  return chat;
}

export const getByClientId = query({
  args: {
    clientId: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await requireIdentity(ctx);
    const chat = await ctx.db
      .query('chats')
      .withIndex('by_client', (q) => q.eq('clientId', args.clientId))
      .first();
    if (!chat) {
      return null;
    }
    if (chat.userId !== identity.subject) {
      throw new Error('Forbidden');
    }
    return chat;
  },
});

export const get = query({
  args: {
    chatId: v.id('chats'),
  },
  handler: async (ctx, args) => {
    const identity = await requireIdentity(ctx);
    const chat = await ctx.db.get(args.chatId);
    if (!chat) {
      return null;
    }
    if (chat.userId !== identity.subject) {
      throw new Error('Forbidden');
    }
    return chat;
  },
});
