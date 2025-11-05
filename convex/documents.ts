import { v } from 'convex/values';
import { internalMutation, internalQuery, mutation, query } from './_generated/server';
import { assertProjectAccess, requireIdentity } from './utils';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export const create = mutation({
  args: {
    projectId: v.id('projects'),
    storageKey: v.string(),
    filename: v.string(),
    mimeType: v.string(),
    size: v.number(),
    checksum: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await requireIdentity(ctx);
    await assertProjectAccess(ctx, args.projectId, identity.subject);

    if (args.size > MAX_FILE_SIZE) {
      throw new Error('File too large');
    }

    const now = Date.now();
    const documentId = await ctx.db.insert('projectDocuments', {
      projectId: args.projectId,
      userId: identity.subject,
      storageKey: args.storageKey,
      filename: args.filename,
      mimeType: args.mimeType,
      size: args.size,
      checksum: args.checksum,
      status: 'pending',
      error: undefined,
      processingStartedAt: undefined,
      processedAt: undefined,
      createdAt: now,
      updatedAt: now,
    });

    return documentId;
  },
});

export const list = query({
  args: { projectId: v.id('projects') },
  handler: async (ctx, args) => {
    const identity = await requireIdentity(ctx);
    await assertProjectAccess(ctx, args.projectId, identity.subject);

    return await ctx.db
      .query('projectDocuments')
      .withIndex('by_project', (q) => q.eq('projectId', args.projectId))
      .order('desc')
      .take(200);
  },
});

export const internalUpdateStatus = internalMutation({
  args: {
    documentId: v.id('projectDocuments'),
    status: v.string(),
    error: v.optional(v.string()),
    processingStartedAt: v.optional(v.number()),
    processedAt: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const doc = await ctx.db.get(args.documentId);
    if (!doc) {
      throw new Error('Document not found');
    }
    await ctx.db.patch(args.documentId, {
      status: args.status,
      error: args.error,
      processingStartedAt: args.processingStartedAt ?? doc.processingStartedAt,
      processedAt: args.processedAt ?? doc.processedAt,
      updatedAt: Date.now(),
    });
  },
});

export const internalGet = internalQuery({
  args: { documentId: v.id('projectDocuments') },
  handler: async (ctx, args) => {
    const doc = await ctx.db.get(args.documentId);
    if (!doc) {
      throw new Error('Document not found');
    }
    return doc;
  },
});
