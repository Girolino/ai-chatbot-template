'use server';

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { createConvexClient, api } from '@/lib/convex/server';
import type { Id } from '@/convex/_generated/dataModel';
import { documentIngestionWorkflow } from '@/workflows/document-ingestion';

type RegisterDocumentRequest = {
  filename: string;
  mimeType: string;
  size: number;
  storageKey: string;
  checksum?: string;
};

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ projectId: string }> },
) {
  const { projectId } = await context.params;

  const authResult = await auth();
  if (!authResult.userId) {
    return new Response('Unauthorized', { status: 401 });
  }

  const body = (await request.json()) as RegisterDocumentRequest;

  if (!body?.filename || !body.storageKey) {
    return new Response('Invalid payload.', { status: 400 });
  }

  const convexProjectId = projectId as Id<'projects'>;
  const convexToken = await authResult.getToken({ template: 'convex' });
  const convex = createConvexClient(convexToken ?? undefined);

  const project = await convex.query(api.projects.get, { projectId: convexProjectId });
  if (!project) {
    return new Response('Project not found.', { status: 404 });
  }

  const documentId = await convex.mutation(api.documents.create, {
    projectId: convexProjectId,
    storageKey: body.storageKey,
    filename: body.filename,
    mimeType: body.mimeType,
    size: body.size,
    checksum: body.checksum,
  });

  // Trigger ingestion asynchronously – errors surface in Convex document status.
  documentIngestionWorkflow({
    documentId: documentId as unknown as string,
    projectId: convexProjectId as unknown as string,
    storageKey: body.storageKey,
    filename: body.filename,
    mimeType: body.mimeType,
  }).catch((error) => {
    console.error('[document-ingestion] failed', error);
  });

  return NextResponse.json({ documentId });
}
