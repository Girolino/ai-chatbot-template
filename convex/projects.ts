import { v } from 'convex/values';
import { mutation, query } from './_generated/server';
import type { MutationCtx, QueryCtx } from './_generated/server';
import type { Id } from './_generated/dataModel';
import { requireIdentity } from './utils';

export const create = mutation({
  args: {
    name: v.string(),
    description: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await requireIdentity(ctx);
    const now = Date.now();
    const projectId = await ctx.db.insert('projects', {
      name: args.name,
      description: args.description,
      ownerId: identity.subject,
      memberIds: [identity.subject],
      settings: undefined,
      createdAt: now,
      updatedAt: now,
    });
    return projectId;
  },
});

export const list = query({
  args: {},
  handler: async (ctx) => {
    const identity = await requireIdentity(ctx);
    const owned = await ctx.db
      .query('projects')
      .withIndex('by_owner', (q) => q.eq('ownerId', identity.subject))
      .order('desc')
      .collect();

    const recent = await ctx.db
      .query('projects')
      .withIndex('by_updatedAt', (q) => q)
      .take(200);
    const member = recent.filter((project) =>
      project.memberIds.includes(identity.subject) && project.ownerId !== identity.subject,
    );

    const combined = [...owned];
    const seen = new Set(combined.map((p) => p._id.toString()));
    for (const project of member) {
      if (!seen.has(project._id.toString())) {
        combined.push(project);
        seen.add(project._id.toString());
      }
    }
    return combined.sort((a, b) => b.updatedAt - a.updatedAt);
  },
});

export const get = query({
  args: { projectId: v.id('projects') },
  handler: async (ctx, args) => {
    const identity = await requireIdentity(ctx);
    const project = await ctx.db.get(args.projectId);
    if (!project) {
      throw new Error('Project not found');
    }
    if (project.ownerId !== identity.subject && !project.memberIds.includes(identity.subject)) {
      throw new Error('Forbidden');
    }
    return project;
  },
});

export const update = mutation({
  args: {
    projectId: v.id('projects'),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    settings: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    const identity = await requireIdentity(ctx);
    const project = await ctx.db.get(args.projectId);
    if (!project) {
      throw new Error('Project not found');
    }
    if (project.ownerId !== identity.subject) {
      throw new Error('Forbidden');
    }
    await ctx.db.patch(args.projectId, {
      name: args.name ?? project.name,
      description: args.description ?? project.description,
      settings: args.settings ?? project.settings,
      updatedAt: Date.now(),
    });
  },
});

export const inviteMember = mutation({
  args: {
    projectId: v.id('projects'),
    memberId: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await requireIdentity(ctx);
    const project = await ctx.db.get(args.projectId);
    if (!project) throw new Error('Project not found');
    if (project.ownerId !== identity.subject) throw new Error('Forbidden');
    if (!project.memberIds.includes(args.memberId)) {
      await ctx.db.patch(args.projectId, {
        memberIds: [...project.memberIds, args.memberId],
        updatedAt: Date.now(),
      });
    }
  },
});

export const removeMember = mutation({
  args: {
    projectId: v.id('projects'),
    memberId: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await requireIdentity(ctx);
    const project = await ctx.db.get(args.projectId);
    if (!project) throw new Error('Project not found');
    if (project.ownerId !== identity.subject) throw new Error('Forbidden');
    if (args.memberId === identity.subject) {
      throw new Error('Owner cannot remove themselves');
    }
    if (project.memberIds.includes(args.memberId)) {
      await ctx.db.patch(args.projectId, {
        memberIds: project.memberIds.filter((id) => id !== args.memberId),
        updatedAt: Date.now(),
      });
    }
  },
});

export function ensureProject(ctx: MutationCtx | QueryCtx, projectId: Id<'projects'>) {
  return ctx.db.get(projectId);
}
