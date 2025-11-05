import { v } from 'convex/values';
import { internalMutation, query } from './_generated/server';
import { assertProjectAccess, requireIdentity } from './utils';

export const replaceDocumentChunks = internalMutation({
  args: {
    projectId: v.id('projects'),
    documentId: v.id('projectDocuments'),
    chunks: v.array(
      v.object({
        chunkId: v.string(),
        text: v.string(),
        embedding: v.array(v.number()),
        tokenCount: v.optional(v.number()),
      }),
    ),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query('projectChunks')
      .withIndex('by_document', (q) => q.eq('documentId', args.documentId))
      .collect();
    for (const chunk of existing) {
      await ctx.db.delete(chunk._id);
    }

    const now = Date.now();
    for (const chunk of args.chunks) {
      await ctx.db.insert('projectChunks', {
        projectId: args.projectId,
        documentId: args.documentId,
        chunkId: chunk.chunkId,
        text: chunk.text,
        embedding: chunk.embedding,
        tokenCount: chunk.tokenCount,
        createdAt: now,
      });
    }
  },
});

export const semanticSearch = query({
  args: {
    projectId: v.id('projects'),
    embedding: v.array(v.number()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const identity = await requireIdentity(ctx);
    await assertProjectAccess(ctx, args.projectId, identity.subject);

    const limit = args.limit ?? 8;
    const chunks = await ctx.db
      .query('projectChunks')
      .withIndex('by_project', (q) => q.eq('projectId', args.projectId))
      .take(2048);

    const scored = chunks
      .map((chunk) => ({
        chunk,
        score: cosineSimilarity(chunk.embedding, args.embedding),
      }))
      .filter((entry) => Number.isFinite(entry.score));

    return scored
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map((entry) => ({ ...entry.chunk, score: entry.score }));
  },
});

function cosineSimilarity(a: number[], b: number[]) {
  const length = Math.min(a.length, b.length);
  if (length === 0) return 0;

  let dot = 0;
  let magA = 0;
  let magB = 0;
  for (let i = 0; i < length; i += 1) {
    const valueA = a[i];
    const valueB = b[i];
    dot += valueA * valueB;
    magA += valueA * valueA;
    magB += valueB * valueB;
  }
  const denom = Math.sqrt(magA) * Math.sqrt(magB);
  return denom === 0 ? 0 : dot / denom;
}
