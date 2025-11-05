import { v } from 'convex/values';
import { mutation, query } from './_generated/server';
import { ensureChatAccess } from './chats';
import { assertProjectAccess, requireIdentity } from './utils';

export const getWorkingMemory = query({
  args: {
    scope: v.string(),
    chatId: v.optional(v.id('chats')),
    projectId: v.optional(v.id('projects')),
  },
  handler: async (ctx, args) => {
    const identity = await requireIdentity(ctx);
    if (args.scope === 'chat') {
      if (!args.chatId) throw new Error('chatId required for chat scope');
      await ensureChatAccess(ctx, args.chatId, identity.subject);
      const record = await ctx.db
        .query('memories')
        .withIndex('by_chat', (q) => q.eq('chatId', args.chatId))
        .first();
      return record
        ? {
            content: record.data,
            updatedAt: record.updatedAt,
          }
        : null;
    }

    if (args.projectId) {
      const projectId = args.projectId;
      await assertProjectAccess(ctx, projectId, identity.subject);
      const projectMemory = await ctx.db
        .query('projectMemory')
        .withIndex('by_project_kind', (q) => q.eq('projectId', projectId).eq('kind', 'working'))
        .first();
      return projectMemory
        ? {
            content:
              typeof projectMemory.content === 'string'
                ? projectMemory.content
                : JSON.stringify(projectMemory.content),
            updatedAt: projectMemory.updatedAt,
          }
        : null;
    }

    const record = await ctx.db
      .query('memories')
      .withIndex('by_user_scope', (q) =>
        q.eq('userId', identity.subject).eq('scope', 'user'),
      )
      .first();
    return record
      ? {
          content: record.data,
          updatedAt: record.updatedAt,
        }
      : null;
  },
});

export const updateWorkingMemory = mutation({
  args: {
    scope: v.string(),
    content: v.string(),
    chatId: v.optional(v.id('chats')),
    projectId: v.optional(v.id('projects')),
  },
  handler: async (ctx, args) => {
    const identity = await requireIdentity(ctx);
    const now = Date.now();

    if (args.scope === 'chat') {
      if (!args.chatId) throw new Error('chatId required for chat scope');
      await ensureChatAccess(ctx, args.chatId, identity.subject);
      const existing = await ctx.db
        .query('memories')
        .withIndex('by_chat', (q) => q.eq('chatId', args.chatId))
        .first();
      if (existing) {
        await ctx.db.patch(existing._id, {
          data: args.content,
          chatId: args.chatId,
          updatedAt: now,
        });
      } else {
        await ctx.db.insert('memories', {
          userId: identity.subject,
          scope: 'chat',
          projectId: undefined,
          chatId: args.chatId,
          data: args.content,
          updatedAt: now,
        });
      }
      return;
    }

    if (args.projectId) {
      await assertProjectAccess(ctx, args.projectId, identity.subject);
      const existing = await ctx.db
        .query('projectMemory')
        .withIndex('by_project_kind', (q) => q.eq('projectId', args.projectId!).eq('kind', 'working'))
        .first();
      if (existing) {
        await ctx.db.patch(existing._id, {
          content: args.content,
          createdBy: identity.subject,
          updatedAt: now,
        });
      } else {
        await ctx.db.insert('projectMemory', {
          projectId: args.projectId,
          kind: 'working',
          content: args.content,
          createdBy: identity.subject,
          createdAt: now,
          updatedAt: now,
        });
      }
      return;
    }

    const existing = await ctx.db
      .query('memories')
      .withIndex('by_user_scope', (q) =>
        q.eq('userId', identity.subject).eq('scope', 'user'),
      )
      .first();
    if (existing) {
      await ctx.db.patch(existing._id, {
        data: args.content,
        updatedAt: now,
      });
    } else {
      await ctx.db.insert('memories', {
        userId: identity.subject,
        scope: 'user',
        projectId: undefined,
        data: args.content,
        updatedAt: now,
      });
    }
  },
});

