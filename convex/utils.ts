import type { MutationCtx, QueryCtx } from './_generated/server';
import type { Id } from './_generated/dataModel';

export async function requireIdentity(ctx: MutationCtx | QueryCtx) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    throw new Error('Not authenticated');
  }
  return identity;
}

export async function assertProjectAccess(
  ctx: MutationCtx | QueryCtx,
  projectId: Id<'projects'>,
  userId: string,
) {
  const project = await ctx.db.get(projectId);
  if (!project) {
    throw new Error('Project not found');
  }
  if (project.ownerId !== userId && !project.memberIds.includes(userId)) {
    throw new Error('Forbidden');
  }
  return project;
}