export const saveProjectMemoryEntry = mutation({
  args: {
    projectId: v.id('projects'),
    kind: v.string(),
    content: v.any(),
  },
  handler: async (ctx, args) => {
    const identity = await requireIdentity(ctx);
    await assertProjectAccess(ctx, args.projectId, identity.subject);
    const now = Date.now();
    await ctx.db.insert('projectMemory', {
      projectId: args.projectId,
      kind: args.kind,
      content: args.content,
      createdBy: identity.subject,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const listProjectMemory = query({
  args: {
    projectId: v.id('projects'),
    kind: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await requireIdentity(ctx);
    await assertProjectAccess(ctx, args.projectId, identity.subject);

    let queryBuilder = ctx.db
      .query('projectMemory')
      .withIndex('by_project_updatedAt', (q) => q.eq('projectId', args.projectId))
      .order('desc');
    if (args.kind) {
      queryBuilder = queryBuilder.filter((q) => q.eq(q.field('kind'), args.kind));
    }
    return await queryBuilder.take(100);
  },
});

export const writeMemoryFile = mutation({
  args: {
    chatId: v.id('chats'),
    path: v.string(),
    content: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await requireIdentity(ctx);
    const chat = await ensureChatAccess(ctx, args.chatId, identity.subject);

    const existing = await ctx.db
      .query('memoryFiles')
      .withIndex('by_chat_path', (q) => q.eq('chatId', args.chatId).eq('path', args.path))
      .first();

    const now = Date.now();
    if (existing) {
      await ctx.db.patch(existing._id, {
        content: args.content,
        updatedAt: now,
      });
    } else {
      await ctx.db.insert('memoryFiles', {
        chatId: args.chatId,
        projectId: chat.projectId ?? undefined,
        path: args.path,
        content: args.content,
        createdAt: now,
        updatedAt: now,
      });
    }
  },
});

export const readMemoryFile = query({
  args: {
    chatId: v.id('chats'),
    path: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await requireIdentity(ctx);
    await ensureChatAccess(ctx, args.chatId, identity.subject);

    const file = await ctx.db
      .query('memoryFiles')
      .withIndex('by_chat_path', (q) => q.eq('chatId', args.chatId).eq('path', args.path))
      .first();

    return file ?? null;
  },
});

export const deleteMemoryFile = mutation({
  args: {
    chatId: v.id('chats'),
    path: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await requireIdentity(ctx);
    await ensureChatAccess(ctx, args.chatId, identity.subject);

    const existing = await ctx.db
      .query('memoryFiles')
      .withIndex('by_chat_path', (q) => q.eq('chatId', args.chatId).eq('path', args.path))
      .first();
    if (existing) {
      await ctx.db.delete(existing._id);
    }
  },
});

export const renameMemoryFile = mutation({
  args: {
    chatId: v.id('chats'),
    oldPath: v.string(),
    newPath: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await requireIdentity(ctx);
    const chat = await ensureChatAccess(ctx, args.chatId, identity.subject);

    const existing = await ctx.db
      .query('memoryFiles')
      .withIndex('by_chat_path', (q) => q.eq('chatId', args.chatId).eq('path', args.oldPath))
      .first();
    if (!existing) {
      throw new Error('Memory file not found');
    }

    const conflicting = await ctx.db
      .query('memoryFiles')
      .withIndex('by_chat_path', (q) => q.eq('chatId', args.chatId).eq('path', args.newPath))
      .first();
    if (conflicting && conflicting._id !== existing._id) {
      throw new Error('Destination path already exists');
    }

    await ctx.db.patch(existing._id, {
      path: args.newPath,
      projectId: chat.projectId ?? undefined,
      updatedAt: Date.now(),
    });
  },
});

export const listMemoryFiles = query({
  args: {
    chatId: v.id('chats'),
  },
  handler: async (ctx, args) => {
    const identity = await requireIdentity(ctx);
    await ensureChatAccess(ctx, args.chatId, identity.subject);

    return await ctx.db
      .query('memoryFiles')
      .withIndex('by_chat', (q) => q.eq('chatId', args.chatId))
      .order('desc')
      .take(200);
  },
});
